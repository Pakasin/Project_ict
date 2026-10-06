"""
Train nfstream-native Flow model on CIC-IDS2017-via-nfstream (Kaggle: anfalahmedkhan3/
cicids2017-dataset-using-nfstream, 1.85M flows, same engine as our sensor). Map its raw
nfstream columns -> our 43 PRIM_COLS via _NF_MAP, engineer -> 52, per-source windows, fit a
NEW scaler, class-weighted train. Eval: (a) held-out CIC test, (b) OUR own lab captures
(real serve config, accounting_mode=3) = the honest cross-distribution check.

  PY312 train_cicids.py [--save]
"""
import os, sys, csv, glob, json, argparse
import numpy as np
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
REPO = r"C:\Users\teent\Documents\ProjectCyberSecurity"
CIC = r"C:\Users\teent\AppData\Local\Temp\claude\C--Users-teent-Documents-ProjectCyberSecurity\111eaace-b56b-480a-b19c-c4abb31ef62d\scratchpad\cicnf\combined_dataset_Nfstream.csv"
sys.path.insert(0, REPO)
import tensorflow as tf
from backend.flow_features import _NF_MAP, PRIM_COLS, engineer, N_FEATURES, WINDOW_SIZE, SCALE_CLIP
from backend.build_windows import build as build_lab

CLASSES = ["BENIGN", "DoS", "DDoS", "BruteForce"]
CIDX = {c: i for i, c in enumerate(CLASSES)}
LABEL_MAP = {"BENIGN": "BENIGN", "DDoS": "DDoS", "DoS Hulk": "DoS",
             "FTP-Patator": "BruteForce", "SSH-Patator": "BruteForce"}  # skip PortScan/Bot/Web-BF
CAP = {"BENIGN": 30000, "DDoS": 30000, "DoS": 100000, "BruteForce": 100000}  # windows per class
SEED = 11
NF_ATTRS = [a for a, _ in _NF_MAP]; NF_MULT = np.array([m for _, m in _NF_MAP])

def behaviour(prev_start, start, prev_dst, dst, prev_pt, pt):
    gap = 0.0 if prev_start is None else max(0.0, start - prev_start)
    return [float(np.log1p(gap)),
            0.0 if prev_dst is None else float(dst == prev_dst),
            0.0 if prev_pt is None else float(pt == prev_pt)]

def load_cic():
    """stream CSV -> per (class) windows (10,52), capped. Returns X,y,tool(='cic')."""
    # group rows per src_ip (keep raw prims + meta), then window per source
    from collections import defaultdict
    rows = defaultdict(list)  # src_ip -> list[(last_ms, start_ms, dst_ip, dst_port, prims[43], cls)]
    with open(CIC, newline="", encoding="utf-8", errors="replace") as fh:
        r = csv.DictReader(fh)
        for row in r:
            cls = LABEL_MAP.get(row["label"])
            if cls is None:
                continue
            prims = [float(row.get(a, 0) or 0) for a in NF_ATTRS]
            rows[row["src_ip"]].append((
                float(row["bidirectional_last_seen_ms"]), float(row["bidirectional_first_seen_ms"]),
                row["dst_ip"], int(float(row["dst_port"])), prims, cls))
    rng = np.random.default_rng(SEED)
    buckets = {c: [] for c in CLASSES}
    for src, lst in rows.items():
        lst.sort(key=lambda t: t[0])  # emission (flow-end) order within source
        P = (np.array([t[4] for t in lst], float) * NF_MULT)   # (k,43) prims, unit-scaled
        E = engineer(P)                                        # (k,49)
        prev_s = prev_d = prev_p = None
        feats = np.empty((len(lst), N_FEATURES), np.float32)
        for i, t in enumerate(lst):
            b = behaviour(prev_s, t[1], prev_d, t[2], prev_p, t[3])
            feats[i] = np.concatenate([E[i], b])
            prev_s, prev_d, prev_p = t[1], t[2], t[3]
        for i in range(WINDOW_SIZE - 1, len(lst)):
            cls = lst[i][5]  # window labelled by its last flow
            if len(buckets[cls]) < CAP[cls] * 3:  # over-collect, subsample later
                buckets[cls].append(feats[i - WINDOW_SIZE + 1:i + 1].copy())
    X, y = [], []
    for c in CLASSES:
        arr = buckets[c]
        if len(arr) > CAP[c]:
            idx = rng.choice(len(arr), CAP[c], replace=False); arr = [arr[j] for j in idx]
        X += arr; y += [c] * len(arr)
    X = np.stack(X).astype(np.float32); y = np.array(y)
    return X, y

