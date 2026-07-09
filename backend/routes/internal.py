"""
CyberShield — Internal Event Endpoint (Sensor IPC)

POST /internal/event — รับ Prediction Events จาก sensor processes
ป้องกันด้วย X-Internal-Token header (shared secret)
nginx block endpoint นี้จากภายนอก (deny all)
Sensors (nfstream, mitmproxy) ที่รัน root เข้าถึงผ่าน localhost เท่านั้น
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os

from backend.db import save_prediction_event
from backend.routes.ws import broadcast

router = APIRouter(tags=["internal"])


class PredictionEvent(BaseModel):
    """Prediction Event — ผลลัพธ์จากการตรวจจับของ model"""
    model_name: str       # "intrusion" | "flow" | "sqli"
    attack_class: str     # "R2L" | "U2R" | "DDoS" | "Normal" | etc.
    confidence: float     # ค่าความมั่นใจ 0.0 - 1.0
    source_ip: str        # IP ต้นทาง
    timestamp: str        # ISO format timestamp


class EventResponse(BaseModel):
    ok: bool
    event_id: int | None = None


# ดึง threshold จาก .env สำหรับแต่ละ model
THRESHOLDS = {
    "intrusion": float(os.getenv("THRESHOLD_INTRUSION", "0.85")),
    "flow": float(os.getenv("THRESHOLD_FLOW", "0.80")),
    "sqli": float(os.getenv("THRESHOLD_SQLI", "0.75")),
}


@router.post("/internal/event", response_model=EventResponse)
async def receive_event(
    event: PredictionEvent,
    x_internal_token: str = Header(None),
):
    """รับ Prediction Event จาก sensor — ตรวจสอบ token, บันทึก, broadcast"""

    # ตรวจสอบ shared secret
    expected_token = os.getenv("INTERNAL_TOKEN", "")
    if x_internal_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal token")

    # ตรวจว่า confidence >= threshold → ถือเป็น Alert
    threshold = THRESHOLDS.get(event.model_name, 0.80)
    is_alert = event.confidence >= threshold

    # บันทึกลง SQLite
    event_id = await save_prediction_event(
        model_name=event.model_name,
        attack_class=event.attack_class,
        confidence=event.confidence,
        source_ip=event.source_ip,
        timestamp=event.timestamp,
        is_alert=is_alert,
    )

    # Broadcast ไปยัง dashboard clients ทุกตัว
    await broadcast({
        **event.model_dump(),
        "is_alert": is_alert,
        "event_id": event_id,
    })

    return EventResponse(ok=True, event_id=event_id)
