#!/usr/bin/env python
# CyberShield — CIC-IDS2017 raw PCAP -> nfstream (OUR serve config) -> labelled windows -> Flow model
#
# Why this kernel: a model trained on a pre-made "nfstream" CSV did NOT transfer to our live sensor
# (benign FA 94%) because that CSV used a different NFStreamer config. Here we re-extract from the
# RAW pcaps with our EXACT serving config (statistical_analysis=True, accounting_mode=3,
# idle_timeout=120) so the feature distribution matches backend/flow_features.py and the live sensor.
#
# Labelling is timezone-free (IP + port): attacker 172.16.0.1 -> victim 192.168.10.50,
#   Tuesday  dst 21/22 -> BruteForce   (FTP-/SSH-Patator)
#   Wednesday dst 80    -> DoS         (Hulk/GoldenEye/Slowloris/Slowhttptest; 443 Heartbleed dropped)
#   Friday   dst 80    -> DDoS         (LOIC flood; portscan=other ports, botnet=other -> dropped)
#   Monday   everything -> BENIGN
# Other attacker-originated flows are DROPPED (not labelled benign); all non-attacker flows = BENIGN.
#
# Outputs to /kaggle/working: windows.npz, best_flow_cicids2017.keras, flow_cicids2017_scaler.json,
# flow_cicids2017_metadata.json, eda_*.png, eda_summary.json
import os, sys, subprocess, json, time, glob
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "nfstream"], check=True)
import numpy as np, pandas as pd
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from collections import defaultdict, Counter
import nfstream

OUT = "/kaggle/working"
# find the dataset dir (per-day pcaps live under /kaggle/input/<slug>/<Day>-WorkingHours/*.pcap)
INPUT = "/kaggle/input"
def find_pcap(day):
    hits = glob.glob(f"{INPUT}/**/{day}-WorkingHours*.pcap", recursive=True) + \
           glob.glob(f"{INPUT}/**/{day}-WorkingHours/{day}-WorkingHours.pcap", recursive=True)
    hits = [h for h in hits if h.endswith(".pcap")]
    return hits[0] if hits else None

ATTACKER, VICTIM = "172.16.0.1", "192.168.10.50"
# (day, {dst_port: class}); attacker->victim on these ports => class; other attacker flows dropped
DAYS = {
    "Monday":    None,                       # all benign
    "Tuesday":   {21: "BruteForce", 22: "BruteForce"},
    "Wednesday": {80: "DoS"},
    "Friday":    {80: "DDoS"},
}
CLASSES = ["BENIGN", "DoS", "DDoS", "BruteForce"]
CIDX = {c: i for i, c in enumerate(CLASSES)}
WINDOW = 10

