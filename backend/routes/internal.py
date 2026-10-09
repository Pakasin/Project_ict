"""
CyberShield — Internal Event Endpoint (Sensor IPC)

POST /internal/event — รับ Prediction Events จาก sensor processes
ป้องกันด้วย X-Internal-Token header (shared secret)
nginx block endpoint นี้จากภายนอก (deny all)
Sensors (nfstream, mitmproxy) ที่รัน root เข้าถึงผ่าน localhost เท่านั้น
"""

import asyncio

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
import os

from datetime import datetime

from backend.db import save_prediction_event, touch_sensor, get_setting
from backend.notify import notify_alert
from backend.routes.ws import broadcast

router = APIRouter(tags=["internal"])


class PredictionEvent(BaseModel):
    """Prediction Event — ผลลัพธ์จากการตรวจจับของ model"""
    model_name: str       # "intrusion" | "flow" | "flow_rules" | "sqli" | "sqli_rules"
    attack_class: str     # "R2L" | "U2R" | "DDoS" | "Normal" | etc.
    confidence: float     # ค่าความมั่นใจ 0.0 - 1.0
    source_ip: str        # IP ต้นทาง
    timestamp: str        # ISO format timestamp
    # optional — sensor รุ่นเก่าไม่ส่ง
    dst_ip: str | None = None
    dst_port: int | None = None
    protocol: str | None = None
    bytes: int | None = None
    sensor: str | None = None   # ชื่อ sensor เช่น "network" | "http" | "lite"


class EventResponse(BaseModel):
    ok: bool
    event_id: int | None = None


# ดึง threshold จาก .env สำหรับแต่ละ model
THRESHOLDS = {
    "intrusion": float(os.getenv("THRESHOLD_INTRUSION", "0.85")),
    "flow": float(os.getenv("THRESHOLD_FLOW", "0.80")),
    "sqli": float(os.getenv("THRESHOLD_SQLI", "0.75")),
}


def get_threshold(model_name: str) -> float:
    """threshold ปัจจุบัน: ค่าที่ตั้งผ่าน UI (app_settings) มาก่อน ไม่งั้นใช้ .env"""
    raw = get_setting(f"threshold_{model_name}")
    if raw is not None:
        try:
            return float(raw)
        except ValueError:
            pass
    return THRESHOLDS.get(model_name, 0.80)


class Heartbeat(BaseModel):
    sensor: str
    info: str | None = None


def _check_token(x_internal_token: str | None) -> None:
    if x_internal_token != os.getenv("INTERNAL_TOKEN", ""):
        raise HTTPException(status_code=403, detail="Invalid internal token")


@router.post("/internal/heartbeat")
async def receive_heartbeat(hb: Heartbeat, x_internal_token: str = Header(None)):
    """sensor ส่ง heartbeat เป็นระยะ แม้ไม่มี event — ใช้บอกว่า sensor ยังทำงาน"""
    _check_token(x_internal_token)
    touch_sensor(hb.sensor, datetime.now().isoformat(), hb.info)
    return {"ok": True}


class SqliScoreRequest(BaseModel):
    texts: list[str]


MAX_SQLI_SCORE_TEXTS = 64


@router.post("/internal/sqli-score")
async def sqli_score(body: SqliScoreRequest, request: Request, x_internal_token: str = Header(None)):
    """ให้ sensor ที่รันโมเดลเองไม่ได้ (เช่น VM ที่ Python ไม่มี TensorFlow) ส่งข้อความมาให้คะแนน SQLi

    คืนคะแนน 0–1 ต่อข้อความ (ค่าเดียวกับ predict_sqli) — ไม่เก็บข้อความ ไม่เขียน DB ตัดสินใจ/แจ้งเตือนที่ sensor
    """
    _check_token(x_internal_token)
    if len(body.texts) > MAX_SQLI_SCORE_TEXTS:
        raise HTTPException(status_code=400, detail=f"at most {MAX_SQLI_SCORE_TEXTS} texts per call")
    model = request.app.state.model_sqli
    if model is None:
        raise HTTPException(status_code=503, detail="SQLi model not loaded")
    from backend.inference import predict_sqli_batch
    # encode_sqli_text เก็บแค่ท้าย 221 ตัวอักษรอยู่แล้ว — ตัดที่ 4096 กันข้อความยักษ์กินหน่วยความจำก่อนถึงขั้นนั้น
    texts = [t[-4096:] for t in body.texts]
    scores = await asyncio.to_thread(predict_sqli_batch, model, request.app.state.sqli_word_index, texts)
    return {"ok": True, "scores": scores}


@router.post("/internal/event", response_model=EventResponse)
async def receive_event(
    event: PredictionEvent,
    x_internal_token: str = Header(None),
):
    """รับ Prediction Event จาก sensor — ตรวจสอบ token, บันทึก, broadcast"""

    # ตรวจสอบ shared secret
    _check_token(x_internal_token)

    # ตรวจว่า confidence >= threshold → ถือเป็น Alert
    threshold = get_threshold(event.model_name)
    is_alert = event.confidence >= threshold

    # บันทึกลง SQLite
    event_id = await save_prediction_event(
        model_name=event.model_name,
        attack_class=event.attack_class,
        confidence=event.confidence,
        source_ip=event.source_ip,
        timestamp=event.timestamp,
        is_alert=is_alert,
        dst_ip=event.dst_ip,
        dst_port=event.dst_port,
        protocol=event.protocol,
        bytes_=event.bytes,
        sensor=event.sensor,
    )
    # event ก็นับเป็น heartbeat ของ sensor นั้น
    touch_sensor(event.sensor or f"{event.model_name}-sensor", datetime.now().isoformat())

    # Broadcast ไปยัง dashboard clients ทุกตัว
    await broadcast({
        **event.model_dump(),
        "is_alert": is_alert,
        "event_id": event_id,
    })

    # แจ้งเตือนภายนอก (webhook) เฉพาะ alert ของจริง ไม่ใช่ผลปกติ
    if is_alert and event.attack_class.lower() not in ("normal", "benign"):
        await notify_alert({**event.model_dump(), "event_id": event_id})

    return EventResponse(ok=True, event_id=event_id)