def load_lab():
    paths = [p for p in sorted(glob.glob(os.path.join(REPO, "data", "captures", "*.csv")))
             if not any(s in os.path.basename(p) for s in ("labtest", "smoketest", "watchdogtest"))]
    d, *_ = build_lab(paths)
    return d["X"], d["y"], d["tool"]

def fit_scaler(X):
    f = X.reshape(-1, N_FEATURES); m = f.mean(0); s = f.std(0); s[s == 0] = 1
    return m.astype(np.float32), s.astype(np.float32)
def scale(X, m, s): return np.clip((X - m) / s, -SCALE_CLIP, SCALE_CLIP).astype(np.float32)
def yint(y): return np.array([CIDX[c] for c in y], np.int32)
def cw(y):
    yi = yint(y); n = len(yi); k = len(CLASSES)
    return {c: (n / (k * (yi == c).sum()) if (yi == c).sum() else 0.0) for c in range(k)}
def model():
    reg = tf.keras.regularizers.l2(1e-4)
    m = tf.keras.Sequential([tf.keras.layers.Input((WINDOW_SIZE, N_FEATURES)),
        tf.keras.layers.GaussianNoise(0.15), tf.keras.layers.LSTM(48, dropout=0.1, kernel_regularizer=reg),
        tf.keras.layers.Dropout(0.3), tf.keras.layers.Dense(len(CLASSES), activation="softmax")])
    m.compile("adam", "sparse_categorical_crossentropy", metrics=["accuracy"]); return m
def pred(m, Z): return np.array(CLASSES)[m.predict(Z, batch_size=2048, verbose=0).argmax(1)]
def report(tag, yt, yp, tool=None):
    print(f"\n--- {tag} ---")
    for c in CLASSES:
        mk = yt == c
        if mk.sum(): print(f"  {c:<11} recall {(yp[mk]==c).mean():.3f}  (n={mk.sum()})")
    mb = yt == "BENIGN"
    if mb.sum(): print(f"  BENIGN false-alarm {(yp[mb]!='BENIGN').mean():.3f}")
    if tool is not None:
        for t in sorted(np.unique(tool)):
            mk = tool == t; print(f"    {t:<17}{yt[mk][0]:<11} {(yp[mk]==yt[mk][0]).mean():.3f} (n={mk.sum()})")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--save", action="store_true"); a = ap.parse_args()
    print("loading CIC-IDS2017 nfstream windows ...", flush=True)
    X, y = load_cic()
    print(f"CIC windows={len(X)}  " + ", ".join(f"{c}:{(y==c).sum()}" for c in CLASSES), flush=True)
    rng = np.random.default_rng(SEED); idx = rng.permutation(len(X)); X, y = X[idx], y[idx]
    ntr = int(.8 * len(X)); Xtr, ytr, Xte, yte = X[:ntr], y[:ntr], X[ntr:], y[ntr:]
    m, s = fit_scaler(Xtr)
    net = model()
    es = tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True)
    net.fit(scale(Xtr, m, s), yint(ytr), validation_split=0.15, epochs=30, batch_size=512,
            class_weight=cw(ytr), callbacks=[es], verbose=0)
    report("CIC-IDS2017 held-out test (seen)", yte, pred(net, scale(Xte, m, s)))

    # cross-distribution: evaluate on OUR lab captures (real serve config)
    Xl, yl, tl = load_lab()
    report("CROSS-DIST: our own lab nfstream captures (real sensor config)", yl, pred(net, scale(Xl, m, s)), tl)

    if a.save:
        net.save(os.path.join(REPO, "data", "best_flow_cicids.keras"))
        with open(os.path.join(REPO, "data", "flow_cicids_scaler.json"), "w") as f:
            json.dump({"mean": m.tolist(), "scale": s.tolist(), "clip": SCALE_CLIP, "n_features": N_FEATURES}, f)
        print("\nsaved data/best_flow_cicids.keras + data/flow_cicids_scaler.json")

if __name__ == "__main__":
    main()
