"""
CyberShield — build_windows: CSV จาก flow_recorder.py → window (10, 52) + วัดผล Flow v2 / rate rules

ใช้ SourceWindowTracker ตัวเดียวกับ network_sensor.py (backend/flow_features.py) เพื่อให้ window
ตรงกับที่ serve จริง: ต่อ source IP, ไม่ pad, flow ตามลำดับที่ nfstream ปล่อย (ห้าม sort)
แต่ละไฟล์ใช้ tracker ใหม่ — window ไม่ข้ามไฟล์/การจับคนละรอบ

    python -m backend.build_windows data/captures/*.csv --out data/windows.npz
    python -m backend.build_windows data/captures/*.csv --evaluate

--evaluate: รัน Flow v2 (best_flow_v2.keras) + rate rules กับข้อมูลที่จับมา รายงานต่อ tool:
  จำนวน window, สัดส่วนที่โมเดลแจ้งถูก class, แจ้งเป็น attack class ใดก็ได้, และ rate rule ทริกเกอร์ไหม
  BENIGN รายงาน false alarm — เลข "ตรวจจับได้ตามต้องการ" ต้องดูคู่กับ false alarm เสมอ

หมายเหตุ: label ติดต่อ source (--attacker ของ recorder) ทุก window ของ source นั้นจึง label เดียวกัน
source ที่มี flow < 10 ไม่ได้ window (ตรงกับ serving) — ถูกนับแยกใน "no_window" เพราะนั่นคือ
การโจมตีที่โมเดลไม่มีทางเห็นเลย ไม่ควรถูกซ่อนไว้ในตัวเลข recall
"""

