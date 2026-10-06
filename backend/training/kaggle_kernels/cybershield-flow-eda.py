#!/usr/bin/env python
# CyberShield — EDA of the test data + the fine-tuned Flow LSTM's behaviour on it.
# Loads the shipped fine-tuned model (CIC-IDS2017-nfstream base -> fine-tuned on own-LAN lab) and
# both window sets, runs predictions on held-out splits, and produces a full EDA:
#   input class/tool distribution, confusion matrices, per-class precision/recall/F1, per-tool
#   recall, prediction-confidence (correct vs wrong), per-class feature signature, PCA & t-SNE
#   embeddings coloured by true class and by error. Outputs PNGs + metrics JSON to /kaggle/working.
import os, json, glob
import numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from collections import Counter
import tensorflow as tf
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

IN = glob.glob("/kaggle/input/*")[0]
OUT = "/kaggle/working"
CLASSES = ["BENIGN", "DoS", "DDoS", "BruteForce"]; CIDX = {c: i for i, c in enumerate(CLASSES)}
COLORS = {"BENIGN": "#4C78A8", "DoS": "#F58518", "DDoS": "#E45756", "BruteForce": "#72B7B2"}
SEED = 11; N_FEAT = 52; CLIP = 6.0
FEATS = (["Flow Duration","Tot Fwd Pkt","Tot Bwd Pkt","Len Fwd","Len Bwd","Fwd Len Max","Fwd Len Min",
  "Fwd Len Mean","Fwd Len Std","Bwd Len Max","Bwd Len Min","Bwd Len Mean","Bwd Len Std","Flow IAT Mean",
  "Flow IAT Std","Flow IAT Max","Flow IAT Min","Fwd IAT Mean","Fwd IAT Std","Fwd IAT Max","Fwd IAT Min",
  "Bwd IAT Mean","Bwd IAT Std","Bwd IAT Max","Bwd IAT Min","Fwd PSH","Bwd PSH","Fwd URG","Bwd URG",
  "Fwd RST","Bwd RST","Pkt Len Min","Pkt Len Max","Pkt Len Mean","Pkt Len Std","FIN","SYN","RST","PSH",
  "ACK","URG","CWR","ECE","bytes/s","pkts/s","fwd pkts/s","bwd pkts/s","bwd/fwd ratio","bytes/pkt",
  "gap_log","same_dst_ip","same_dst_port"])

sdef = json.load(open(os.path.join(IN, "flow_finetuned_scaler.json")))
MEAN = np.array(sdef["mean"], np.float32); SCALE = np.array(sdef["scale"], np.float32)
def sc(X): return np.clip((X - MEAN) / SCALE, -CLIP, CLIP).astype(np.float32)
def yint(y): return np.array([CIDX[c] for c in y], np.int32)
# rebuild arch + load weights (cross-Keras-version robust; .keras full-load fails on Kaggle's Keras)
def build_model():
    reg = tf.keras.regularizers.l2(1e-4)
    m = tf.keras.Sequential([tf.keras.layers.Input((10, N_FEAT)),
        tf.keras.layers.GaussianNoise(0.15),
        tf.keras.layers.LSTM(48, dropout=0.1, kernel_regularizer=reg),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(len(CLASSES), activation="softmax")])
    return m
model = build_model()
model.load_weights(os.path.join(IN, "best_flow_finetuned.weights.h5"))

def load(npz, cap=4000):
    d = np.load(os.path.join(IN, npz), allow_pickle=True)
    X, y = d["X"], d["y"].astype(str)
    tool = d["tool"].astype(str) if "tool" in d.files else np.array(["-"] * len(y))
    rng = np.random.default_rng(SEED); keep = []
    for c in CLASSES:  # cap per class for plotting speed / balance
        idx = np.where(y == c)[0]
        if len(idx) > cap: idx = rng.choice(idx, cap, replace=False)
        keep.append(idx)
    keep = np.concatenate(keep); rng.shuffle(keep)
    return X[keep], y[keep], tool[keep]

Xl, yl, tl = load("lab_windows.npz", cap=4000)
Xc, yc, _ = load("cic_windows.npz", cap=4000)
summary = {"lab_class_counts": {c: int((yl == c).sum()) for c in CLASSES},
           "cic_class_counts": {c: int((yc == c).sum()) for c in CLASSES}}

def proba(X): return model.predict(sc(X), batch_size=2048, verbose=0)
Pl = proba(Xl); ypl = np.array(CLASSES)[Pl.argmax(1)]; confl = Pl.max(1)
Pc = proba(Xc); ypc = np.array(CLASSES)[Pc.argmax(1)]

# ---------- 1. input: class + tool distribution ----------
fig, ax = plt.subplots(1, 2, figsize=(14, 4))
for a, (y, title) in zip(ax, [(yl, "lab (own-LAN nfstream)"), (yc, "CIC-IDS2017 (nfstream)")]):
    v = [(y == c).sum() for c in CLASSES]; a.bar(CLASSES, v, color=[COLORS[c] for c in CLASSES])
    a.set_title(f"TEST input class distribution — {title}")
    for i, vv in enumerate(v): a.text(i, vv, str(vv), ha="center", va="bottom")
plt.tight_layout(); plt.savefig(f"{OUT}/01_input_class_dist.png", dpi=120); plt.close()

tc = Counter(tl); items = sorted(tc.items(), key=lambda x: -x[1])
plt.figure(figsize=(13, 5)); plt.bar([k for k, _ in items], [v for _, v in items], color="#4C78A8")
plt.xticks(rotation=90, fontsize=7); plt.title("lab test windows per capture tool (input)")
plt.tight_layout(); plt.savefig(f"{OUT}/02_input_per_tool.png", dpi=120); plt.close()

