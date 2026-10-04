"""
CyberShield — Network Sensor (nfstream)

จับ live network flows จาก network interface
แปลงเป็น features สำหรับ 2 models:
  - Intrusion Model (NSL-KDD): 41 features → R2L / U2R
  - Flow Model v2 (CSE-CIC-IDS2018 improved): 43 primitives + 3 source-behaviour → 52 features
    → DoS / DDoS / BruteForce

Flow Model v2: window ต่อ source IP (10 flow ล่าสุดของ IP เดียวกัน) ผ่าน SourceWindowTracker
ใน backend/flow_features.py — ไม่ predict จนกว่า IP นั้นสะสมครบ 10 flows เพราะ training
ทิ้ง incomplete window โมเดลไม่เคยเห็น padding จริง (Intrusion Model ยังใช้ window ตามเวลาล้วน)

NFStreamer ต้องตั้ง statistical_analysis=True, accounting_mode=3 (payload bytes) และ
idle_timeout=120 ให้ตรงกับหน่วย/timeout ของ dataset ตอนเทรน

⚠️ Flow v2: ค่าจาก nfstream กับ CICFlowMeter ยังไม่เคยตรวจเทียบบน traffic จริง (ไม่มี pcap)
ต้องมี Linux VM + root ถึงจะทดสอบ และควรดูผลจริงก่อนเชื่อ threshold
⚠️ Intrusion extractor (extract_nslkdd_features) ยังเป็น placeholder (TODO ด้านล่าง)

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
from backend.rate_rules import RateRuleDetector  # noqa: E402
from backend.flow_features import (  # noqa: E402
    SourceWindowTracker,
    nfstream_flow_meta,
    nfstream_flow_to_primitives,
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
# SimpleRNN (dir-format export) — ตรงกับ backend/main.py; best_nslkdd_smote.keras (LSTM+SMOTE) เก็บไว้เทียบเท่านั้น
model_intrusion = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_nslkdd_SimpleRNN"))
model_flow = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_flow_v2.keras"))
scaler_intrusion = joblib.load(os.path.join(MODELS_DIR, "scaler_nslkdd.pkl"))
_artifacts = load_model_artifacts()
flow_scaler = _artifacts["flow_scaler"]  # (mean, scale) ของ Flow Model v2
FLOW_CLASSES = _artifacts["flow_classes"]
print("✅ Models loaded")

# ===== Sliding Window Buffer =====
# Intrusion: chronological ล้วน (ตาม CLAUDE.md) | Flow v2: ต่อ source IP ผ่าน tracker
nsl_window: deque = deque(maxlen=WINDOW_SIZE)
flow_tracker = SourceWindowTracker(window=WINDOW_SIZE)
# กฎอัตรา flow (ไม่ใช่ model) — จับ DoS/DDoS/BruteForce ที่ LSTM พลาดเพราะไม่เคยเห็นเครื่องมือนั้น
rate_rules = RateRuleDetector()


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


# Flow Model v2 ไม่ใช้ extractor แยกในไฟล์นี้อีกแล้ว: nfstream_flow_to_primitives() /
# nfstream_flow_meta() / SourceWindowTracker อยู่ใน backend/flow_features.py ร่วมกับ train script
# (parity test: tracker ตรงกับ pipeline ตอนเทรนบน 587k window — ต่างแค่ float rounding ของ gap ≤ 3e-4)


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
        print(f"⚠️ ไม่สามารถส่ง event ไป FastAPI: {e}")


def main():
    """Main loop — capture flows จาก network interface แล้ว predict ทั้ง 2 models"""
    print(f"📡 Starting Network Sensor on interface: {NETWORK_INTERFACE}")

    streamer = nfstream.NFStreamer(
        source=NETWORK_INTERFACE,
        statistical_analysis=True,
        accounting_mode=3,   # payload bytes — ตรงกับขนาด packet ของ CICFlowMeter ตอนเทรน Flow v2
        idle_timeout=120,    # 120s ตรงกับ flow timeout ของ dataset
    )

    for flow in streamer:
        src_ip = flow.src_ip

        # Intrusion: เรียงตามเวลาล้วน ไม่ predict จนกว่าจะสะสมครบ WINDOW_SIZE flows จริงๆ
        # (training ทิ้ง window ที่ไม่ครบ — ฝั่ง serving ต้องไม่สร้าง padding เอง)
        nsl_window.append(extract_nslkdd_features(flow))

        if len(nsl_window) == WINDOW_SIZE:
            nsl_class, nsl_confidence, _ = predict_intrusion_window(
                model_intrusion, scaler_intrusion, list(nsl_window)
            )
            if nsl_class != "Normal" and nsl_confidence >= THRESHOLD_INTRUSION:
                post_event("intrusion", nsl_class, nsl_confidence, src_ip)
                print(f"🚨 [{src_ip}] Intrusion: {nsl_class} ({nsl_confidence:.1%})")

        # Rate rules: นับอัตรา flow ต่อ src/dst — ใช้เวลาจบ flow จาก nfstream (วินาที)
        for alert in rate_rules.observe(
            float(flow.bidirectional_last_seen_ms) / 1000.0, src_ip, flow.dst_ip, int(flow.dst_port)
        ):
            post_event("flow_rules", alert.attack_class, 1.0, alert.source_ip)
            print(f"🚨 [{alert.source_ip}] Rate rule: {alert.attack_class} ({alert.detail})")

        # Flow v2: window ต่อ source IP — tracker คืน None จนกว่า IP นี้จะมีครบ 10 flow
        _, start_ms, dst_ip, dst_port = nfstream_flow_meta(flow)
        flow_window = flow_tracker.push(
            src_ip, nfstream_flow_to_primitives(flow), start_ms, dst_ip, dst_port
        )
        if flow_window is not None:
            cic_class, cic_confidence, _ = predict_flow_window(
                model_flow, flow_scaler, FLOW_CLASSES, flow_window
            )
            if cic_class != "BENIGN" and cic_confidence >= THRESHOLD_FLOW:
                post_event("flow", cic_class, cic_confidence, src_ip)
                print(f"🚨 [{src_ip}] Flow: {cic_class} ({cic_confidence:.1%})")


if __name__ == "__main__":
    main()
