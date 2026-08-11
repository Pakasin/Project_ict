"""
CyberShield — Shared Inference Logic

ใช้ร่วมกันระหว่าง /api/predict (manual test) และ sensors (live traffic)
เพื่อไม่ให้ scale/slice/encode logic แยกร่างและเพี้ยนไปคนละทาง

Flow Model: scale ด้วย 78-column scaler ก่อนเสมอ แล้วค่อย slice เหลือ 71 ตาม
trained_feature_cols.json — สลับลำดับไม่ได้ ไม่งั้นค่าตกคอลัมน์ผิดโดยไม่มี error
(ดู CLAUDE.md: "Flow Model Feature counts differ on purpose")

SQLi Model: tokenizer เก็บเป็น sqli_tokenizer.json (word_index แบบ char-level
ล้วน ๆ ไม่ใช่ Keras Tokenizer object) → encode เองทีละตัวอักษร
"""

import json
from pathlib import Path

import numpy as np

MODELS_DIR = Path(__file__).parent / "models"

INTRUSION_CLASSES = ["Normal", "R2L", "U2R"]
SQLI_CLASSES = ["Normal", "SQLi"]
SQLI_OOV_INDEX = 1
SQLI_MAX_LEN = 221


def load_model_artifacts() -> dict:
    """โหลด metadata files ที่ไม่ใช่ model/scaler เอง — เรียกครั้งเดียวตอน startup"""
    with open(MODELS_DIR / "model_metadata.json", encoding="utf-8") as f:
        model_metadata = json.load(f)
    with open(MODELS_DIR / "sqli_model_metadata.json", encoding="utf-8") as f:
        sqli_metadata = json.load(f)
    with open(MODELS_DIR / "feature_cols.json", encoding="utf-8") as f:
        raw_cols = json.load(f)
    with open(MODELS_DIR / "trained_feature_cols.json", encoding="utf-8") as f:
        trained_cols = json.load(f)
    with open(MODELS_DIR / "sqli_tokenizer.json", encoding="utf-8") as f:
        sqli_word_index = json.load(f)

    flow_keep_idx = [raw_cols.index(c) for c in trained_cols]
    flow_classes = model_metadata["flow_model"]["class_labels"]

    return {
        "model_metadata": model_metadata,
        "sqli_metadata": sqli_metadata,
        "raw_cols": raw_cols,
        "trained_cols": trained_cols,
        "flow_keep_idx": flow_keep_idx,
        "flow_classes": flow_classes,
        "sqli_word_index": sqli_word_index,
    }


def predict_intrusion_window(model, scaler, window_rows: list[list[float]]) -> tuple[str, float, dict[str, float]]:
    """Intrusion Model — full 10-row chronological window (no padding) → 3-class softmax

    Used by the live sensor once it has accumulated WINDOW_SIZE real flows.
    """
    rows = np.array(window_rows)  # (10, 41)
    scaled = scaler.transform(rows).reshape(1, rows.shape[0], rows.shape[1])

    probs = model.predict(scaled, verbose=0)[0]
    idx = int(np.argmax(probs))
    return (
        INTRUSION_CLASSES[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(INTRUSION_CLASSES, probs)},
    )


def predict_flow_window(model, scaler, flow_keep_idx: list[int], flow_classes: list[str], window_rows: list[list[float]]) -> tuple[str, float, dict[str, float]]:
    """Flow Model — full 10-row chronological window of 78 raw features each,
    scale→slice per row, → 4-class softmax. Used by the live sensor."""
    rows = np.array(window_rows)  # (10, 78)
    scaled = scaler.transform(rows)  # (10, 78)
    sliced = scaled[:, flow_keep_idx]  # (10, 71)
    window = sliced.reshape(1, sliced.shape[0], sliced.shape[1])

    probs = model.predict(window, verbose=0)[0]
    idx = int(np.argmax(probs))
    return (
        flow_classes[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(flow_classes, probs)},
    )


def predict_intrusion(model, scaler, features: list[float]) -> tuple[str, float, dict[str, float]]:
    """Intrusion Model (NSL-KDD) — 41 features → 3-class softmax

    Single-flow request zero-pads 9 rows in front — model never saw padding
    at train time (incomplete windows were dropped), so this is a best-effort
    approximation, not a guaranteed-accurate serving path. See caveat surfaced
    to the caller.
    """
    scaled = scaler.transform(np.array(features).reshape(1, -1))
    window = np.zeros((1, 10, 41))
    window[0, 9, :] = scaled[0]

    probs = model.predict(window, verbose=0)[0]
    idx = int(np.argmax(probs))
    return (
        INTRUSION_CLASSES[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(INTRUSION_CLASSES, probs)},
    )


def predict_flow(model, scaler, flow_keep_idx: list[int], flow_classes: list[str], features: list[float]) -> tuple[str, float, dict[str, float]]:
    """Flow Model (CSE-CIC-IDS2018) — 78 raw features → scale → slice to 71 → 4-class softmax"""
    scaled = scaler.transform(np.array(features).reshape(1, -1))  # (1, 78)
    sliced = scaled[:, flow_keep_idx]  # (1, 71) — must slice AFTER scaling

    window = np.zeros((1, 10, len(flow_keep_idx)))
    window[0, 9, :] = sliced[0]

    probs = model.predict(window, verbose=0)[0]
    idx = int(np.argmax(probs))
    return (
        flow_classes[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(flow_classes, probs)},
    )


def encode_sqli_text(word_index: dict, text: str, maxlen: int = SQLI_MAX_LEN) -> np.ndarray:
    """Char-level encode + pre-pad/truncate เหมือน keras pad_sequences default"""
    seq = [word_index.get(ch, SQLI_OOV_INDEX) for ch in text]
    if len(seq) >= maxlen:
        seq = seq[-maxlen:]
    else:
        seq = [0] * (maxlen - len(seq)) + seq
    return np.array([seq])


def predict_sqli(model, word_index: dict, threshold: float, text: str) -> tuple[str, float, dict[str, float]]:
    """Injection Model (SQLi) — char-level Embedding+LSTM → sigmoid"""
    seq = encode_sqli_text(word_index, text)
    confidence = float(model.predict(seq, verbose=0)[0][0])
    predicted_class = "SQLi" if confidence >= threshold else "Normal"
    return (
        predicted_class,
        confidence,
        {"Normal": 1.0 - confidence, "SQLi": confidence},
    )
