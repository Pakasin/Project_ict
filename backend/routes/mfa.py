"""
CyberShield — MFA (TOTP) management

GET  /api/mfa/status   — เปิดอยู่หรือไม่ + จำนวน recovery code ที่เหลือ
POST /api/mfa/setup    — สร้าง secret ใหม่ (ยังไม่เปิดใช้) → คืน secret + otpauth URI
POST /api/mfa/enable   — ยืนยันด้วยรหัสแรกจากแอป → เปิดใช้ + คืน recovery codes (แสดงครั้งเดียว)
POST /api/mfa/disable  — ปิด ต้องใช้รหัสผ่าน + รหัส TOTP/recovery ปัจจุบัน

ใช้ได้ทั้ง admin และ General User (ต้อง login แล้ว)
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.auth import totp
from backend.auth.passwords import verify_password
from backend.auth.session import ROLE_ADMIN, require_login, verify_credentials
from backend.db import (add_audit_log, consume_recovery_code, delete_mfa, enable_mfa, get_mfa, get_user,
                        set_mfa_pending, update_mfa_counter)

router = APIRouter(prefix="/api/mfa", tags=["mfa"])


class CodeBody(BaseModel):
    code: str


class DisableBody(BaseModel):
    password: str
    code: str


def _audit(username: str, action: str) -> None:
    add_audit_log(username, action, "MFA", datetime.now().isoformat())


@router.get("/status")
async def status(username: str = Depends(require_login)):
    m = get_mfa(username)
    enabled = bool(m and m["enabled"])
    return {"enabled": enabled, "recovery_remaining": len(json.loads(m["recovery_hashes"])) if enabled else 0}


@router.post("/setup")
async def setup(username: str = Depends(require_login)):
    m = get_mfa(username)
    if m and m["enabled"]:
        raise HTTPException(status_code=409, detail="เปิด MFA อยู่แล้ว ต้องปิดก่อนจึงตั้งค่าใหม่ได้")
    secret = totp.new_secret()
    set_mfa_pending(username, secret, datetime.now().isoformat())
    return {"secret": secret, "uri": totp.provisioning_uri(secret, username)}


@router.post("/enable")
async def enable(body: CodeBody, username: str = Depends(require_login)):
    m = get_mfa(username)
    if not m or m["enabled"]:
        raise HTTPException(status_code=409, detail="ยังไม่ได้เริ่มตั้งค่า หรือเปิดใช้แล้ว")
    counter = totp.verify_totp(m["secret"], body.code, m["last_counter"])
    if counter is None:
        raise HTTPException(status_code=400, detail="รหัสไม่ถูกต้อง")
    codes = totp.new_recovery_codes()
    enable_mfa(username, counter, json.dumps([totp.hash_recovery(c) for c in codes]))
    _audit(username, "เปิดใช้ MFA")
    return {"enabled": True, "recovery_codes": codes}


@router.post("/disable")
async def disable(body: DisableBody, request: Request, username: str = Depends(require_login)):
    m = get_mfa(username)
    if not m or not m["enabled"]:
        raise HTTPException(status_code=409, detail="ยังไม่ได้เปิด MFA")
    if request.session.get("role", ROLE_ADMIN) == ROLE_ADMIN:
        pw_ok = verify_credentials(username, body.password)
    else:
        u = get_user(username)
        pw_ok = bool(u) and verify_password(body.password, u["password_hash"])
    if not pw_ok:  # เช็กรหัสผ่านก่อน — ไม่งั้นรหัสผ่านผิดจะเผา recovery code/TOTP ทิ้ง
        raise HTTPException(status_code=400, detail="รหัสผ่านหรือรหัสยืนยันไม่ถูกต้อง")
    code = body.code.strip()
    counter = totp.verify_totp(m["secret"], code, m["last_counter"])
    code_ok = update_mfa_counter(username, counter) if counter is not None else (
        not code.isdigit() and consume_recovery_code(username, totp.hash_recovery(code)))
    if not code_ok:
        raise HTTPException(status_code=400, detail="รหัสผ่านหรือรหัสยืนยันไม่ถูกต้อง")
    delete_mfa(username)
    _audit(username, "ปิด MFA")
    return {"enabled": False}
