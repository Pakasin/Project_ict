"""
CyberShield — Manual Predict API (Test Page)

POST /api/predict — ส่ง payload ตรงไปที่ model โดยไม่ผ่าน sensor
ใช้สำหรับ demo เมื่อไม่มี live attack traffic
และสำหรับ model debugging ตอน development

รองรับ 3 models:
  - intrusion: รับ 41 features → Intrusion Model (NSL-KDD)
  - flow: รับ 78 raw features → Flow Model (CSE-CIC-IDS2018, scale→slice เหลือ 71 ในเซิร์ฟเวอร์)
  - sqli: รับ raw text → Injection Model (char-level)

GET /api/model-info — metadata ของทั้ง 3 โมเดล (class labels, feature names,
input shapes) ใช้โดย Test page (ชื่อ feature) และ Analytics (telemetry)
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from backend.inference import (
    predict_intrusion,
    predict_flow,
    predict_sqli,
    predict_intrusion_window,
    predict_flow_window,
)

router = APIRouter(prefix="/api", tags=["predict"])

TEST_SAMPLES_DIR = Path(__file__).parent.parent / "models"
TEST_SAMPLES_FILES = {
    "flow": "flow_test_samples.json",
    "intrusion": "intrusion_test_samples.json",
    "sqli": "sqli_test_samples.json",
}


class PredictRequest(BaseModel):
    """Request body สำหรับ manual prediction"""
    model_name: str            # "intrusion" | "flow" | "sqli"
    features: list[float] | None = None   # สำหรับ intrusion / flow — single flow, zero-padded to a window server-side
    window: list[list[float]] | None = None  # สำหรับ intrusion / flow — real 10-row window (no padding), takes priority over `features`
    payload: str | None = None            # สำหรับ sqli (raw query text)


class PredictResult(BaseModel):
    model_name: str
    predicted_class: str
    confidence: float
    all_probabilities: dict[str, float] | None = None
    caveat: str | None = None


class PredictResponse(BaseModel):
    ok: bool
    result: PredictResult | None = None
    error: str | None = None


# Single-flow requests zero-pad 9 of the 10 window rows. Training data never
# included padded windows (incomplete windows were dropped), so this is a
# best-effort approximation — surfaced to the UI instead of hidden.
WINDOW_CAVEAT = (
    "Single-sample request — window zero-padded to 10 rows. "
    "Model was never trained on padded windows, so treat this result as approximate."
)


@router.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest, request: Request):
    """Manual prediction — ส่ง features/payload ตรงไป model"""

    try:
        if body.model_name == "intrusion":
            return await _predict_intrusion(body, request)
        elif body.model_name == "flow":
            return await _predict_flow(body, request)
        elif body.model_name == "sqli":
            return await _predict_sqli(body, request)
        else:
            return PredictResponse(
                ok=False, error=f"Unknown model: {body.model_name}"
            )
    except Exception as e:
        return PredictResponse(ok=False, error=str(e))


async def _predict_intrusion(body: PredictRequest, request: Request) -> PredictResponse:
    """Intrusion Model (NSL-KDD) — 41 features → 3-class softmax

    `window` (10 real rows, no padding) is far more reliable than `features`
    (single row zero-padded server-side) — the model was never trained on
    padded windows. Prefer `window` whenever real chronological data exists.
    """
    model = request.app.state.model_intrusion
    scaler = request.app.state.scaler_intrusion

    if body.window:
        if len(body.window) != 10 or any(len(row) != 41 for row in body.window):
            raise HTTPException(status_code=400, detail="Intrusion window must be 10 rows of 41 features each")
        predicted_class, confidence, all_probs = predict_intrusion_window(model, scaler, body.window)
        caveat = None
    else:
        if not body.features or len(body.features) != 41:
            raise HTTPException(status_code=400, detail="Intrusion Model requires exactly 41 features")
        predicted_class, confidence, all_probs = predict_intrusion(model, scaler, body.features)
        caveat = WINDOW_CAVEAT

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="intrusion",
            predicted_class=predicted_class,
            confidence=confidence,
            all_probabilities=all_probs,
            caveat=caveat,
        ),
    )


async def _predict_flow(body: PredictRequest, request: Request) -> PredictResponse:
    """Flow Model (CSE-CIC-IDS2018) — 78 raw features → scale → slice 71 → 4-class softmax

    `window` (10 real rows, no padding) is far more reliable than `features`
    (single row zero-padded server-side) — verified against held-out test-set
    samples: single-flow zero-padded requests misclassify DoS/DDoS as BENIGN,
    the full real window classifies all 4 classes correctly. Prefer `window`.
    """
    model = request.app.state.model_flow
    scaler = request.app.state.scaler_flow
    flow_keep_idx = request.app.state.flow_keep_idx
    flow_classes = request.app.state.flow_classes

    if body.window:
        if len(body.window) != 10 or any(len(row) != 78 for row in body.window):
            raise HTTPException(status_code=400, detail="Flow window must be 10 rows of 78 raw features each")
        predicted_class, confidence, all_probs = predict_flow_window(
            model, scaler, flow_keep_idx, flow_classes, body.window
        )
        caveat = None
    else:
        if not body.features or len(body.features) != 78:
            raise HTTPException(status_code=400, detail="Flow Model requires exactly 78 raw features")
        predicted_class, confidence, all_probs = predict_flow(
            model, scaler, flow_keep_idx, flow_classes, body.features
        )
        caveat = WINDOW_CAVEAT

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="flow",
            predicted_class=predicted_class,
            confidence=confidence,
            all_probabilities=all_probs,
            caveat=caveat,
        ),
    )


async def _predict_sqli(body: PredictRequest, request: Request) -> PredictResponse:
    """Injection Model (SQLi) — char-level Embedding → LSTM → sigmoid"""
    if not body.payload:
        raise HTTPException(status_code=400, detail="SQLi Model requires a payload (raw query text)")

    model = request.app.state.model_sqli
    if model is None:
        return PredictResponse(ok=False, error="SQLi model failed to load — check server startup logs")

    word_index = request.app.state.sqli_word_index
    threshold = float(os.getenv("THRESHOLD_SQLI", "0.75"))

    predicted_class, confidence, all_probs = predict_sqli(model, word_index, threshold, body.payload)

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="sqli",
            predicted_class=predicted_class,
            confidence=confidence,
            all_probabilities=all_probs,
        ),
    )


@router.get("/test-samples/{model_name}")
async def test_samples(model_name: str):
    """Real, unfiltered held-out test-set samples per model — includes both
    correct AND incorrect predictions in their real proportion (see
    sample_pool_accuracy), not cherry-picked. Used by the Test page's
    "randomize scenario" feature so users see genuine model behavior instead
    of hand-typed numbers or guaranteed-correct demos.

    predicted_class/confidence here come from the real evaluation pipeline
    (proper windowed serving for flow/intrusion) — NOT from POST /api/predict,
    whose single-row endpoint zero-pads and is known to bias flow/intrusion
    results toward the majority class (see CLAUDE.md Known Limitations). The
    Test page reveals these pre-computed values for flow/intrusion instead of
    re-predicting, to avoid misrepresenting real model accuracy.
    """
    filename = TEST_SAMPLES_FILES.get(model_name)
    if not filename:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_name}")
    path = TEST_SAMPLES_DIR / filename
    if not path.exists():
        return {"ok": False, "error": f"{filename} not found", "classes": {}}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {"ok": True, **data}


@router.get("/model-info")
async def model_info(request: Request):
    """Metadata ของทั้ง 3 โมเดล — class labels, feature names, input shapes, สถานะโหลด"""
    return {
        "ok": True,
        "intrusion": {
            "loaded": request.app.state.model_intrusion is not None,
            "input_shape": request.app.state.model_metadata["intrusion_model"],
            "class_labels": ["Normal", "R2L", "U2R"],
        },
        "flow": {
            "loaded": request.app.state.model_flow is not None,
            "input_shape": request.app.state.model_metadata["flow_model"],
            "class_labels": request.app.state.flow_classes,
            "raw_feature_names": request.app.state.flow_raw_cols,
            "trained_feature_names": request.app.state.flow_trained_cols,
        },
        "sqli": {
            "loaded": request.app.state.model_sqli is not None,
            "metadata": request.app.state.sqli_metadata,
        },
    }
