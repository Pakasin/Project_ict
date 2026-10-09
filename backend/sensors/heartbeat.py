"""Heartbeat ของ sensor → POST /internal/heartbeat ทุก INTERVAL วินาที

ทำให้หน้า Settings → สถานะ Sensor รู้ว่า sensor ยังทำงานอยู่ แม้ช่วงนั้นไม่มี event
ใช้ daemon thread — ไม่บล็อก loop ตรวจจับ และ error ของ backend ไม่ทำให้ sensor ล้ม
"""

import threading
import time

import requests

INTERVAL = 30  # วินาที (backend ถือว่า online ถ้าเห็นภายใน 120 วินาที)


def start_heartbeat(base_url: str, token: str, sensor: str, info: str | None = None) -> None:
    url = base_url.rstrip("/") + "/internal/heartbeat"

    def loop() -> None:
        while True:
            try:
                requests.post(url, json={"sensor": sensor, "info": info},
                              headers={"X-Internal-Token": token}, timeout=2)
            except requests.RequestException:
                pass
            time.sleep(INTERVAL)

    threading.Thread(target=loop, daemon=True, name=f"heartbeat-{sensor}").start()
