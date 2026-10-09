"""
CyberShield — Alert notifications (webhook)

ส่ง alert ไป webhook ที่ admin ตั้งไว้ (Slack / Discord / ระบบอื่นที่รับ JSON) — payload มีทั้ง "text" (Slack)
และ "content" (Discord). ไม่ส่งซ้ำ (attack_class, source_ip) เดิมภายใน COOLDOWN วินาที กัน DDoS ท่วม webhook.
URL เป็น secret (มักมี token) จึงให้อ่านได้เฉพาะ admin; ตั้งค่าได้เฉพาะ admin เท่านั้น
"""

import asyncio
import json
import time
import urllib.request
from urllib.parse import urlparse

from backend.db import get_setting

SETTING_KEY = "webhook_url"
COOLDOWN = 60.0
_last_sent: dict[tuple[str, str], float] = {}


def valid_webhook_url(url: str) -> bool:
    p = urlparse(url)
    return p.scheme in ("http", "https") and bool(p.netloc)


def _post(url: str, payload: dict) -> None:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "CyberShield"}, method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=4).read()
    except Exception as e:  # webhook ล่มต้องไม่กระทบการรับ event
        print(f"⚠️ webhook failed: {e}")


def build_payload(event: dict) -> dict:
    text = (f"🚨 CyberShield: {event['attack_class']} จาก {event['source_ip']} "
            f"({event['confidence'] * 100:.1f}%) โดย {event['model_name']}")
    return {"text": text, "content": text, "event": event}


async def notify_alert(event: dict) -> None:
    """เรียกจาก internal.py เมื่อมี alert — ไม่ทำอะไรถ้ายังไม่ได้ตั้ง webhook"""
    url = get_setting(SETTING_KEY)
    if not url or not valid_webhook_url(url):
        return
    key = (event["attack_class"], event["source_ip"])
    now = time.monotonic()
    if now - _last_sent.get(key, 0.0) < COOLDOWN:
        return
    _last_sent[key] = now
    await asyncio.get_running_loop().run_in_executor(None, _post, url, build_payload(event))