# ---- our exact 43-primitive mapping (mirror of backend/flow_features.py::_NF_MAP) ----
NF_MAP = [
    ("bidirectional_duration_ms",1000.0),("src2dst_packets",1.0),("dst2src_packets",1.0),
    ("src2dst_bytes",1.0),("dst2src_bytes",1.0),("src2dst_max_ps",1.0),("src2dst_min_ps",1.0),
    ("src2dst_mean_ps",1.0),("src2dst_stddev_ps",1.0),("dst2src_max_ps",1.0),("dst2src_min_ps",1.0),
    ("dst2src_mean_ps",1.0),("dst2src_stddev_ps",1.0),("bidirectional_mean_piat_ms",1000.0),
    ("bidirectional_stddev_piat_ms",1000.0),("bidirectional_max_piat_ms",1000.0),
    ("bidirectional_min_piat_ms",1000.0),("src2dst_mean_piat_ms",1000.0),("src2dst_stddev_piat_ms",1000.0),
    ("src2dst_max_piat_ms",1000.0),("src2dst_min_piat_ms",1000.0),("dst2src_mean_piat_ms",1000.0),
    ("dst2src_stddev_piat_ms",1000.0),("dst2src_max_piat_ms",1000.0),("dst2src_min_piat_ms",1000.0),
    ("src2dst_psh_packets",1.0),("dst2src_psh_packets",1.0),("src2dst_urg_packets",1.0),
    ("dst2src_urg_packets",1.0),("src2dst_rst_packets",1.0),("dst2src_rst_packets",1.0),
    ("bidirectional_min_ps",1.0),("bidirectional_max_ps",1.0),("bidirectional_mean_ps",1.0),
    ("bidirectional_stddev_ps",1.0),("bidirectional_fin_packets",1.0),("bidirectional_syn_packets",1.0),
    ("bidirectional_rst_packets",1.0),("bidirectional_psh_packets",1.0),("bidirectional_ack_packets",1.0),
    ("bidirectional_urg_packets",1.0),("bidirectional_cwr_packets",1.0),("bidirectional_ece_packets",1.0),
]
PRIM = [a for a, _ in NF_MAP]; MULT = np.array([m for _, m in NF_MAP])
PRIM_NAMES = ["Flow Duration","Total Fwd Packet","Total Bwd packets","Total Length of Fwd Packet",
    "Total Length of Bwd Packet","Fwd Packet Length Max","Fwd Packet Length Min","Fwd Packet Length Mean",
    "Fwd Packet Length Std","Bwd Packet Length Max","Bwd Packet Length Min","Bwd Packet Length Mean",
    "Bwd Packet Length Std","Flow IAT Mean","Flow IAT Std","Flow IAT Max","Flow IAT Min","Fwd IAT Mean",
    "Fwd IAT Std","Fwd IAT Max","Fwd IAT Min","Bwd IAT Mean","Bwd IAT Std","Bwd IAT Max","Bwd IAT Min",
    "Fwd PSH Flags","Bwd PSH Flags","Fwd URG Flags","Bwd URG Flags","Fwd RST Flags","Bwd RST Flags",
    "Packet Length Min","Packet Length Max","Packet Length Mean","Packet Length Std","FIN Flag Count",
    "SYN Flag Count","RST Flag Count","PSH Flag Count","ACK Flag Count","URG Flag Count","CWR Flag Count",
    "ECE Flag Count"]
DERIVED = ["bytes_per_s","pkts_per_s","fwd_pkts_per_s","bwd_pkts_per_s","bwd_fwd_pkt_ratio","bytes_per_pkt"]
BEHAV = ["gap_log1p_ms","same_dst_ip_as_prev","same_dst_port_as_prev"]
FEATS = PRIM_NAMES + DERIVED + BEHAV
NF = len(FEATS)  # 52
CAP = {"BENIGN": 60000, "DoS": 60000, "DDoS": 60000, "BruteForce": 60000}
SEED = 11; CLIP = 6.0

def engineer(P):
    P = np.maximum(np.asarray(P, float), 0.0); c = {n: i for i, n in enumerate(PRIM_NAMES)}
    dur = np.maximum(P[:, c["Flow Duration"]], 1.0) / 1e6
    fp, bp = P[:, c["Total Fwd Packet"]], P[:, c["Total Bwd packets"]]
    fb, bb = P[:, c["Total Length of Fwd Packet"]], P[:, c["Total Length of Bwd Packet"]]
    tp, tb = fp + bp, fb + bb
    d = np.stack([tb/dur, tp/dur, fp/dur, bp/dur, bp/np.maximum(fp,1.0), tb/np.maximum(tp,1.0)], 1)
    return np.log1p(np.concatenate([P, d], 1)).astype(np.float32)

def label_flow(day, src, dst, dport):
    rule = DAYS[day]
    if rule is None:
        return "BENIGN"
    if src == ATTACKER and dst == VICTIM:
        return rule.get(int(dport), "DROP")  # attacker on non-target port = DROP (portscan/bot/heartbleed)
    if src == ATTACKER or dst == ATTACKER:
        return "DROP"
    return "BENIGN"

