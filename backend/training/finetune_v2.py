"""
Tuned CIC->lab fine-tune + honest unseen-tool CV.
Tuning: 2-stage (freeze LSTM, train head; then unfreeze low-LR) + ReduceLROnPlateau + early stop
on a lab validation split. Eval: lab held-out + per-tool + CIC forgetting.
  PY312 finetune_v2.py            # tuned fine-tune + lab/CIC eval
  PY312 finetune_v2.py --unseen   # + leave-one-attack-tool-out CV
  PY312 finetune_v2.py --save     # save shipped model (tuned, all lab)
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
sdef = json.load(open(os.path.join(KOUT, "flow_cicids2017_scaler.json")))
MEAN = np.array(sdef["mean"], np.float32); SCALE = np.array(sdef["scale"], np.float32)
def sc(X): return np.clip((X - MEAN) / SCALE, -SCALE_CLIP, SCALE_CLIP).astype(np.float32)
def yi(y): return np.array([CIDX[c] for c in y], np.int32)
def cw(y):
    z = yi(y); n = len(z); k = len(CLASSES)
    return {c: n / (k * max((z == c).sum(), 1)) for c in range(k)}
def pred(m, Z): return np.array(CLASSES)[m.predict(Z, batch_size=2048, verbose=0).argmax(1)]

def load_lab():
    paths = [p for p in sorted(glob.glob(os.path.join(REPO, "data", "captures", "*.csv")))
             if not any(s in os.path.basename(p) for s in ("labtest", "smoketest", "watchdogtest", "dd_fast"))]
    d, *_ = build(paths); X, y, tool = d["X"], d["y"], d["tool"]
    rng = np.random.default_rng(SEED); keep = []
    for t in np.unique(tool):
        idx = np.where(tool == t)[0]
        if len(idx) > MAX_LAB_TOOL: idx = rng.choice(idx, MAX_LAB_TOOL, replace=False)
        keep.append(idx)
    keep = np.concatenate(keep); return X[keep], y[keep], tool[keep]
def cic_test(n=12000):
    d = np.load(os.path.join(KOUT, "windows.npz"), allow_pickle=True)
    X, y = d["X"], d["y"].astype(str); rng = np.random.default_rng(3)
    idx = rng.choice(len(X), min(n, len(X)), replace=False); return X[idx], y[idx]

def tuned_finetune(Xtr, ytr, Xva=None, yva=None, verbose=0):
    """2-stage: freeze LSTM+noise, train head; then unfreeze, low LR + ReduceLROnPlateau."""
    m = tf.keras.models.load_model(os.path.join(KOUT, "best_flow_cicids2017.keras"))
    val = (sc(Xva), yi(yva)) if Xva is not None else None
    # stage 1: freeze everything except final Dense
    for lyr in m.layers:
        lyr.trainable = isinstance(lyr, tf.keras.layers.Dense)
    m.compile(tf.keras.optimizers.Adam(1e-3), "sparse_categorical_crossentropy", metrics=["accuracy"])
    m.fit(sc(Xtr), yi(ytr), validation_data=val, epochs=6, batch_size=256,
          class_weight=cw(ytr), verbose=verbose)
    # stage 2: unfreeze all, low LR + schedule + early stop
    for lyr in m.layers: lyr.trainable = True
    m.compile(tf.keras.optimizers.Adam(1e-4), "sparse_categorical_crossentropy", metrics=["accuracy"])
    cbs = [tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss" if val else "loss",
                                                factor=0.5, patience=2, min_lr=1e-6)]
    if val: cbs.append(tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=4,
                                                        restore_best_weights=True))
    m.fit(sc(Xtr), yi(ytr), validation_data=val, epochs=25, batch_size=256,
          class_weight=cw(ytr), callbacks=cbs, verbose=verbose)
    return m

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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unseen", action="store_true"); ap.add_argument("--save", action="store_true")
    a = ap.parse_args()
    X, y, tool = load_lab()
    print("lab windows=%d " % len(X) + ",".join(f"{c}:{(y==c).sum()}" for c in CLASSES))
    rng = np.random.default_rng(SEED)
    trm = np.zeros(len(X), bool); vam = np.zeros(len(X), bool)
    for t in np.unique(tool):
        idx = np.where(tool == t)[0]; rng.shuffle(idx); n = len(idx)
        trm[idx[:int(.6*n)]] = True; vam[idx[int(.6*n):int(.75*n)]] = True
    tem = ~(trm | vam)
    m = tuned_finetune(X[trm], y[trm], X[vam], y[vam])
    report("TUNED fine-tune: LAB held-out (SERVE TARGET)", y[tem], pred(m, sc(X[tem])), tool[tem])
    Xc, yc = cic_test(); report("CIC held-out (forgetting)", yc, pred(m, sc(Xc)))

    if a.unseen:
        print("\n===== UNSEEN-TOOL CV (leave each attack tool out; CIC+other lab in train) =====")
        atk = sorted({t for t in np.unique(tool) if y[tool == t][0] != "BENIGN"})
        for ht in atk:
            trn = tool != ht; te = tool == ht
            mm = tuned_finetune(X[trn], y[trn])  # no val (speed)
            yp = pred(mm, sc(X[te])); lbl = y[te][0]
            print(f"  held-out {ht:<17}{lbl:<11} recall {(yp==lbl).mean():.3f} (n={te.sum()})")

    if a.save:
        mf = tuned_finetune(X, y)  # all lab
        mf.save(os.path.join(REPO, "data", "best_flow_finetuned.keras"))
        json.dump(sdef, open(os.path.join(REPO, "data", "flow_finetuned_scaler.json"), "w"))
        print("\nsaved data/best_flow_finetuned.keras (tuned)")

if __name__ == "__main__":
    main()
