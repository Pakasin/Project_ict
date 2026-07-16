"""
CyberShield — Network Sensor (nfstream)

จับ live network flows จาก network interface
แปลงเป็น features สำหรับ 2 models:
  - Intrusion Model (UNSW-NB15): 49 features → R2L / U2R
  - Flow Model (CSE-CIC-IDS2018): 78 features → DDoS / DoS / PortScan / BruteForce

ใช้ Sliding Window (group by source IP, window=10, zero-pad ด้านหน้า)

⚠️ ต้องรันเป็น root (raw socket access):
    sudo python backend/sensors/network_sensor.py
"""

import nfstream
import numpy as np
import joblib
import requests
import os
import tensorflow as tf
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ===== Configuration =====
WINDOW_SIZE = 10
INTERNAL_URL = "http://localhost:8000/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
NETWORK_INTERFACE = os.getenv("NETWORK_INTERFACE", "eth0")
THRESHOLD_INTRUSION = float(os.getenv("THRESHOLD_INTRUSION", "0.85"))
THRESHOLD_FLOW = float(os.getenv("THRESHOLD_FLOW", "0.80"))

# ===== โหลด Models + Scalers =====
print("📡 Loading models and scalers...")
model_intrusion = tf.keras.models.load_model("backend/models/lstm_unswnb15.h5")
model_flow = tf.keras.models.load_model("backend/models/lstm_csecicids2018.h5")
scaler_intrusion = joblib.load("backend/models/scaler_unswnb15.pkl")
scaler_flow = joblib.load("backend/models/scaler_csecicids2018.pkl")
print("✅ Models loaded")

# ===== Sliding Window Buffer =====
# group by source IP — attack patterns จาก IP เดียวกันจะถูกตรวจจับได้
windows: dict[str, list] = defaultdict(list)

# UNSW-NB15 class labels
INTRUSION_CLASSES = ["Normal", "R2L", "U2R"]
# CSE-CIC-IDS2018 class labels
FLOW_CLASSES = ["BENIGN", "DoS", "DDoS", "PortScan", "BruteForce"]


def extract_unswnb15_features(flow) -> list:
    """แปลง nfstream flow → UNSW-NB15 49 features

    TODO: implement mapping จาก nfstream attributes ไปยัง UNSW-NB15 feature set
    ต้อง map fields เช่น:
    - duration, protocol_type, service, flag
    - src_bytes, dst_bytes, land, wrong_fragment
    - urgent, hot, num_failed_logins, logged_in
    - ... (ดู UNSW-NB15 feature list)
    """
    # Placeholder — ต้อง implement ตาม feature mapping
    features = [0.0] * 41
    features[0] = float(getattr(flow, "bidirectional_duration_ms", 0))
    features[1] = float(getattr(flow, "src2dst_bytes", 0))
    features[2] = float(getattr(flow, "dst2src_bytes", 0))
    features[3] = float(getattr(flow, "protocol", 0))
    features[4] = float(getattr(flow, "src2dst_packets", 0))
    features[5] = float(getattr(flow, "dst2src_packets", 0))
    return features


def extract_csecicids2018_features(flow) -> list:
    """แปลง nfstream flow → CSE-CIC-IDS2018 78 features

    TODO: implement mapping จาก nfstream attributes ไปยัง CSE-CIC-IDS2018 feature set
    ต้อง map fields เช่น:
    - Flow Duration, Total Fwd Packets, Total Backward Packets
    - Flow Bytes/s, Flow Packets/s
    - Fwd/Bwd Packet Length (Min/Max/Mean/Std)
    - ... (ดู CSE-CIC-IDS2018 feature list)
    """
    # Placeholder — ต้อง implement ตาม feature mapping
    features = [0.0] * 78
    features[0] = float(getattr(flow, "bidirectional_duration_ms", 0))
    features[1] = float(getattr(flow, "src2dst_packets", 0))
    features[2] = float(getattr(flow, "dst2src_packets", 0))
    features[3] = float(getattr(flow, "src2dst_bytes", 0))
    features[4] = float(getattr(flow, "dst2src_bytes", 0))
    features[5] = float(getattr(flow, "bidirectional_packets", 0))
    features[6] = float(getattr(flow, "bidirectional_bytes", 0))
    return features


def make_padded_window(features_list: list, feature_len: int) -> np.ndarray:
    """สร้าง Sliding Window พร้อม zero-pad ด้านหน้า

    Windows สั้นกว่า 10 flows (เช่น IP ใหม่) จะถูก zero-pad
    ซึ่งตรงกับ training data ที่ train กับ padded samples
    """
    window = features_list[-WINDOW_SIZE:]
    pad_count = WINDOW_SIZE - len(window)
    padded = [[0.0] * feature_len] * pad_count + window
    return np.array(padded).reshape(1, WINDOW_SIZE, feature_len)


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

        # === Intrusion Model (UNSW-NB15: R2L / U2R) ===
        nsl_features = extract_unswnb15_features(flow)
        windows[f"nsl_{src_ip}"].append(nsl_features)

        X_nsl = make_padded_window(windows[f"nsl_{src_ip}"], 41)
        X_nsl_scaled = scaler_intrusion.transform(
            X_nsl.reshape(-1, 41)
        ).reshape(1, 10, 41)

        nsl_probs = model_intrusion.predict(X_nsl_scaled, verbose=0)[0]
        nsl_pred_idx = int(np.argmax(nsl_probs))
        nsl_confidence = float(nsl_probs[nsl_pred_idx])
        nsl_class = INTRUSION_CLASSES[nsl_pred_idx]

        # ส่ง event ถ้า confidence >= threshold หรือไม่ใช่ Normal
        if nsl_class != "Normal" and nsl_confidence >= THRESHOLD_INTRUSION:
            post_event("intrusion", nsl_class, nsl_confidence, src_ip)
            print(f"🚨 [{src_ip}] Intrusion: {nsl_class} ({nsl_confidence:.1%})")

        # === Flow Model (CSE-CIC-IDS2018: DDoS / DoS / PortScan / BruteForce) ===
        csecic_features = extract_csecicids2018_features(flow)
        windows[f"cic_{src_ip}"].append(csecic_features)

        X_cic = make_padded_window(windows[f"cic_{src_ip}"], 78)
        X_cic_scaled = scaler_flow.transform(
            X_cic.reshape(-1, 78)
        ).reshape(1, 10, 78)

        cic_probs = model_flow.predict(X_cic_scaled, verbose=0)[0]
        cic_pred_idx = int(np.argmax(cic_probs))
        cic_confidence = float(cic_probs[cic_pred_idx])
        cic_class = FLOW_CLASSES[cic_pred_idx]

        if cic_class != "BENIGN" and cic_confidence >= THRESHOLD_FLOW:
            post_event("flow", cic_class, cic_confidence, src_ip)
            print(f"🚨 [{src_ip}] Flow: {cic_class} ({cic_confidence:.1%})")

        # จำกัดขนาด window buffer ไม่ให้ใช้ memory มากเกินไป
        for key in list(windows.keys()):
            if len(windows[key]) > WINDOW_SIZE * 2:
                windows[key] = windows[key][-WINDOW_SIZE:]


if __name__ == "__main__":
    main()