# ---- pass 1: extract flows per day, collect per-source rows + EDA stats ----
eda = {"per_day": {}, "attacker_ports": {}, "flows_total": 0}
rows_by_src = defaultdict(list)     # src_ip -> [(last_ms,start_ms,dst,dport,prims43,cls)]
t0 = time.time()
for day in DAYS:
    p = find_pcap(day)
    if not p:
        print(f"!! {day} pcap not found", flush=True); continue
    print(f"== {day}: {p} ({os.path.getsize(p)/1e9:.1f} GB) ==", flush=True)
    st = nfstream.NFStreamer(source=p, statistical_analysis=True, accounting_mode=3, idle_timeout=120)
    cnt = Counter(); aports = Counter(); n = 0
    for f in st:
        n += 1; eda["flows_total"] += 1
        cls = label_flow(day, f.src_ip, f.dst_ip, f.dst_port)
        if f.src_ip == ATTACKER and f.dst_ip == VICTIM:
            aports[int(f.dst_port)] += 1
        if cls == "DROP":
            continue
        cnt[cls] += 1
        prims = [float(getattr(f, a, 0) or 0) for a in PRIM]
        rows_by_src[f.src_ip].append((float(f.bidirectional_last_seen_ms),
            float(f.bidirectional_first_seen_ms), f.dst_ip, int(f.dst_port), prims, cls))
        if n % 200000 == 0:
            print(f"   {day} {n} flows  {dict(cnt)}  ({time.time()-t0:.0f}s)", flush=True)
    eda["per_day"][day] = dict(cnt)
    eda["attacker_ports"][day] = dict(aports.most_common(12))
    print(f"   {day} DONE {n} flows  {dict(cnt)}  attacker->victim ports {dict(aports.most_common(8))}", flush=True)

# ---- pass 2: per-source windows (52 feat), capped ----
rng = np.random.default_rng(SEED)
buckets = {c: [] for c in CLASSES}
for src, lst in rows_by_src.items():
    lst.sort(key=lambda t: t[0])
    P = np.array([t[4] for t in lst], float) * MULT
    E = engineer(P)
    feats = np.empty((len(lst), NF), np.float32)
    ps = pd_dst = pd_port = None
    for i, t in enumerate(lst):
        gap = 0.0 if ps is None else max(0.0, t[1]-ps)
        b = [float(np.log1p(gap)), 0.0 if pd_dst is None else float(t[2]==pd_dst),
             0.0 if pd_port is None else float(t[3]==pd_port)]
        feats[i] = np.concatenate([E[i], b]); ps, pd_dst, pd_port = t[1], t[2], t[3]
    for i in range(WINDOW-1, len(lst)):
        c = lst[i][5]
        if len(buckets[c]) < CAP[c]*3:
            buckets[c].append(feats[i-WINDOW+1:i+1].copy())
X, y = [], []
for c in CLASSES:
    arr = buckets[c]
    if len(arr) > CAP[c]:
        arr = [arr[j] for j in rng.choice(len(arr), CAP[c], replace=False)]
    X += arr; y += [c]*len(arr)
X = np.stack(X).astype(np.float32); y = np.array(y)
print("windows:", {c: int((y==c).sum()) for c in CLASSES}, flush=True)
np.savez_compressed(f"{OUT}/windows.npz", X=X, y=y)

# ---- EDA plots ----
eda["windows"] = {c: int((y==c).sum()) for c in CLASSES}
plt.figure(figsize=(6,4)); vals=[ (y==c).sum() for c in CLASSES]
plt.bar(CLASSES, vals, color=["#4C78A8","#F58518","#E45756","#72B7B2"]); plt.title("windows per class")
for i,v in enumerate(vals): plt.text(i,v,str(v),ha="center",va="bottom")
plt.tight_layout(); plt.savefig(f"{OUT}/eda_class_counts.png"); plt.close()

# per-class feature means heatmap (scaled) — which features separate classes
flat_mean = {c: X[y==c].reshape(-1,NF).mean(0) for c in CLASSES}
M = np.stack([flat_mean[c] for c in CLASSES])
Mz = (M - M.mean(0)) / (M.std(0)+1e-9)
plt.figure(figsize=(16,3)); plt.imshow(Mz, aspect="auto", cmap="RdBu_r", vmin=-2, vmax=2)
plt.yticks(range(len(CLASSES)), CLASSES); plt.xticks(range(NF), FEATS, rotation=90, fontsize=5)
plt.colorbar(label="z vs class mean"); plt.title("per-class feature signature (log1p features)")
plt.tight_layout(); plt.savefig(f"{OUT}/eda_feature_signature.png", dpi=120); plt.close()