import argparse
import csv
import glob
import os
import sys
from collections import defaultdict

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.flow_features import (  # noqa: E402
    N_FEATURES, PRIM_COLS, WINDOW_SIZE, SourceWindowTracker, scale_window,
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


def read_rows(path):
    """yield (meta dict, primitives list, tool, label) ตามลำดับในไฟล์"""
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            yield r, [float(r[c]) for c in PRIM_COLS], r["tool"], r["label"]


def build(paths):
    """คืน dict: X (n,10,52) float32, y, tool, src (array ของ str) + stats ต่อ (tool,label)"""
    X, y, tool, src = [], [], [], []
    flows = defaultdict(int)                       # (tool,label) → จำนวน flow
    per_src = defaultdict(lambda: defaultdict(int))  # (tool,label) → src → flow count
    rate_hits = defaultdict(lambda: defaultdict(int))  # (tool,label) → attack_class → alerts
    from backend.rate_rules import RateRuleDetector

    for p in paths:
        tr, rr = SourceWindowTracker(window=WINDOW_SIZE), RateRuleDetector()
        for r, prims, tl, lb in read_rows(p):
            key = (tl, lb)
            flows[key] += 1
            per_src[key][(p, r["src_ip"])] += 1  # ต่อไฟล์: window ไม่ข้ามไฟล์ no_win ต้องนับต่อไฟล์ด้วย
            for a in rr.observe(float(r["end_ms"]) / 1000.0, r["src_ip"], r["dst_ip"], int(r["dst_port"])):
                rate_hits[key][a.attack_class] += 1
            w = tr.push(r["src_ip"], prims, float(r["start_ms"]), r["dst_ip"], int(r["dst_port"]))
            if w is not None:
                X.append(w)
                y.append(lb)
                tool.append(tl)
                src.append(r["src_ip"])
    out = {
        "X": np.stack(X).astype(np.float32) if X else np.zeros((0, WINDOW_SIZE, N_FEATURES), np.float32),
        "y": np.array(y), "tool": np.array(tool), "src": np.array(src),
    }
    return out, flows, per_src, rate_hits


def evaluate(data, flows, per_src, rate_hits):
    import tensorflow as tf  # ก่อน pandas/pyarrow (กัน segfault บน Windows) — ที่นี่ไม่ใช้ pandas
    import json
    from backend.flow_features import load_scaler

    model = tf.keras.models.load_model(os.path.join(MODELS_DIR, "best_flow_v2.keras"))
    mean, scale = load_scaler(os.path.join(MODELS_DIR, "flow_v2_scaler.json"))
    with open(os.path.join(MODELS_DIR, "flow_v2_metadata.json"), encoding="utf-8") as f:
        meta = json.load(f)
    classes, thr = meta["classes"], float(meta["threshold_default"])

    pred_cls, pred_conf = [], []
    if len(data["X"]):
        # scale_window คืน (1,10,52) — ต่อ batch เอง ใช้สูตรเดียวกับ serving (scale → clip ±6)
        Z = np.concatenate([scale_window(w, mean, scale) for w in data["X"]])
        probs = model.predict(Z, batch_size=1024, verbose=0)
        pred_cls = np.array(classes)[probs.argmax(1)]
        pred_conf = probs.max(1)
    alert = np.array([c != "BENIGN" and p >= thr for c, p in zip(pred_cls, pred_conf)], dtype=bool)

    print(f"\nFlow v2 threshold = {thr}   (window = 10 flows ต่อ source)\n")
    print(f"{'tool':<16}{'label':<11}{'flows':>7}{'srcs':>6}{'no_win':>7}{'windows':>8}"
          f"{'correct':>9}{'any_atk':>9}  rate_rules")
    for (tl, lb) in sorted(flows):
        m = (data["tool"] == tl) & (data["y"] == lb) if len(data["y"]) else np.zeros(0, bool)
        n = int(m.sum())
        srcs = per_src[(tl, lb)]
        no_win = sum(1 for c in srcs.values() if c < WINDOW_SIZE)
        if n:
            correct = float(((pred_cls[m] == lb) & alert[m]).mean())
            anyatk = float(alert[m].mean())
            cs, as_ = f"{correct:.3f}", f"{anyatk:.3f}"
        else:
            cs = as_ = "  n/a"
        hits = dict(rate_hits[(tl, lb)])
        print(f"{tl:<16}{lb:<11}{flows[(tl, lb)]:>7}{len(srcs):>6}{no_win:>7}{n:>8}{cs:>9}{as_:>9}  {hits or '-'}")
    print("\ncorrect = แจ้งถูก class (≥ threshold) | any_atk = แจ้ง attack class ใดก็ได้ | "
          "BENIGN: any_atk คือ false alarm rate\n"
          "no_win = source ที่มี flow < 10 (โมเดลไม่เห็นเลย) | rate_rules = จำนวน alert ที่กฎอัตราทริกเกอร์")


def _selftest():
    import tempfile
    rng = np.random.default_rng(1)

    def row(src, i, tool, label):
        prims = rng.integers(1, 1000, len(PRIM_COLS)).astype(float)
        return [src, "10.0.0.9", 80, 1000.0 + i * 10, 1000.0 + i * 10 + 5] + list(prims) + [tool, label]

    with tempfile.TemporaryDirectory() as d:
        paths = []
        for k in range(2):  # 2 ไฟล์: window ต้องไม่ข้ามไฟล์
            p = os.path.join(d, f"t{k}.csv")
            with open(p, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["src_ip", "dst_ip", "dst_port", "start_ms", "end_ms"] + PRIM_COLS + ["tool", "label"])
                for i in range(12):
                    w.writerow(row("1.1.1.1", i, "toolA", "DoS"))   # 12 flow → 3 window ต่อไฟล์
                for i in range(5):
                    w.writerow(row("2.2.2.2", i, "toolA", "BENIGN"))  # 5 flow → ไม่มี window
            paths.append(p)
        data, flows, per_src, _ = build(paths)
    assert data["X"].shape == (6, WINDOW_SIZE, N_FEATURES), data["X"].shape
    assert set(data["y"]) == {"DoS"} and set(data["src"]) == {"1.1.1.1"}
    assert flows[("toolA", "BENIGN")] == 10
    assert sorted(per_src[("toolA", "BENIGN")].values()) == [5, 5]  # 5+5 แยกไฟล์ → นับแยก ไม่รวมเป็น 10
    print("[OK] build_windows self-test passed")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="*", help="ไฟล์ CSV จาก flow_recorder.py (รับ glob)")
    ap.add_argument("--out", help="เขียน window เป็น .npz (X, y, tool, src — X ยังไม่ scale)")
    ap.add_argument("--evaluate", action="store_true", help="วัดผล Flow v2 + rate rules บนข้อมูลที่จับมา")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        return _selftest()
    paths = sorted({p for pat in a.csv for p in glob.glob(pat)})
    if not paths:
        sys.exit("ไม่พบไฟล์ CSV")
    data, flows, per_src, rate_hits = build(paths)
    print(f"{len(paths)} ไฟล์ → {len(data['X'])} window  shape={data['X'].shape}")
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        np.savez_compressed(a.out, **data)
        print(f"saved {a.out}")
    if a.evaluate:
        evaluate(data, flows, per_src, rate_hits)


if __name__ == "__main__":
    main()
