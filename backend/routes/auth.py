"""
CyberShield — Auth Routes

POST /api/login  — admin login
POST /api/logout — admin logout
GET  /api/me     — ตรวจสอบสถานะ login
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from backend.auth.session import verify_credentials

router = APIRouter(prefix="/api", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    ok: bool
    message: str
    username: str | None = None


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, request: Request):
    """Admin login — บันทึก session cookie"""
    if verify_credentials(body.username, body.password):
        request.session["username"] = body.username
        return AuthResponse(ok=True, message="เข้าสู่ระบบสำเร็จ", username=body.username)
    return AuthResponse(ok=False, message="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")


@router.post("/logout", response_model=AuthResponse)
async def logout(request: Request):
    """Admin logout — ลบ session"""
    request.session.clear()
    return AuthResponse(ok=True, message="ออกจากระบบสำเร็จ")


@router.get("/me", response_model=AuthResponse)
async def me(request: Request):
    """ตรวจสอบว่า login อยู่หรือไม่"""
    username = request.session.get("username")
    if username:
        return AuthResponse(ok=True, message="ยืนยันตัวตนแล้ว", username=username)
    return AuthResponse(ok=False, message="ยังไม่ได้ยืนยันตัวตน")