# a few key feature distributions by class
key = ["Flow Duration","Total Fwd Packet","SYN Flag Count","bytes_per_s","Flow IAT Mean","gap_log1p_ms"]
fig,axes=plt.subplots(2,3,figsize=(15,7))
for ax,kf in zip(axes.ravel(), key):
    j=FEATS.index(kf)
    for c in CLASSES:
        v=X[y==c][:, :, j].ravel(); ax.hist(v,bins=40,alpha=0.5,label=c,density=True)
    ax.set_title(kf); ax.legend(fontsize=7)
plt.tight_layout(); plt.savefig(f"{OUT}/eda_feature_dists.png", dpi=110); plt.close()
json.dump(eda, open(f"{OUT}/eda_summary.json","w"), indent=2)
print("EDA:", json.dumps(eda, indent=2), flush=True)

# ---- train (new scaler + class weights, honest split) ----
import tensorflow as tf
idx = rng.permutation(len(X)); X, y = X[idx], y[idx]
ntr = int(.8*len(X)); Xtr,ytr,Xte,yte = X[:ntr],y[:ntr],X[ntr:],y[ntr:]
flat = Xtr.reshape(-1,NF); mean=flat.mean(0); scale=flat.std(0); scale[scale==0]=1
def sc(A): return np.clip((A-mean)/scale,-CLIP,CLIP).astype(np.float32)
def yi(a): return np.array([CIDX[c] for c in a],np.int32)
n=len(ytr); cw={c: n/(len(CLASSES)*max((yi(ytr)==c).sum(),1)) for c in range(len(CLASSES))}
reg=tf.keras.regularizers.l2(1e-4)
net=tf.keras.Sequential([tf.keras.layers.Input((WINDOW,NF)),tf.keras.layers.GaussianNoise(0.15),
    tf.keras.layers.LSTM(48,dropout=0.1,kernel_regularizer=reg),tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(len(CLASSES),activation="softmax")])
net.compile("adam","sparse_categorical_crossentropy",metrics=["accuracy"])
es=tf.keras.callbacks.EarlyStopping(monitor="val_loss",patience=3,restore_best_weights=True)
net.fit(sc(Xtr),yi(ytr),validation_split=0.15,epochs=30,batch_size=512,class_weight=cw,
        callbacks=[es],verbose=2)
yp=np.array(CLASSES)[net.predict(sc(Xte),batch_size=2048,verbose=0).argmax(1)]
metrics={"test":{}}
for c in CLASSES:
    mk=yte==c
    if mk.sum(): metrics["test"][c]={"recall":float((yp[mk]==c).mean()),"n":int(mk.sum())}
metrics["test"]["BENIGN_false_alarm"]=float((yp[yte=="BENIGN"]!="BENIGN").mean())
print("TEST METRICS:", json.dumps(metrics,indent=2), flush=True)

net.save(f"{OUT}/best_flow_cicids2017.keras")
json.dump({"mean":mean.tolist(),"scale":scale.tolist(),"clip":CLIP,"n_features":NF},
          open(f"{OUT}/flow_cicids2017_scaler.json","w"))
json.dump({"classes":CLASSES,"window_size":WINDOW,"n_features":NF,"feature_names":FEATS,
    "nfstreamer":{"statistical_analysis":True,"accounting_mode":3,"idle_timeout":120},
    "source":"CIC-IDS2017 raw pcap re-extracted with serve config","labelling":"IP+port, timezone-free",
    "windows":eda["windows"],"test_metrics":metrics},
    open(f"{OUT}/flow_cicids2017_metadata.json","w"), indent=2)
print("SAVED model + scaler + metadata. total time %.0fs" % (time.time()-t0), flush=True)
