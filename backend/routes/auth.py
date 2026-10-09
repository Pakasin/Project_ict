"""
CyberShield — Auth Routes

POST /api/register — สมัครบัญชี General User (เก็บในตาราง users, hash ด้วย PBKDF2)
POST /api/login    — admin (.env) หรือ General User (ตาราง users) → session cookie
POST /api/logout   — ลบ session
GET  /api/me       — ตรวจสอบสถานะ login (+ role, profile)

กันเดารหัสผ่าน: ล็อกเกินกำหนดต่อ (IP, username) — ดูค่า LOGIN_* ด้านล่าง
(หลัง nginx ใช้ X-Real-IP / X-Forwarded-For ถ้ามี ไม่งั้นทุกคนจะเป็น 127.0.0.1 เหมือนกันหมด)
"""

import re
import time
from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.auth.passwords import hash_password, verify_password
from backend.auth.session import ROLE_ADMIN, ROLE_GENERAL, verify_credentials
from backend.db import create_user, get_user

router = APIRouter(prefix="/api", tags=["auth"])

LOGIN_MAX_FAILS = 5          # ผิดได้กี่ครั้ง
LOGIN_WINDOW = 300.0         # ... ภายในกี่วินาที ถึงจะถูกล็อก
REGISTER_MAX_PER_HOUR = 10   # สมัครได้กี่บัญชีต่อ IP ต่อชั่วโมง

_fails: dict[str, list[float]] = {}
_registrations: dict[str, list[float]] = {}

# hash หลอกไว้เทียบเมื่อไม่พบ username เพื่อให้เวลาตอบใกล้เคียงกัน (กันเดา username จากความเร็ว)
_DUMMY_HASH = hash_password("dummy-password-for-timing")
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{3,32}$")


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return fwd or (request.client.host if request.client else "unknown")


def _recent(table: dict, key: str, window: float) -> list[float]:
    now = time.monotonic()
    kept = [t for t in table.get(key, []) if now - t < window]
    if kept:
        table[key] = kept
    else:
        table.pop(key, None)
    return kept


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    lastname: str
    phone: str
    email: str


class AuthResponse(BaseModel):
    ok: bool
    message: str
    username: str | None = None
    role: str | None = None
    profile: dict | None = None
    email: str | None = None


def _user_response(message: str, username: str, role: str, user: dict | None = None) -> AuthResponse:
    profile = {"name": "System", "lastname": "Administrator", "phone": "-"}
    email = f"{username}@cybershield.th"
    if user:
        profile = {"name": user["name"], "lastname": user["lastname"], "phone": user["phone"]}
        email = user["email"]
    return AuthResponse(ok=True, message=message, username=username, role=role, profile=profile, email=email)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, request: Request):
    """Login — admin จาก .env ก่อน แล้วค่อยบัญชีในตาราง users"""
    uname = body.username.strip()
    key = f"{_client_ip(request)}|{uname.lower()}"
    if len(_recent(_fails, key, LOGIN_WINDOW)) >= LOGIN_MAX_FAILS:
        return AuthResponse(ok=False, message="พยายามเข้าสู่ระบบผิดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่")

    if verify_credentials(uname, body.password):
        _fails.pop(key, None)
        request.session.clear()
        request.session.update({"username": uname, "role": ROLE_ADMIN})
        return _user_response("เข้าสู่ระบบสำเร็จ", uname, ROLE_ADMIN)

    user = get_user(uname)
    ok = verify_password(body.password, user["password_hash"] if user else _DUMMY_HASH) and user is not None
    if ok:
        _fails.pop(key, None)
        request.session.clear()
        request.session.update({"username": user["username"], "role": ROLE_GENERAL})
        return _user_response("เข้าสู่ระบบสำเร็จ", user["username"], ROLE_GENERAL, user)

    _fails.setdefault(key, []).append(time.monotonic())
    return AuthResponse(ok=False, message="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, request: Request):
    """สมัครบัญชี General User (สิทธิ์ดูอย่างเดียว — require_admin ปฏิเสธการแก้ไขทุกอย่าง)"""
    ip = _client_ip(request)
    if len(_recent(_registrations, ip, 3600.0)) >= REGISTER_MAX_PER_HOUR:
        return AuthResponse(ok=False, message="สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง")

    uname = body.username.strip()
    if not USERNAME_RE.match(uname):
        return AuthResponse(ok=False, message="ชื่อผู้ใช้ต้องยาว 3–32 ตัว ใช้ได้เฉพาะ A-Z a-z 0-9 _ . -")
    if len(body.password) < 6 or len(body.password) > 128:
        return AuthResponse(ok=False, message="รหัสผ่านต้องยาว 6–128 ตัวอักษร")
    if "@" not in body.email or len(body.email) > 254:
        return AuthResponse(ok=False, message="อีเมลไม่ถูกต้อง")
    if min(len(body.name.strip()), len(body.lastname.strip())) < 2 or max(len(body.name), len(body.lastname), len(body.phone)) > 100:
        return AuthResponse(ok=False, message="ข้อมูลชื่อ/เบอร์โทรไม่ถูกต้อง")

    import os
    if uname.lower() == os.getenv("ADMIN_USERNAME", "admin").lower():
        return AuthResponse(ok=False, message="ชื่อผู้ใช้นี้ถูกใช้แล้ว")
    created = create_user(
        username=uname, password_hash=hash_password(body.password), name=body.name.strip(),
        lastname=body.lastname.strip(), phone=body.phone.strip(), email=body.email.strip(),
        created_at=datetime.now().isoformat(),
    )
    if not created:
        return AuthResponse(ok=False, message="ชื่อผู้ใช้นี้ถูกใช้แล้ว")
    _registrations.setdefault(ip, []).append(time.monotonic())
    return AuthResponse(ok=True, message="สมัครสมาชิกสำเร็จ", username=uname, role=ROLE_GENERAL)


@router.post("/logout", response_model=AuthResponse)
async def logout(request: Request):
    """ลบ session"""
    request.session.clear()
    return AuthResponse(ok=True, message="ออกจากระบบสำเร็จ")


@router.get("/me", response_model=AuthResponse)
async def me(request: Request):
    """ตรวจสอบว่า login อยู่หรือไม่ (คืน role + profile)"""
    username = request.session.get("username")
    if not username:
        return AuthResponse(ok=False, message="ยังไม่ได้ยืนยันตัวตน")
    role = request.session.get("role", ROLE_ADMIN)
    user = get_user(username) if role == ROLE_GENERAL else None
    return _user_response("ยืนยันตัวตนแล้ว", username, role, user)
