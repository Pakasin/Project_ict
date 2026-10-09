"""
CyberShield — System API

GET  /api/health              — สถานะ backend / DB / โมเดล / sensors (ไม่ต้อง login)
GET  /api/settings/thresholds — threshold ต่อโมเดล (ค่าปัจจุบัน + ค่า default จาก .env)
PUT  /api/settings/thresholds — ตั้ง threshold (admin) มีผลกับ event ถัดไปทันที
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from backend.auth.session import require_admin
from backend.db import add_audit_log, get_db, get_sensors, get_setting, set_setting
from backend.mitre import MITRE_TECHNIQUES
from backend.notify import SETTING_KEY, _post, build_payload, valid_webhook_url
from backend.routes.internal import THRESHOLDS, get_threshold

router = APIRouter(prefix="/api", tags=["system"])

# sensor ถือว่า online ถ้าเห็นภายในกี่วินาที
SENSOR_ONLINE_SECONDS = 120


@router.get("/health")
async def health(request: Request):
    db_ok = True
    try:
        conn = get_db()
        conn.execute("SELECT 1")
        conn.close()
    except Exception:
        db_ok = False

    now = datetime.now()
    sensors = []
    for s in get_sensors():
        try:
            age = (now - datetime.fromisoformat(s["last_seen"])).total_seconds()
        except ValueError:
            age = None
        sensors.append({**s, "age_seconds": age, "online": age is not None and age <= SENSOR_ONLINE_SECONDS})

    st = request.app.state
    models = {
        "intrusion": hasattr(st, "model_intrusion"),
        "flow": hasattr(st, "model_flow"),
        "sqli": hasattr(st, "model_sqli"),
    }
    return {"ok": True, "data": {"db": db_ok, "models": models, "sensors": sensors,
                                 "online_window_seconds": SENSOR_ONLINE_SECONDS, "server_time": now.isoformat()}}


@router.get("/settings/thresholds")
async def get_thresholds():
    return {"ok": True, "data": {m: {"value": get_threshold(m), "default": d} for m, d in THRESHOLDS.items()}}


class ThresholdsRequest(BaseModel):
    thresholds: dict[str, float]


@router.put("/settings/thresholds")
async def put_thresholds(body: ThresholdsRequest, username: str = Depends(require_admin)):
    for model, val in body.thresholds.items():
        if model not in THRESHOLDS:
            return {"ok": False, "error": f"unknown model: {model}"}
        if not 0.0 < val <= 1.0:
            return {"ok": False, "error": f"{model}: threshold ต้องอยู่ในช่วง (0, 1]"}
    now = datetime.now().isoformat()
    for model, val in body.thresholds.items():
        set_setting(f"threshold_{model}", str(val))
    add_audit_log(username, "แก้ไข threshold", ", ".join(f"{m}={v}" for m, v in body.thresholds.items()), now)
    return {"ok": True}


@router.get("/mitre")
async def mitre():
    """mapping attack_class → MITRE ATT&CK technique (ใช้ในหน้า Analytics)"""
    return {"ok": True, "data": MITRE_TECHNIQUES}


@router.get("/settings/notifications")
async def get_notifications(_admin: str = Depends(require_admin)):
    """admin เท่านั้น — URL ของ webhook มักมี token จึงไม่เปิดให้คนอื่นอ่าน"""
    return {"ok": True, "data": {"webhook_url": get_setting(SETTING_KEY) or ""}}


class NotificationsRequest(BaseModel):
    webhook_url: str


@router.put("/settings/notifications")
async def put_notifications(body: NotificationsRequest, username: str = Depends(require_admin)):
    url = body.webhook_url.strip()
    if url and not valid_webhook_url(url):
        return {"ok": False, "error": "URL ต้องขึ้นต้นด้วย http:// หรือ https://"}
    set_setting(SETTING_KEY, url)
    add_audit_log(username, "ตั้งค่า webhook แจ้งเตือน" if url else "ปิด webhook แจ้งเตือน", "webhook", datetime.now().isoformat())
    return {"ok": True}


@router.post("/settings/notifications/test")
async def test_notifications(username: str = Depends(require_admin)):
    url = get_setting(SETTING_KEY)
    if not url:
        return {"ok": False, "error": "ยังไม่ได้ตั้งค่า webhook"}
    import asyncio
    sample = {"attack_class": "TEST", "source_ip": "0.0.0.0", "confidence": 1.0, "model_name": "test"}
    await asyncio.get_running_loop().run_in_executor(None, _post, url, build_payload(sample))
    return {"ok": True}
