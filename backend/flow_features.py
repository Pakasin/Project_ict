"""
CyberShield — Flow Model v2 feature definition (single source of truth)

ใช้ร่วมกันระหว่างตอนเทรน (Kaggle train kernel) กับ network_sensor.py ตอน serve
ฟังก์ชัน engineer() ต้องเหมือนใน train script ทุกตัวอักษร — แก้ที่เดียวแล้วแก้ทั้งสองฝั่ง

ต่างจาก v1 (78/71 feature, window chronological ทั้งเครือข่าย):
  - ใช้เฉพาะ primitive ที่ nfstream คำนวณได้จริง (43 ตัว) + derived 6 ตัว
    + พฤติกรรมของ source 3 ตัว (ช่วงห่างจาก flow ก่อนหน้า, dst IP/port เดิม) = 52 feature
  - window ต่อ source IP (10 flow ล่าสุดของ IP เดียวกัน) ไม่เติม padding
    flow ที่ IP ใหม่ยังสะสมไม่ครบ 10 → ยังไม่ predict (ตรงกับตอนเทรนที่ทิ้ง incomplete window)

หน่วยที่ตกลงกัน (ต้องตั้ง NFStreamer ให้ตรง):
  - เวลา/IAT เป็น microseconds   (nfstream ให้ ms → คูณ 1000)
  - ขนาด packet เป็น payload bytes → NFStreamer(accounting_mode=3)
  - flow timeout 120s → NFStreamer(idle_timeout=120) ตรงกับ dataset

ข้อจำกัดที่ยังพิสูจน์ไม่ได้ (ไม่มี pcap): ค่าจาก nfstream กับ CICFlowMeter อาจต่างกันเล็กน้อย
log1p + scaler ช่วยลดผลกระทบ แต่ต้องทดสอบกับ traffic จริงก่อนเชื่อ threshold
"""

from collections import OrderedDict, deque

import numpy as np

WINDOW_SIZE = 10
SCALE_CLIP = 6.0

# ลำดับนี้คือลำดับคอลัมน์ใน prims.npy ตอนเทรน — สลับไม่ได้
PRIM_COLS = [
    "Flow Duration",
    "Total Fwd Packet", "Total Bwd packets", "Total Length of Fwd Packet", "Total Length of Bwd Packet",
    "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Mean", "Fwd Packet Length Std",
    "Bwd Packet Length Max", "Bwd Packet Length Min", "Bwd Packet Length Mean", "Bwd Packet Length Std",
    "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max", "Flow IAT Min",
    "Fwd IAT Mean", "Fwd IAT Std", "Fwd IAT Max", "Fwd IAT Min",
    "Bwd IAT Mean", "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min",
    "Fwd PSH Flags", "Bwd PSH Flags", "Fwd URG Flags", "Bwd URG Flags", "Fwd RST Flags", "Bwd RST Flags",
    "Packet Length Min", "Packet Length Max", "Packet Length Mean", "Packet Length Std",
    "FIN Flag Count", "SYN Flag Count", "RST Flag Count", "PSH Flag Count", "ACK Flag Count",
    "URG Flag Count", "CWR Flag Count", "ECE Flag Count",
]
DERIVED_COLS = ["bytes_per_s", "pkts_per_s", "fwd_pkts_per_s", "bwd_pkts_per_s", "bwd_fwd_pkt_ratio", "bytes_per_pkt"]
BEHAVIOUR_COLS = ["gap_log1p_ms", "same_dst_ip_as_prev", "same_dst_port_as_prev"]
FEATURE_NAMES = PRIM_COLS + DERIVED_COLS + BEHAVIOUR_COLS  # 52
N_FEATURES = len(FEATURE_NAMES)

