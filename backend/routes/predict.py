"""
CyberShield — Manual Predict API (Test Page)

POST /api/predict — ส่ง payload ตรงไปที่ model โดยไม่ผ่าน sensor
ใช้สำหรับ demo เมื่อไม่มี live attack traffic
และสำหรับ model debugging ตอน development

รองรับ 3 models:
  - intrusion: รับ 49 features → Intrusion Model (UNSW-NB15)
  - flow: รับ 78 features → Flow Model (CSE-CIC-IDS2018)
  - sqli: รับ raw text → Injection Model
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import numpy as np

router = APIRouter(prefix="/api", tags=["predict"])

# UNSW-NB15 class labels
INTRUSION_CLASSES = ["Normal", "R2L", "U2R"]

# CSE-CIC-IDS2018 class labels
FLOW_CLASSES = ["BENIGN", "DoS", "DDoS", "PortScan", "BruteForce"]


class PredictRequest(BaseModel):
    """Request body สำหรับ manual prediction"""
    model_name: str            # "intrusion" | "flow" | "sqli"
    features: list[float] | None = None   # สำหรับ intrusion / flow
    payload: str | None = None            # สำหรับ sqli (raw query text)


class PredictResult(BaseModel):
    model_name: str
    predicted_class: str
    confidence: float
    all_probabilities: dict[str, float] | None = None


class PredictResponse(BaseModel):
    ok: bool
    result: PredictResult | None = None
    error: str | None = None


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
    """Intrusion Model (UNSW-NB15) — 49 features → 3-class softmax"""
    if not body.features or len(body.features) != 41:
        raise HTTPException(status_code=400, detail="Intrusion Model requires exactly 49 features")

    model = request.app.state.model_intrusion
    scaler = request.app.state.scaler_intrusion

    # Scale features แล้วสร้าง sliding window (single flow → zero-pad 9 + 1)
    features = np.array(body.features).reshape(1, -1)
    scaled = scaler.transform(features)

    # สร้าง padded window: 9 rows zero + 1 row scaled
    padded = np.zeros((1, 10, 41))
    padded[0, 9, :] = scaled[0]

    probs = model.predict(padded, verbose=0)[0]
    pred_idx = int(np.argmax(probs))

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="intrusion",
            predicted_class=INTRUSION_CLASSES[pred_idx],
            confidence=float(probs[pred_idx]),
            all_probabilities={
                cls: float(p) for cls, p in zip(INTRUSION_CLASSES, probs)
            },
        ),
    )


async def _predict_flow(body: PredictRequest, request: Request) -> PredictResponse:
    """Flow Model (CSE-CIC-IDS2018) — 78 features → 5-class softmax"""
    if not body.features or len(body.features) != 78:
        raise HTTPException(status_code=400, detail="Flow Model requires exactly 78 features")

    model = request.app.state.model_flow
    scaler = request.app.state.scaler_flow

    features = np.array(body.features).reshape(1, -1)
    scaled = scaler.transform(features)

    padded = np.zeros((1, 10, 78))
    padded[0, 9, :] = scaled[0]

    probs = model.predict(padded, verbose=0)[0]
    pred_idx = int(np.argmax(probs))

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="flow",
            predicted_class=FLOW_CLASSES[pred_idx],
            confidence=float(probs[pred_idx]),
            all_probabilities={
                cls: float(p) for cls, p in zip(FLOW_CLASSES, probs)
            },
        ),
    )


async def _predict_sqli(body: PredictRequest, request: Request) -> PredictResponse:
    """Injection Model (SQLi) — raw text → Embedding → LSTM → sigmoid"""
    from tensorflow.keras.preprocessing.sequence import pad_sequences

    if not body.payload:
        raise HTTPException(status_code=400, detail="SQLi Model requires a payload (raw query text)")

    model = request.app.state.model_sqli
    tokenizer = request.app.state.tokenizer_sqli

    # Tokenize + pad (maxlen=200 ตาม training)
    seq = pad_sequences(
        tokenizer.texts_to_sequences([body.payload]),
        maxlen=200,
    )

    confidence = float(model.predict(seq, verbose=0)[0][0])
    predicted_class = "SQL Injection" if confidence >= 0.5 else "Normal"

    return PredictResponse(
        ok=True,
        result=PredictResult(
            model_name="sqli",
            predicted_class=predicted_class,
            confidence=confidence,
            all_probabilities={
                "Normal": 1.0 - confidence,
                "SQL Injection": confidence,
            },
        ),
    )
