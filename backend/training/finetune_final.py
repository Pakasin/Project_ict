"""
Final model: CIC-IDS2017 base (big, tool variety, our nfstream config) FINE-TUNED on our expanded
lab captures (matches serve env). Reports lab held-out (serve target) + per-tool + CIC forgetting.
With --save: fine-tune on ALL lab data and save the shipped model + scaler + metadata.

  PY312 finetune_final.py [--save]
"""
import os, sys, glob, json, argparse
import numpy as np
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
REPO = r"C:\Users\teent\Documents\ProjectCyberSecurity"
KOUT = r"C:\Users\teent\AppData\Local\Temp\claude\C--Users-teent-Documents-ProjectCyberSecurity\111eaace-b56b-480a-b19c-c4abb31ef62d\scratchpad\kout"
sys.path.insert(0, REPO)
import tensorflow as tf
from backend.build_windows import build
from backend.flow_features import N_FEATURES, WINDOW_SIZE, SCALE_CLIP
CLASSES = ["BENIGN", "DoS", "DDoS", "BruteForce"]; CIDX = {c: i for i, c in enumerate(CLASSES)}
SEED = 11; MAX_LAB_TOOL = 2500

def load_lab():
    paths = [p for p in sorted(glob.glob(os.path.join(REPO, "data", "captures", "*.csv")))
             if not any(s in os.path.basename(p) for s in ("labtest", "smoketest", "watchdogtest"))]
    d, *_ = build(paths); X, y, tool = d["X"], d["y"], d["tool"]
    rng = np.random.default_rng(SEED); keep = []
    for t in np.unique(tool):
        idx = np.where(tool == t)[0]
        if len(idx) > MAX_LAB_TOOL: idx = rng.choice(idx, MAX_LAB_TOOL, replace=False)
        keep.append(idx)
    keep = np.concatenate(keep); return X[keep], y[keep], tool[keep]

def cic_test():
    d = np.load(os.path.join(KOUT, "windows.npz"), allow_pickle=True)
    X, y = d["X"], d["y"].astype(str); rng = np.random.default_rng(3)
    idx = rng.choice(len(X), min(12000, len(X)), replace=False); return X[idx], y[idx]

sdef = json.load(open(os.path.join(KOUT, "flow_cicids2017_scaler.json")))
MEAN = np.array(sdef["mean"], np.float32); SCALE = np.array(sdef["scale"], np.float32)
def sc(X): return np.clip((X - MEAN) / SCALE, -SCALE_CLIP, SCALE_CLIP).astype(np.float32)
def yi(y): return np.array([CIDX[c] for c in y], np.int32)
def cw(y):
    z = yi(y); n = len(z); k = len(CLASSES)
    return {c: n / (k * max((z == c).sum(), 1)) for c in range(k)}
def pred(m, Z): return np.array(CLASSES)[m.predict(Z, batch_size=2048, verbose=0).argmax(1)]
def report(tag, yt, yp, tool=None):
    print(f"\n--- {tag} ---")
    for c in CLASSES:
        mk = yt == c
        if mk.sum(): print(f"  {c:<11} recall {(yp[mk]==c).mean():.3f} (n={mk.sum()})")
    mb = yt == "BENIGN"
    if mb.sum(): print(f"  BENIGN false-alarm {(yp[mb]!='BENIGN').mean():.3f}")
    if tool is not None:
        for t in sorted(np.unique(tool)):
            mk = tool == t; print(f"    {t:<17}{yt[mk][0]:<11} {(yp[mk]==yt[mk][0]).mean():.3f} (n={mk.sum()})")

def finetune(Xtr, ytr, epochs=12, lr=2e-4):
    m = tf.keras.models.load_model(os.path.join(KOUT, "best_flow_cicids2017.keras"))
    m.compile(optimizer=tf.keras.optimizers.Adam(lr), loss="sparse_categorical_crossentropy",
              metrics=["accuracy"])
    m.fit(sc(Xtr), yi(ytr), epochs=epochs, batch_size=256, class_weight=cw(ytr), verbose=0)
    return m

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--save", action="store_true"); a = ap.parse_args()
    X, y, tool = load_lab()
    print("lab windows=%d " % len(X) + ",".join(f"{c}:{(y==c).sum()}" for c in CLASSES))
    print("tools: " + ", ".join(f"{t}({(tool==t).sum()})" for t in sorted(np.unique(tool))))
    rng = np.random.default_rng(SEED)
    trm = np.zeros(len(X), bool)
    for t in np.unique(tool):
        idx = np.where(tool == t)[0]; rng.shuffle(idx); trm[idx[:int(.7*len(idx))]] = True
    m = finetune(X[trm], y[trm])
    report("FINE-TUNED CIC->lab : LAB held-out (SERVE TARGET)", y[~trm], pred(m, sc(X[~trm])), tool[~trm])
    Xc, yc = cic_test(); report("CIC held-out (forgetting check)", yc, pred(m, sc(Xc)))

    if a.save:
        mf = finetune(X, y, epochs=12)  # final: all lab data
        mf.save(os.path.join(REPO, "data", "best_flow_finetuned.keras"))
        json.dump(sdef, open(os.path.join(REPO, "data", "flow_finetuned_scaler.json"), "w"))
        print("\nsaved data/best_flow_finetuned.keras + data/flow_finetuned_scaler.json")

if __name__ == "__main__":
    main()
