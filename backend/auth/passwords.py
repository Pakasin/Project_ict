"""
CyberShield — Password hashing (stdlib only)

PBKDF2-HMAC-SHA256 + salt สุ่มต่อบัญชี. รูปแบบที่เก็บ: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
เก็บ iterations ไว้ในค่าเพื่อเพิ่มจำนวนรอบทีหลังได้โดยบัญชีเก่ายังตรวจผ่าน
"""

import hashlib
import hmac
import secrets

ITERATIONS = 240_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters, salt, expected = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iters))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest.hex(), expected)