# nfstream attribute ต่อ primitive แต่ละตัว (ตามลำดับ PRIM_COLS) พร้อมตัวคูณหน่วย
_NF_MAP = [
    ("bidirectional_duration_ms", 1000.0),
    ("src2dst_packets", 1.0), ("dst2src_packets", 1.0), ("src2dst_bytes", 1.0), ("dst2src_bytes", 1.0),
    ("src2dst_max_ps", 1.0), ("src2dst_min_ps", 1.0), ("src2dst_mean_ps", 1.0), ("src2dst_stddev_ps", 1.0),
    ("dst2src_max_ps", 1.0), ("dst2src_min_ps", 1.0), ("dst2src_mean_ps", 1.0), ("dst2src_stddev_ps", 1.0),
    ("bidirectional_mean_piat_ms", 1000.0), ("bidirectional_stddev_piat_ms", 1000.0),
    ("bidirectional_max_piat_ms", 1000.0), ("bidirectional_min_piat_ms", 1000.0),
    ("src2dst_mean_piat_ms", 1000.0), ("src2dst_stddev_piat_ms", 1000.0),
    ("src2dst_max_piat_ms", 1000.0), ("src2dst_min_piat_ms", 1000.0),
    ("dst2src_mean_piat_ms", 1000.0), ("dst2src_stddev_piat_ms", 1000.0),
    ("dst2src_max_piat_ms", 1000.0), ("dst2src_min_piat_ms", 1000.0),
    ("src2dst_psh_packets", 1.0), ("dst2src_psh_packets", 1.0),
    ("src2dst_urg_packets", 1.0), ("dst2src_urg_packets", 1.0),
    ("src2dst_rst_packets", 1.0), ("dst2src_rst_packets", 1.0),
    ("bidirectional_min_ps", 1.0), ("bidirectional_max_ps", 1.0),
    ("bidirectional_mean_ps", 1.0), ("bidirectional_stddev_ps", 1.0),
    ("bidirectional_fin_packets", 1.0), ("bidirectional_syn_packets", 1.0),
    ("bidirectional_rst_packets", 1.0), ("bidirectional_psh_packets", 1.0),
    ("bidirectional_ack_packets", 1.0), ("bidirectional_urg_packets", 1.0),
    ("bidirectional_cwr_packets", 1.0), ("bidirectional_ece_packets", 1.0),
]
assert len(_NF_MAP) == len(PRIM_COLS)


def nfstream_flow_to_primitives(flow) -> list:
    """nfstream NFlow → 43 primitive ตามลำดับ PRIM_COLS (ต้องสร้าง NFStreamer ด้วย
    statistical_analysis=True, accounting_mode=3, idle_timeout=120)"""
    return [float(getattr(flow, attr, 0) or 0) * mult for attr, mult in _NF_MAP]


def nfstream_flow_meta(flow):
    """(src_ip, start_ms, dst_ip, dst_port) จาก NFlow สำหรับ SourceWindowTracker.push()"""
    return flow.src_ip, float(flow.bidirectional_first_seen_ms), flow.dst_ip, int(flow.dst_port)


def engineer(P) -> np.ndarray:
    """(n, 43) primitives → (n, 49) log1p features. ต้องตรงกับ engineer() ใน train2.py"""
    P = np.maximum(np.asarray(P, dtype=np.float64), 0.0)
    c = {n: i for i, n in enumerate(PRIM_COLS)}
    dur_s = np.maximum(P[:, c["Flow Duration"]], 1.0) / 1e6
    fp, bp = P[:, c["Total Fwd Packet"]], P[:, c["Total Bwd packets"]]
    fb, bb = P[:, c["Total Length of Fwd Packet"]], P[:, c["Total Length of Bwd Packet"]]
    tp, tb = fp + bp, fb + bb
    derived = np.stack([tb / dur_s, tp / dur_s, fp / dur_s, bp / dur_s,
                        bp / np.maximum(fp, 1.0), tb / np.maximum(tp, 1.0)], 1)
    return np.log1p(np.concatenate([P, derived], 1)).astype(np.float32)


def behaviour_features(prev, start_ms: float, dst_ip, dst_port) -> list:
    """3 ค่าเทียบกับ flow ก่อนหน้าของ source เดียวกัน (prev = (start_ms, dst_ip, dst_port) หรือ None)
    flow แรกของ source → [0, 0, 0] ตรงกับตอนเทรน"""
    if prev is None:
        return [0.0, 0.0, 0.0]
    gap_ms = max(0.0, float(start_ms) - float(prev[0]))
    return [float(np.log1p(gap_ms)), float(dst_ip == prev[1]), float(dst_port == prev[2])]


