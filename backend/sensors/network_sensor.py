"""
CyberShield — Network Sensor (nfstream)

จับ live network flows จาก network interface
แปลงเป็น features สำหรับ 2 models:
  - Intrusion Model (NSL-KDD): 41 features → R2L / U2R
  - Flow Model (CSE-CIC-IDS2018): 78 raw features → scale → slice 71 → DoS / DDoS / BruteForce

Windows เรียงตามเวลาล้วน (chronological, ไม่ group by source IP — ดู CLAUDE.md
"Neither dataset has a Source IP column"). ไม่ predict จนกว่าจะสะสมครบ 10 flows
เพราะ training data ทิ้ง incomplete window ทิ้งไป โมเดลไม่เคยเห็น padding จริง

⚠️ feature extraction ยังเป็น placeholder (TODO ด้านล่าง) — sensor นี้ยังใช้งาน
จริงกับ traffic จริงไม่ได้จนกว่าจะ map field ครบ ต้องมี Linux VM + root ถึงจะทดสอบ

⚠️ ต้องรันเป็น root (raw socket access):
    sudo python backend/sensors/network_sensor.py
"""

import nfstream
import joblib
import requests
import os
import sys
import tensorflow as tf
from collections import deque
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.inference import (  # noqa: E402
    load_model_artifacts,
    predict_intrusion_window,
    predict_flow_window,
)

load_dotenv()

# ===== Configuration =====
WINDOW_SIZE = 10
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
INTERNAL_URL = "http://localhost:8000/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
NETWORK_INTERFACE = os.getenv("NETWORK_INTERFACE", "eth0")
THRESHOLD_INTRUSION = float(os.getenv("THRESHOLD_INTRUSION", "0.85"))
THRESHOLD_FLOW = float(os.getenv("THRESHOLD_FLOW", "0.80"))

# ===== โหลด Models + Scalers =====
print("📡 Loading models and scalers...")
model_intrusion = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_nslkdd_smote.keras"))
model_flow = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_GRU.keras"))
scaler_intrusion = joblib.load(os.path.join(MODELS_DIR, "scaler_nslkdd.pkl"))
scaler_flow = joblib.load(os.path.join(MODELS_DIR, "scaler_csecicids2018.pkl"))
_artifacts = load_model_artifacts()
flow_keep_idx = _artifacts["flow_keep_idx"]
FLOW_CLASSES = _artifacts["flow_classes"]
print("✅ Models loaded")

# ===== Sliding Window Buffer =====
# chronological only — ไม่ group by source IP (ตาม CLAUDE.md)
nsl_window: deque = deque(maxlen=WINDOW_SIZE)
cic_window: deque = deque(maxlen=WINDOW_SIZE)


def extract_nslkdd_features(flow) -> list:
    """แปลง nfstream flow → NSL-KDD 41 features

    TODO: implement mapping จาก nfstream attributes ไปยัง NSL-KDD feature set
    ต้อง map fields เช่น:
    - duration, protocol_type, service, flag
    - src_bytes, dst_bytes, land, wrong_fragment
    - urgent, hot, num_failed_logins, logged_in
    - ... (ดู NSL-KDD feature list เต็มใน train_unswnb15.py — ชื่อไฟล์เก่า
      แต่ปัจจุบัน dataset คือ NSL-KDD ดู CONTEXT.md)
    """
    # Placeholder — ต้อง implement ตาม feature mapping ก่อนใช้งานจริง
    features = [0.0] * 41
    features[0] = float(getattr(flow, "bidirectional_duration_ms", 0))
    features[1] = float(getattr(flow, "src2dst_bytes", 0))
    features[2] = float(getattr(flow, "dst2src_bytes", 0))
    features[3] = float(getattr(flow, "protocol", 0))
    features[4] = float(getattr(flow, "src2dst_packets", 0))
    features[5] = float(getattr(flow, "dst2src_packets", 0))
    return features


def extract_csecicids2018_features(flow) -> list:
    """แปลง nfstream flow → CSE-CIC-IDS2018 78 raw features (scale→slice ทำใน predict_flow)

    TODO: implement mapping จาก nfstream attributes ไปยัง CSE-CIC-IDS2018 feature set
    ต้อง map fields เช่น:
    - Flow Duration, Total Fwd Packets, Total Backward Packets
    - Flow Bytes/s, Flow Packets/s
    - Fwd/Bwd Packet Length (Min/Max/Mean/Std)
    - ... (ดู CSE-CIC-IDS2018 feature list, ลำดับต้องตรง feature_cols.json)
    """
    # Placeholder — ต้อง implement ตาม feature mapping ก่อนใช้งานจริง
    features = [0.0] * 78
    features[0] = float(getattr(flow, "bidirectional_duration_ms", 0))
    features[1] = float(getattr(flow, "src2dst_packets", 0))
    features[2] = float(getattr(flow, "dst2src_packets", 0))
    features[3] = float(getattr(flow, "src2dst_bytes", 0))
    features[4] = float(getattr(flow, "dst2src_bytes", 0))
    features[5] = float(getattr(flow, "bidirectional_packets", 0))
    features[6] = float(getattr(flow, "bidirectional_bytes", 0))
    return features


def post_event(model_name: str, attack_class: str, confidence: float, source_ip: str) -> None:
    """ส่ง Prediction Event ไปยัง FastAPI internal endpoint"""
    try:
        requests.post(
            INTERNAL_URL,
            json={
                "model_name": model_name,
                "attack_class": attack_class,
                "confidence": confidence,
                "source_ip": source_ip,
                "timestamp": datetime.now().isoformat(),
            },
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=2,
        )
    except requests.RequestException as e:
        print(f"⚠️ Failed to post event: {e}")


def main():
    """Main loop — capture flows จาก network interface แล้ว predict ทั้ง 2 models"""
    print(f"📡 Starting Network Sensor on interface: {NETWORK_INTERFACE}")

    streamer = nfstream.NFStreamer(
        source=NETWORK_INTERFACE,
        statistical_analysis=True,
    )

    for flow in streamer:
        src_ip = flow.src_ip

        # Chronological windows only — no per-source-IP grouping (CLAUDE.md).
        # Skip prediction until WINDOW_SIZE real flows have accumulated:
        # training dropped incomplete (padded) windows, so the model has
        # never seen a padded input and serving must not synthesize one.
        nsl_window.append(extract_nslkdd_features(flow))
        cic_window.append(extract_csecicids2018_features(flow))

        if len(nsl_window) == WINDOW_SIZE:
            nsl_class, nsl_confidence, _ = predict_intrusion_window(
                model_intrusion, scaler_intrusion, list(nsl_window)
            )
            if nsl_class != "Normal" and nsl_confidence >= THRESHOLD_INTRUSION:
                post_event("intrusion", nsl_class, nsl_confidence, src_ip)
                print(f"🚨 [{src_ip}] Intrusion: {nsl_class} ({nsl_confidence:.1%})")

        if len(cic_window) == WINDOW_SIZE:
            cic_class, cic_confidence, _ = predict_flow_window(
                model_flow, scaler_flow, flow_keep_idx, FLOW_CLASSES, list(cic_window)
            )
            if cic_class != "BENIGN" and cic_confidence >= THRESHOLD_FLOW:
                post_event("flow", cic_class, cic_confidence, src_ip)
                print(f"🚨 [{src_ip}] Flow: {cic_class} ({cic_confidence:.1%})")


if __name__ == "__main__":
    main()
