"""
CyberShield — Mute rules API (ปิดเสียง alert ที่รู้ว่าเตือนผิด)

GET    /api/mute-rules        — กฎที่ยังไม่หมดอายุ (admin)
POST   /api/mute-rules        — สร้างกฎ (admin, บันทึก audit log)
DELETE /api/mute-rules/{id}   — ลบกฎ (admin, บันทึก audit log)

กฎความปลอดภัย (ตั้งใจ): กฎที่ปิดเสียงระบบตรวจจับต้อง "ปลอดภัยโดยค่าเริ่มต้น"
  - ต้องมีวันหมดอายุเสมอ (ไม่มีกฎถาวร) สูงสุด 30 วัน; ค่าเริ่มต้น 7 วัน
  - ต้องระบุ IP หรือประเภทการโจมตีอย่างน้อยหนึ่งอย่าง — ปิดเสียงทุกอย่างไม่ได้
  - กฎที่ระบุเฉพาะประเภท (ปิดเสียงทั้งประเภทจากทุกเครื่อง) สูงสุด 7 วัน เพราะทำให้ตาบอดต่อการโจมตีประเภทนั้นทั้งเครือข่าย
  - ต้องใส่เหตุผล และทุกการสร้าง/ลบถูกบันทึกใน audit log
  - event ที่ถูกปิดเสียงยังถูกบันทึกลง DB (ตรวจย้อนหลังได้ เห็นป้าย Muted ใน Logs) แต่ไม่นับเป็น alert / ไม่ broadcast / ไม่ส่ง webhook
"""

import ipaddress
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth.session import require_admin
from backend.db import add_audit_log, add_mute_rule, delete_mute_rule, list_mute_rules

router = APIRouter(prefix="/api", tags=["mute"])

MAX_DAYS = 30
MAX_DAYS_CLASS_ONLY = 7
DEFAULT_DAYS = 7


class MuteRuleRequest(BaseModel):
    source_ip: str | None = None
    attack_class: str | None = None
    reason: str
    days: float = DEFAULT_DAYS


def _clean(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


@router.get("/mute-rules")
async def get_mute_rules(_admin: str = Depends(require_admin)):
    return {"ok": True, "data": list_mute_rules(datetime.now().isoformat())}


@router.post("/mute-rules")
async def create_mute_rule(body: MuteRuleRequest, username: str = Depends(require_admin)):
    ip, cls, reason = _clean(body.source_ip), _clean(body.attack_class), body.reason.strip()
    if ip is None and cls is None:
        raise HTTPException(status_code=400, detail="ต้องระบุ IP หรือประเภทการโจมตีอย่างน้อยหนึ่งอย่าง (ปิดเสียงทุกอย่างไม่ได้)")
    if ip is not None:
        try:
            ip = str(ipaddress.ip_address(ip))      # ตรงแบบ exact กับ source_ip ที่ sensor ส่งมา — ไม่รับ CIDR/ข้อความอิสระ
        except ValueError:
            raise HTTPException(status_code=400, detail="IP ไม่ถูกต้อง (ใส่ IP เดียว ไม่รองรับช่วง/CIDR)")
    if cls is not None and len(cls) > 64:
        raise HTTPException(status_code=400, detail="ชื่อประเภทการโจมตียาวเกินไป")
    if len(reason) < 3 or len(reason) > 300:
        raise HTTPException(status_code=400, detail="ต้องใส่เหตุผล 3–300 ตัวอักษร")
    limit = MAX_DAYS_CLASS_ONLY if ip is None else MAX_DAYS
    if not (0 < body.days <= limit):
        raise HTTPException(status_code=400, detail=f"อายุกฎต้องมากกว่า 0 และไม่เกิน {limit} วัน"
                            + (" (กฎที่ระบุเฉพาะประเภทจำกัด 7 วัน)" if ip is None else ""))

    now = datetime.now()
    rule_id = add_mute_rule(ip, cls, reason, username, now.isoformat(), (now + timedelta(days=body.days)).isoformat())
    add_audit_log(username, f"สร้างกฎ mute ({body.days:g} วัน): {reason}", f"Mute #{rule_id} ({ip or '*'} / {cls or '*'})", now.isoformat())
    return {"ok": True, "id": rule_id}


@router.delete("/mute-rules/{rule_id}")
async def remove_mute_rule(rule_id: int, username: str = Depends(require_admin)):
    if not delete_mute_rule(rule_id):
        raise HTTPException(status_code=404, detail="ไม่พบกฎนี้")
    add_audit_log(username, "ลบกฎ mute", f"Mute #{rule_id}", datetime.now().isoformat())
    return {"ok": True}