# ---------- 2. confusion matrices ----------
def plot_cm(yt, yp, title, fname):
    cm = confusion_matrix(yint(yt), yint(yp), labels=range(len(CLASSES)))
    cmn = cm / cm.sum(1, keepdims=True).clip(1)
    plt.figure(figsize=(5.5, 4.8)); plt.imshow(cmn, cmap="Blues", vmin=0, vmax=1)
    plt.xticks(range(len(CLASSES)), CLASSES, rotation=45); plt.yticks(range(len(CLASSES)), CLASSES)
    plt.xlabel("predicted"); plt.ylabel("true"); plt.title(title); plt.colorbar(label="row-normalised")
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            plt.text(j, i, f"{cmn[i,j]:.2f}\n({cm[i,j]})", ha="center", va="center",
                     color="white" if cmn[i, j] > 0.5 else "black", fontsize=8)
    plt.tight_layout(); plt.savefig(f"{OUT}/{fname}", dpi=120); plt.close()
plot_cm(yl, ypl, "Confusion — lab (serve target)", "03_confusion_lab.png")
plot_cm(yc, ypc, "Confusion — CIC-IDS2017", "04_confusion_cic.png")
summary["lab_report"] = classification_report(yl, ypl, output_dict=True, zero_division=0)
summary["cic_report"] = classification_report(yc, ypc, output_dict=True, zero_division=0)

# ---------- 3. per-tool recall (lab) ----------
tools = sorted(set(tl)); rec = []
for t in tools:
    m = tl == t; rec.append((ypl[m] == yl[m][0]).mean())
order = np.argsort(rec)
plt.figure(figsize=(13, 5)); plt.bar([tools[i] for i in order], [rec[i] for i in order],
    color=[COLORS[yl[tl == tools[i]][0]] for i in order])
plt.xticks(rotation=90, fontsize=7); plt.ylim(0, 1.05); plt.ylabel("recall (correct class)")
plt.title("lab per-tool recall (fine-tuned model) — colour = true class")
plt.tight_layout(); plt.savefig(f"{OUT}/05_per_tool_recall.png", dpi=120); plt.close()

# ---------- 4. prediction confidence: correct vs wrong ----------
corr = ypl == yl
plt.figure(figsize=(8, 4.5))
plt.hist(confl[corr], bins=30, alpha=0.6, label=f"correct (n={corr.sum()})", color="#4C78A8", density=True)
plt.hist(confl[~corr], bins=30, alpha=0.6, label=f"wrong (n={(~corr).sum()})", color="#E45756", density=True)
plt.xlabel("max softmax (confidence)"); plt.ylabel("density"); plt.legend()
plt.title("lab prediction confidence — correct vs wrong"); plt.tight_layout()
plt.savefig(f"{OUT}/06_confidence.png", dpi=120); plt.close()

# ---------- 5. per-class feature signature (mean of scaled last-flow features) ----------
Zl = sc(Xl)[:, -1, :]  # last flow of each window
M = np.stack([Zl[yl == c].mean(0) for c in CLASSES])
plt.figure(figsize=(16, 3.2)); plt.imshow(M, aspect="auto", cmap="RdBu_r", vmin=-2, vmax=2)
plt.yticks(range(len(CLASSES)), CLASSES); plt.xticks(range(N_FEAT), FEATS, rotation=90, fontsize=5)
plt.colorbar(label="mean scaled value"); plt.title("per-class feature signature (lab, last flow of window)")
plt.tight_layout(); plt.savefig(f"{OUT}/07_feature_signature.png", dpi=130); plt.close()

# ---------- 6. PCA + t-SNE embeddings ----------
flat = sc(Xl).reshape(len(Xl), -1)
pca = PCA(n_components=2, random_state=SEED).fit_transform(flat)
fig, ax = plt.subplots(1, 2, figsize=(14, 6))
for c in CLASSES:
    m = yl == c; ax[0].scatter(pca[m, 0], pca[m, 1], s=4, alpha=0.4, label=c, color=COLORS[c])
ax[0].legend(); ax[0].set_title("PCA — coloured by TRUE class")
ax[1].scatter(pca[corr, 0], pca[corr, 1], s=4, alpha=0.3, color="#B0B0B0", label="correct")
ax[1].scatter(pca[~corr, 0], pca[~corr, 1], s=8, alpha=0.7, color="#E45756", label="misclassified")
ax[1].legend(); ax[1].set_title("PCA — misclassified highlighted")
plt.tight_layout(); plt.savefig(f"{OUT}/08_pca.png", dpi=120); plt.close()

sub = np.random.default_rng(SEED).choice(len(flat), min(3000, len(flat)), replace=False)
ts = TSNE(n_components=2, random_state=SEED, perplexity=30, init="pca").fit_transform(flat[sub])
plt.figure(figsize=(8, 7))
for c in CLASSES:
    m = yl[sub] == c; plt.scatter(ts[m, 0], ts[m, 1], s=6, alpha=0.5, label=c, color=COLORS[c])
plt.legend(); plt.title("t-SNE of lab windows (colour = true class)")
plt.tight_layout(); plt.savefig(f"{OUT}/09_tsne.png", dpi=120); plt.close()

json.dump(summary, open(f"{OUT}/eda_metrics.json", "w"), indent=2, default=float)
print("EDA DONE. summary:"); print(json.dumps(summary["lab_class_counts"], indent=2))
print("lab macro F1:", summary["lab_report"]["macro avg"]["f1-score"])
print("cic macro F1:", summary["cic_report"]["macro avg"]["f1-score"])
