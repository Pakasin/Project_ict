"""
CyberShield — HTTP Sensor (mitmproxy addon)

Transparent proxy ที่ intercept HTTP/HTTPS requests
แล้วส่ง query strings + request bodies ไปให้ Injection Model (SQLi) ตรวจ

⚠️ ต้องรันเป็น root:
    sudo mitmproxy --mode transparent --scripts backend/sensors/http_sensor.py
"""

import requests
import os
import joblib
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ===== Configuration =====
INTERNAL_URL = "http://localhost:8000/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
THRESHOLD = float(os.getenv("THRESHOLD_SQLI", "0.75"))

# ===== โหลด Model + Tokenizer (ครั้งเดียวตอน startup) =====
print("🔍 Loading SQLi model and tokenizer...")
model_sqli = tf.keras.models.load_model("backend/models/lstm_sqli.h5")
tokenizer = joblib.load("backend/models/tokenizer_sqli.pkl")
print("✅ SQLi model loaded")


class SQLiAddon:
    """mitmproxy addon สำหรับตรวจจับ SQL Injection

    ดึง URL + request body จาก HTTP request
    แล้ว tokenize → predict ด้วย Injection Model
    ถ้า confidence >= threshold → POST event ไป FastAPI
    """

    def request(self, flow):
        """ถูกเรียกทุกครั้งที่มี HTTP request ผ่าน proxy"""
        try:
            # รวม URL + request body เป็น input text
            query = flow.request.url + " " + flow.request.get_text()

            # Tokenize + pad (maxlen=200 ตาม training config)
            seq = pad_sequences(
                tokenizer.texts_to_sequences([query]),
                maxlen=200,
            )

            # Predict
            confidence = float(model_sqli.predict(seq, verbose=0)[0][0])

            if confidence >= THRESHOLD:
                source_ip = flow.client_conn.address[0]
                print(f"🚨 SQLi detected from {source_ip}: {confidence:.1%}")

                # ส่ง Prediction Event ไป FastAPI
                requests.post(
                    INTERNAL_URL,
                    json={
                        "model_name": "sqli",
                        "attack_class": "SQL Injection",
                        "confidence": confidence,
                        "source_ip": source_ip,
                        "timestamp": datetime.now().isoformat(),
                    },
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=2,
                )
        except Exception as e:
            print(f"⚠️ SQLi detection error: {e}")


# mitmproxy จะโหลด list นี้เป็น addons อัตโนมัติ
addons = [SQLiAddon()]
