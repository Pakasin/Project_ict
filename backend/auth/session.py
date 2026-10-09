"""
CyberShield — Session Authentication

Dependency สำหรับตรวจสอบ login. ใช้ Starlette session middleware (cookie-based, signed)
Admin username/password อยู่ใน .env เท่านั้น — ห้าม hardcode. บัญชีอื่น (General User) อยู่ในตาราง users
session เก็บ username + role: "admin" | "general"
"""

import hmac
import os

from fastapi import HTTPException, Request

ROLE_ADMIN = "admin"
ROLE_GENERAL = "general"


async def require_login(request: Request) -> str:
    """FastAPI dependency — ต้อง login แล้ว (role ใดก็ได้)"""
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="ยังไม่ได้ยืนยันตัวตน")
    return username


async def require_admin(request: Request) -> str:
    """FastAPI dependency — เฉพาะ admin (route ที่ mutate state: incidents, firewall, settings)

    General User ที่ login จริงมี session แต่ role = general → 403.
    session ที่ไม่มี role มาจากก่อนมีระบบ role ซึ่งออกให้ admin เท่านั้น จึงถือเป็น admin
    (cookie เซ็นชื่อด้วย SESSION_SECRET ปลอมไม่ได้ และอายุสูงสุด 1 ชั่วโมง)
    """
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="ต้องการสิทธิ์ Admin ในการดำเนินการ")
    if request.session.get("role", ROLE_ADMIN) != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="ต้องการสิทธิ์ Admin ในการดำเนินการ")
    return username


def verify_credentials(username: str, password: str) -> bool:
    """ตรวจสอบ admin credentials กับค่าใน .env (เทียบแบบ constant-time)

    ถ้า ADMIN_PASSWORD ไม่ได้ตั้ง/ว่าง จะปฏิเสธเสมอ — เดิมรหัสว่างทำให้ล็อกอินด้วย password "" ผ่านได้
    """
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "")
    if not admin_pass:
        return False
    return hmac.compare_digest(username.encode(), admin_user.encode()) and \
        hmac.compare_digest(password.encode(), admin_pass.encode())
