"""
CyberShield LIVE lite sensor (NO TensorFlow — VM Python 3.14 venv).

nfstream LIVE capture yields 0 flows on this VM (confirmed, both sessions) — only OFFLINE
pcap parsing works. So this sensor consumes ROTATING pcaps: a tcpdump writes a new file every
few seconds, the sensor parses each COMPLETED file via nfstream offline (the proven path),
runs the tool-agnostic rate rules locally, ships each real per-source 10-flow window to the
HOST backend /api/predict (TF lives there) over the SSH reverse tunnel, and posts every
detection to /internal/event so it streams live to the dashboard. Own-LAN lab traffic only.

Detector state (rate rules + per-source window buffers) persists ACROSS files so windows and
rate counts span rotation boundaries. Start the matching tcpdump first:
  tcpdump -i vetgt -s 96 -w /tmp/live/cap_%Y%m%d_%H%M%S.pcap -G 5 'ip and not arp'
Then:
  sudo .venv/bin/python live_sensor_lite.py --pcap-dir /tmp/live --backend http://127.0.0.1:8000 --token livedemo
"""
import argparse, glob, os, sys, time
from collections import defaultdict, deque
from datetime import datetime, timezone
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.flow_features import (  # noqa: E402
    nfstream_flow_to_primitives, nfstream_flow_meta,
)
from backend.rate_rules import RateRuleDetector  # noqa: E402

WINDOW = 10

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pcap-dir", required=True)
    ap.add_argument("--backend", default="http://127.0.0.1:8000")
    ap.add_argument("--token", default="livedemo")
    ap.add_argument("--flow-thr", type=float, default=0.80)
    a = ap.parse_args()

    ev_url = a.backend.rstrip("/") + "/internal/event"
    pred_url = a.backend.rstrip("/") + "/api/predict"
    hdr = {"X-Internal-Token": a.token}
    sess = requests.Session()
    import nfstream

    rr = RateRuleDetector()
    buf = defaultdict(lambda: deque(maxlen=WINDOW))  # src -> deque[(prims, start_ms, dst_ip, dst_port)]
    last_pred = {}   # src -> flow index of last LSTM predict (throttle: floods make thousands of
                     # sliding windows; one HTTP predict each swamps the host and backs up the queue)
    PRED_EVERY = 25  # predict at most 1 window per source per 25 flows
    done = set()
    n_flows = 0

    def post_event(model_name, attack_class, conf, src):
        try:
            sess.post(ev_url, headers=hdr, timeout=3, json={
                "model_name": model_name, "attack_class": attack_class,
                "confidence": float(conf), "source_ip": src, "timestamp": now_iso()})
            print(f"  -> EVENT {model_name} {attack_class} {conf:.2f} src={src}", flush=True)
        except Exception as e:
            print(f"  !! event post failed: {e}", flush=True)

    def process(pcap):
        nonlocal n_flows
        try:
            st = nfstream.NFStreamer(source=pcap, statistical_analysis=True,
                                     accounting_mode=3, idle_timeout=120)
        except Exception as e:
            print(f"  !! open {pcap}: {e}", flush=True); return
        for flow in st:
            n_flows += 1
            src_ip, start_ms, dst_ip, dst_port = nfstream_flow_meta(flow)
            prims = nfstream_flow_to_primitives(flow)
            end_s = float(flow.bidirectional_last_seen_ms) / 1000.0
            for al in rr.observe(end_s, src_ip, dst_ip, int(dst_port)):
                post_event("flow_rules", al.attack_class, 1.0, al.source_ip)
            b = buf[src_ip]
            b.append((prims, float(start_ms), dst_ip, int(dst_port)))
            if len(b) == WINDOW and n_flows - last_pred.get(src_ip, -10**9) >= PRED_EVERY:
                last_pred[src_ip] = n_flows
                rows, prev = [], None
                for (p, stt, di, dp) in b:
                    gap = 0.0 if prev is None else max(0.0, stt - prev[0])
                    rows.append([float(x) for x in p] +
                                [gap, 1.0 if prev and di == prev[1] else 0.0,
                                 1.0 if prev and dp == prev[2] else 0.0])
                    prev = (stt, di, dp)
                try:
                    r = sess.post(pred_url, timeout=5,
                                  json={"model_name": "flow", "window": rows}).json()
                    res = r.get("result") or {}
                    cls, conf = res.get("predicted_class"), res.get("confidence", 0.0)
                    if cls and cls != "BENIGN" and float(conf) >= a.flow_thr:
                        post_event("flow", cls, conf, src_ip)
                except Exception as e:
                    print(f"  !! predict failed: {e}", flush=True)

    print(f"LIVE sensor watching {a.pcap_dir} -> {a.backend}  (rotating pcap, offline nfstream)", flush=True)
    while True:
        files = sorted(glob.glob(os.path.join(a.pcap_dir, "*.pcap")))
        # newest file is still being written by tcpdump — process all but the last
        ready = [f for f in files[:-1] if f not in done]
        for f in ready:
            print(f"  processing {os.path.basename(f)}", flush=True)
            process(f)
            done.add(f)
            try: os.remove(f)
            except OSError: pass
        if n_flows and n_flows % 500 < len(ready or [0]):
            print(f"  total flows {n_flows}", flush=True)
        time.sleep(2)

if __name__ == "__main__":
    main()