class SourceWindowTracker:
    """เก็บ flow ล่าสุด 10 อันต่อ source IP — ตรงกับกติกา window ตอนเทรน

    push() คืน window (10, 52) ที่ engineer แล้ว (ยังไม่ scale) เมื่อ IP นั้นสะสมครบ 10 flow
    ถ้ายังไม่ครบคืน None (ห้าม pad — โมเดลไม่เคยเห็น padding)
    ลำดับที่ป้อนต้องเป็นลำดับที่ nfstream ปล่อย flow (ตามเวลาจบ flow) ซึ่งตรงกับตอนเทรน
    IP เก่าสุดถูกไล่ออกเมื่อเกิน max_sources เพื่อกัน memory โตไม่จำกัด
    """

    def __init__(self, window=WINDOW_SIZE, max_sources=50_000):
        self.window = int(window)
        self.max_sources = int(max_sources)
        self._buf: "OrderedDict[str, deque]" = OrderedDict()
        self._last: dict = {}

    def push(self, src_ip: str, primitives, start_ms: float, dst_ip, dst_port):
        base = engineer(np.asarray(primitives, dtype=np.float64).reshape(1, -1))[0]
        row = np.concatenate([base, np.asarray(behaviour_features(self._last.get(src_ip), start_ms, dst_ip, dst_port),
                                               dtype=np.float32)])
        d = self._buf.get(src_ip)
        if d is None:
            if len(self._buf) >= self.max_sources:
                old, _ = self._buf.popitem(last=False)
                self._last.pop(old, None)
            d = self._buf[src_ip] = deque(maxlen=self.window)
        else:
            self._buf.move_to_end(src_ip)
        d.append(row)
        self._last[src_ip] = (start_ms, dst_ip, dst_port)
        return np.stack(d) if len(d) == self.window else None


def load_scaler(path):
    """flow_v2_scaler.json → (mean, scale) float32 — ไม่พึ่ง pickle ของ sklearn"""
    import json
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return np.asarray(d["mean"], dtype=np.float32), np.asarray(d["scale"], dtype=np.float32)


def scale_window(window: np.ndarray, mean: np.ndarray, scale: np.ndarray) -> np.ndarray:
    """(10, 52) → (1, 10, 52) scale ด้วย mean/scale ของ v2 แล้ว clip ±6 เหมือนตอนเทรน"""
    z = np.clip((window - mean) / scale, -SCALE_CLIP, SCALE_CLIP)
    return z.astype(np.float32)[np.newaxis]


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    P = rng.integers(0, 5000, size=(5, len(PRIM_COLS))).astype(float)
    E = engineer(P)
    assert E.shape == (5, 49), E.shape
    assert np.isfinite(E).all()

    class _Flow:  # stand-in for an NFlow
        src_ip, dst_ip, dst_port, bidirectional_first_seen_ms = "10.0.0.1", "10.0.0.9", 80, 1000.0

        def __getattr__(self, name):
            return 1.0

    fl = _Flow()
    prim = nfstream_flow_to_primitives(fl)
    assert len(prim) == len(PRIM_COLS) and N_FEATURES == 52

    tr = SourceWindowTracker()
    out = [tr.push("10.0.0.1", prim, 1000.0 + 10 * i, "10.0.0.9", 80) for i in range(WINDOW_SIZE)]
    assert all(o is None for o in out[:-1]) and out[-1].shape == (WINDOW_SIZE, 52)
    w = out[-1]
    assert list(w[0, -3:]) == [0, 0, 0]                              # first flow of a source
    assert abs(w[1, -3] - np.log1p(10.0)) < 1e-5 and w[1, -2] == 1 and w[1, -1] == 1
    assert tr.push("10.0.0.2", prim, 5000.0, "10.0.0.9", 80) is None  # another source starts empty
    assert behaviour_features((100.0, "a", 1), 90.0, "b", 2) == [0.0, 0.0, 0.0]  # out-of-order start clipped to gap 0
    print("[OK] flow_features self-test passed:", E.shape, w.shape)
