"""
CyberShield — Session Authentication

Dependency สำหรับตรวจสอบ login + route สำหรับ login/logout
ใช้ Starlette session middleware (cookie-based)
Admin username/password อยู่ใน .env เท่านั้น — ห้าม hardcode
"""

from fastapi import Request, HTTPException
import os


async def require_login(request: Request) -> str:
    """FastAPI dependency — ตรวจสอบว่า user login แล้วหรือยัง"""
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username


def verify_credentials(username: str, password: str) -> bool:
    """ตรวจสอบ credentials กับค่าใน .env"""
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "")
    return username == admin_user and password == admin_pass
