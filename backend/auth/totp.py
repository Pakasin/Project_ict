"""
CyberShield — TOTP (RFC 6238) + recovery codes, stdlib only (ไม่ต้องลง pyotp)

SHA-1, 6 หลัก, ช่วง 30 วินาที — เข้ากันได้กับ Google Authenticator / Authy / 1Password
"""

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

PERIOD = 30
DIGITS = 6
WINDOW = 1  # ยอมรับ ±1 ช่วง (นาฬิกาเคลื่อนได้ ~30 วินาที)


def new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _hotp(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    off = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[off:off + 4])[0] & 0x7FFFFFFF) % (10 ** DIGITS)
    return str(code).zfill(DIGITS)


def verify_totp(secret: str, code: str, last_counter: int = 0) -> int | None:
    """คืน counter ที่ตรง (ต้อง > last_counter กัน replay) หรือ None ถ้าไม่ตรง"""
    code = (code or "").strip().replace(" ", "")
    if len(code) != DIGITS or not code.isdigit():
        return None
    now = int(time.time() // PERIOD)
    for c in range(now - WINDOW, now + WINDOW + 1):
        if c > last_counter and hmac.compare_digest(_hotp(secret, c), code):
            return c
    return None


def provisioning_uri(secret: str, username: str, issuer: str = "CyberShield") -> str:
    label = quote(f"{issuer}:{username}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits={DIGITS}&period={PERIOD}"


def new_recovery_codes(n: int = 8) -> list[str]:
    return [f"{secrets.token_hex(3)}-{secrets.token_hex(3)}" for _ in range(n)]


def hash_recovery(code: str) -> str:
    return hashlib.sha256(code.strip().lower().encode()).hexdigest()
