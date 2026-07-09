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
        return AuthResponse(ok=True, message="Login successful", username=body.username)
    return AuthResponse(ok=False, message="Invalid credentials")


@router.post("/logout", response_model=AuthResponse)
async def logout(request: Request):
    """Admin logout — ลบ session"""
    request.session.clear()
    return AuthResponse(ok=True, message="Logged out")


@router.get("/me", response_model=AuthResponse)
async def me(request: Request):
    """ตรวจสอบว่า login อยู่หรือไม่"""
    username = request.session.get("username")
    if username:
        return AuthResponse(ok=True, message="Authenticated", username=username)
    return AuthResponse(ok=False, message="Not authenticated")
