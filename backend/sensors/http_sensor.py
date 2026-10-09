"""
CyberShield — HTTP Sensor (mitmproxy addon)

Transparent proxy ที่ intercept HTTP/HTTPS requests
แล้วส่ง query strings + request bodies ไปให้ Injection Model (SQLi) ตรวจ

⚠️ ต้องรันเป็น root:
    sudo mitmproxy --mode transparent --scripts backend/sensors/http_sensor.py
"""

import requests
import os
import sys
import json
import tensorflow as tf
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.sensors.heartbeat import start_heartbeat  # noqa: E402
from backend.sqli_detect import analyze_request  # noqa: E402

load_dotenv()

# ===== Configuration =====
# ชี้ไป backend อื่นได้ (เช่น backend ทดสอบที่ DB ชั่วคราว) ด้วย CYBERSHIELD_BACKEND=http://127.0.0.1:8001
INTERNAL_URL = os.getenv("CYBERSHIELD_BACKEND", "http://localhost:8000").rstrip("/") + "/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
# threshold ของโมเดลบน traffic สด สูงกว่า THRESHOLD_SQLI (0.75 ที่ใช้กับหน้า Test/API) โดยตั้งใจ:
# คะแนนโมเดลบนข้อความ HTTP จริงสูงเกินจริงกับเครื่องหมายวรรคตอน (ดู backend/sqli_detect.py)
THRESHOLD = float(os.getenv("SQLI_LIVE_ML_THRESHOLD", "0.99"))
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# ===== โหลด Model + Tokenizer (ครั้งเดียวตอน startup) =====
print("🔍 Loading SQLi model and tokenizer...")
model_sqli = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_sqli_v2.keras"))
with open(os.path.join(MODELS_DIR, "sqli_tokenizer.json"), encoding="utf-8") as f:
    word_index = json.load(f)
print("✅ SQLi model loaded")


MAX_BODY_BYTES = 65536  # อ่าน body ไม่เกินนี้ต่อ request — กัน upload ใหญ่ ๆ ทำ proxy ช้า


def _body_text(req) -> str:
    """body ที่ decompress แล้ว (gzip/br) แปลงเป็นข้อความแบบไม่ error กับไฟล์ binary"""
    try:
        raw = req.get_content(strict=False) or b""
    except Exception:
        raw = req.raw_content or b""
    return raw[:MAX_BODY_BYTES].decode("utf-8", errors="replace")


class SQLiAddon:
    """mitmproxy addon สำหรับตรวจจับ SQL Injection

    แตก request เป็นค่าที่ผู้โจมตีควบคุมได้ (query/path/body/cookie) ทีละค่า — ไม่ส่ง URL เต็มเข้าโมเดล
    เพราะโมเดลเทรนด้วย payload ล้วน ๆ (URL เต็มทำให้คะแนนตก จับได้ 1/12 เทียบกับ ~6/12)
    ตัดสินด้วย backend/sqli_detect.py: Injection Model ก่อน แล้วค่อยกฎ signature (sqli_rules)
    ตรวจพบ → POST event ไป FastAPI หนึ่ง event ต่อ request
    """

    def request(self, flow):
        """ถูกเรียกทุกครั้งที่มี HTTP request ผ่าน proxy"""
        try:
            req = flow.request
            verdict = analyze_request(
                req.path,                                  # path+query (ไม่รวม host/scheme)
                _body_text(req),
                req.headers.get("content-type", ""),
                req.headers.get("cookie", ""),
                model_sqli, word_index, THRESHOLD,
            )
            if verdict is None:
                return

            conn = flow.client_conn   # mitmproxy ≥7: peername (address ถูกลบใน ≥10 → ถ้าไม่รองรับ sensor จะล้มเงียบ ๆ)
            source_ip = (conn.peername if hasattr(conn, "peername") else conn.address)[0]
            how = "model" if verdict.kind == "model" else f"rule:{verdict.rule}"
            # ไม่ log ค่า candidate เต็ม ๆ — อาจมีรหัสผ่าน/ข้อมูลผู้ใช้ (ใช้ verdict.candidate ตอนดีบักเอง)
            print(f"🚨 SQLi detected from {source_ip}: {verdict.confidence:.1%} ({how})")

            # ส่ง Prediction Event ไป FastAPI
            requests.post(
                INTERNAL_URL,
                json={
                    "model_name": "sqli" if verdict.kind == "model" else "sqli_rules",
                    "attack_class": "SQL Injection",
                    "confidence": verdict.confidence,
                    "source_ip": source_ip,
                    "timestamp": datetime.now().isoformat(),
                    "dst_ip": req.host,
                    "dst_port": req.port,
                    "protocol": "HTTPS" if req.scheme == "https" else "HTTP",
                    "bytes": len(req.raw_content or b""),
                    "sensor": "http",
                },
                headers={"X-Internal-Token": INTERNAL_TOKEN},
                timeout=2,
            )
        except Exception as e:
            print(f"⚠️ SQLi detection error: {e}")


start_heartbeat(INTERNAL_URL.rsplit("/internal/", 1)[0], INTERNAL_TOKEN, "http")

# mitmproxy จะโหลด list นี้เป็น addons อัตโนมัติ
addons = [SQLiAddon()]
