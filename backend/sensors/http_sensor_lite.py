"""
CyberShield — HTTP Sensor (lite, mitmproxy addon) สำหรับเครื่องที่รัน TensorFlow ไม่ได้

เหมือน http_sensor.py ทุกประการด้านการตัดสินใจ (backend/sqli_detect.py ตัวเดียวกัน) ต่างกันแค่ "ใครให้คะแนนโมเดล":
  - ด่านกฎ (sqli_rules) และการสกัดข้อมูล (sqli_extract) รันบนเครื่องนี้ — Python ล้วน ไม่มี numpy/TF
  - คะแนนโมเดล v2 ขอจาก backend: POST {BACKEND}/internal/sqli-score (X-Internal-Token) ผ่าน SSH reverse tunnel
    ถ้า backend ไม่ตอบ → ใช้กฎอย่างเดียวต่อ (ไม่ทำให้ proxy ล้ม) และพิมพ์เตือนครั้งแรกครั้งเดียว
เหมาะกับ VM ที่ Python 3.14 ไม่มี TensorFlow wheel (ดู live_sensor_lite.py ที่ทำแบบเดียวกันกับ Flow Model)

ตั้งค่าด้วย environment (ไม่อ่าน .env, ไม่ต้องใช้ python-dotenv):
  CYBERSHIELD_BACKEND     default http://127.0.0.1:8000   (ปลายทางของ reverse tunnel)
  INTERNAL_TOKEN          ต้องตรงกับ backend  (อย่าใส่ในบรรทัดคำสั่ง — ps เห็น; ใช้ไฟล์ env)
  SQLI_LIVE_ML_THRESHOLD  default 0.99
  CS_SENSOR_STATS         path ไฟล์ JSON lines (optional): บันทึก "ผลต่อ request" เป็นตัวนับ/ชนิดกฎ ไม่เก็บข้อความ request

รันแบบ reverse proxy (ไม่ต้องแก้ iptables — ปลายทางเดียวที่กำหนดเท่านั้น ไม่ใช่ open proxy):
  mitmdump --mode reverse:http://127.0.0.1:80 --listen-port 8081 -s backend/sensors/http_sensor_lite.py
หรือแบบ transparent ตามออกแบบเดิม (ต้อง root + iptables REDIRECT):
  sudo mitmdump --mode transparent -s backend/sensors/http_sensor_lite.py
"""

import json
import os
import sys
import threading
import time
from datetime import datetime

import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.sensors.heartbeat import start_heartbeat  # noqa: E402
from backend.sqli_detect import analyze_with_scorer  # noqa: E402

BACKEND = os.getenv("CYBERSHIELD_BACKEND", "http://127.0.0.1:8000").rstrip("/")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
THRESHOLD = float(os.getenv("SQLI_LIVE_ML_THRESHOLD", "0.99"))
STATS_PATH = os.getenv("CS_SENSOR_STATS", "")
MAX_BODY_BYTES = 65536
HEADERS = {"X-Internal-Token": INTERNAL_TOKEN}

_warned = False


def remote_scores(texts: list[str]) -> list[float]:
    """ขอคะแนนโมเดลจาก backend (ล้ม/ช้า → exception → analyze_with_scorer ใช้กฎอย่างเดียว)"""
    global _warned
    try:
        r = requests.post(f"{BACKEND}/internal/sqli-score", json={"texts": texts}, headers=HEADERS, timeout=3)
        r.raise_for_status()
        return r.json()["scores"]
    except Exception as e:
        if not _warned:
            _warned = True
            print(f"⚠️ model scoring unavailable ({type(e).__name__}) — rules only until it recovers", flush=True)
        raise


def _body_text(req) -> str:
    try:
        raw = req.get_content(strict=False) or b""
    except Exception:
        raw = req.raw_content or b""
    return raw[:MAX_BODY_BYTES].decode("utf-8", errors="replace")


class SQLiLiteAddon:
    def __init__(self):
        self.total = 0
        self.flagged = {"rules": 0, "model": 0}
        self.lock = threading.Lock()

    def _stat(self, kind: str | None, rule: str | None):
        with self.lock:
            self.total += 1
            if kind:
                self.flagged[kind] += 1
        if STATS_PATH:
            try:
                with open(STATS_PATH, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"t": round(time.time(), 3), "kind": kind, "rule": rule}) + "\n")
            except OSError:
                pass

    def request(self, flow):
        try:
            req = flow.request
            v = analyze_with_scorer(req.path, _body_text(req), req.headers.get("content-type", ""),
                                    req.headers.get("cookie", ""), remote_scores, THRESHOLD)
            self._stat(v.kind if v else None, v.rule if v else None)
            if v is None:
                return
            source_ip = flow.client_conn.peername[0] if hasattr(flow.client_conn, "peername") else flow.client_conn.address[0]
            how = "model" if v.kind == "model" else f"rule:{v.rule}"
            print(f"🚨 SQLi from {source_ip}: {v.confidence:.1%} ({how})", flush=True)   # ไม่ log ค่า request — อาจมีข้อมูลผู้ใช้
            requests.post(
                f"{BACKEND}/internal/event",
                json={
                    "model_name": "sqli" if v.kind == "model" else "sqli_rules",
                    "attack_class": "SQL Injection",
                    "confidence": v.confidence,
                    "source_ip": source_ip,
                    "timestamp": datetime.now().isoformat(),
                    "dst_ip": req.host,
                    "dst_port": req.port,
                    "protocol": "HTTPS" if req.scheme == "https" else "HTTP",
                    "bytes": len(req.raw_content or b""),
                    "sensor": "http-lite",
                },
                headers=HEADERS, timeout=2,
            )
        except Exception as e:
            print(f"⚠️ SQLi detection error: {type(e).__name__}: {e}", flush=True)

    def done(self):
        print(f"[http-lite] requests={self.total} flagged={self.flagged}", flush=True)


start_heartbeat(BACKEND, INTERNAL_TOKEN, "http-lite")
addons = [SQLiLiteAddon()]
