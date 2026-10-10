"""
CyberShield — FTP R2L sensor (REAL NSL-KDD content features, not the network_sensor.py placeholder)

ทำไมต้องมี sensor แยก: NSL-KDD เทรนจาก host-based audit log (login สำเร็จ/ล้มเหลว, คำสั่งหลัง login)
nfstream มองแค่ packet header วัด field พวกนี้ไม่ได้เลย (ดู network_sensor.py::extract_nslkdd_features —
placeholder เติม 0 ไป 35/41 field) sensor นี้แก้เฉพาะจุดที่ "วัดได้จริงจาก plaintext protocol":
FTP control channel (port 21) เป็น ASCII ล้วน อ่าน response code ตรง ๆ ได้ (530=login ผิด, 230=login สำเร็จ)
→ num_failed_logins, logged_in, is_guest_login เป็นค่าจริงจาก traffic จริง ไม่ใช่ตัวเลขสมมติ

ยังวัดไม่ได้จริง (เติม 0 ตามเดิม ไม่หลอกตัวเอง): hot, num_compromised, root_shell, su_attempted, num_root,
num_file_creations, num_shells, num_access_files, num_outbound_cmds, is_host_login — ต้องรู้ว่าหลัง login
ผู้ใช้รันคำสั่งอะไร (cd /etc, chmod, ...) ซึ่ง FTP control channel บอกได้บางส่วน (CWD/RETR/STOR) แต่ sensor นี้
ยังไม่ parse ลึกขนาดนั้น — ขอบเขตรอบแรกคือ login-outcome เท่านั้น

count/srv_count/dst_host_* : คำนวณจริงจาก connection ที่สังเกตได้ (sliding window ตามเวลา/ปลายทางเดียวกัน
แบบเดียวกับนิยามเดิมของ KDD) ไม่ใช่ placeholder แต่เป็นเวอร์ชันย่อ (ไม่ได้ทำ serror/rerror ผ่าน retransmit
tracking เต็มรูปแบบ) — serror_rate ประมาณจาก flag ของ connection เอง (S0/REJ/RSTO ในหน้าต่างเวลาเดียวกัน)

protocol_type/service/flag encode ด้วยค่าจริงจาก backend/models/label_encoders_nslkdd.pkl (โหลดแล้ว hardcode
ไว้ตรงนี้เพราะ sensor ฝั่ง VM ไม่มี sklearn/joblib) — ตรวจสอบแล้ว 2026-10-10:
  protocol_type: ['icmp','tcp','udp']                                          → tcp=1
  service:       ['IRC','X11','auth','domain','domain_u','eco_i','ecr_i',
                   'finger','ftp','ftp_data','http','imap4','link','login',
                   'ntp_u','other','pop_3','private','red_i','remote_job',
                   'shell','smtp','ssh','telnet','tftp_u','tim_i','time',
                   'urh_i','urp_i']                                            → ftp=8
  flag:          ['OTH','REJ','RSTO','RSTOS0','RSTR','S0','S1','S2','S3',
                   'SF','SH']                                                  → SF=9, REJ=1, S0=5

ใช้: sudo .venv/bin/python backend/sensors/ftp_r2l_sensor.py --pcap-dir /tmp/live_ftp \
       --backend http://127.0.0.1:8000 --token livedemo
ต้องจับ pcap เฉพาะ port 21 แยกจาก Flow sensor (tcpdump -w ... 'tcp port 21')
"""
import argparse, glob, os, sys, time
from collections import deque
from datetime import datetime, timezone

import requests
from scapy.all import rdpcap, TCP, IP

PROTO_TYPE = {"tcp": 1}
SERVICE = {"ftp": 8}
FLAG = {"SF": 9, "REJ": 1, "S0": 5, "RSTO": 2, "RSTR": 4}

WINDOW_T_S = 2.0      # นิยาม count/srv_count เดิมของ KDD: connection ใน 2 วินาทีก่อนหน้า
WINDOW_HOST_N = 100    # นิยาม dst_host_* เดิมของ KDD: 100 connection ล่าสุดไปยัง host เดียวกัน


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def reconstruct_connections(pcap_path):
    """อ่าน pcap (tcp port 21 เท่านั้น) → list ของ connection dict เรียงตามเวลา

    group ด้วย 4-tuple (src_ip,src_port,dst_ip,dst_port) — FTP control ใช้ 1 TCP connection ต่อ 1
    ความพยายาม login (hydra เปิด connection ใหม่ทุกครั้ง) จึงไม่ต้องแยก session ซ้อนกันเพิ่ม
    """
    pkts = rdpcap(pcap_path)
    conns = {}
    order = []
    for p in pkts:
        if IP not in p or TCP not in p:
            continue
        ip, tcp = p[IP], p[TCP]
        if tcp.dport != 21 and tcp.sport != 21:
            continue
        c2s = tcp.dport == 21
        key = (ip.src, tcp.sport, ip.dst, tcp.dport) if c2s else (ip.dst, tcp.dport, ip.src, tcp.sport)
        if key not in conns:
            conns[key] = {"src_ip": key[0], "src_port": key[1], "dst_ip": key[2], "dst_port": key[3],
                          "t0": float(p.time), "t1": float(p.time), "src_bytes": 0, "dst_bytes": 0,
                          "server_text": "", "client_text": "", "saw_rst": False, "saw_data": False}
            order.append(key)
        c = conns[key]
        c["t1"] = max(c["t1"], float(p.time))
        payload = bytes(tcp.payload)
        if payload:
            c["saw_data"] = True
            if c2s:
                c["src_bytes"] += len(payload)
                c["client_text"] += payload.decode("ascii", errors="replace")
            else:
                c["dst_bytes"] += len(payload)
                c["server_text"] += payload.decode("ascii", errors="replace")
        if tcp.flags & 0x04:  # RST
            c["saw_rst"] = True
    return [conns[k] for k in order]


def connection_to_row(c):
    """1 connection จริง → (ts, row[41], src_ip, dst_ip) ตาม NSL-KDD column order มาตรฐาน"""
    duration = max(0.0, c["t1"] - c["t0"])
    server = c["server_text"]
    num_failed = server.count("530")
    logged_in = 1 if "230" in server else 0
    is_guest = 1 if "user anonymous" in c["client_text"].lower() else 0
    land = 1 if c["src_ip"] == c["dst_ip"] and c["src_port"] == c["dst_port"] else 0
    if c["saw_data"]:
        flag = "SF"
    elif c["saw_rst"]:
        flag = "REJ"
    else:
        flag = "S0"
    row = [0.0] * 41
    row[0] = duration
    row[1] = float(PROTO_TYPE["tcp"])
    row[2] = float(SERVICE["ftp"])
    row[3] = float(FLAG.get(flag, FLAG["S0"]))
    row[4] = float(c["src_bytes"])
    row[5] = float(c["dst_bytes"])
    row[6] = float(land)
    row[7] = 0.0  # wrong_fragment — วัดไม่ได้จาก control channel เดี่ยว ๆ
    row[8] = 0.0  # urgent — ไม่เห็น urgent pointer ใช้งานจริงใน FTP control
    row[9] = 0.0  # hot — ต้อง parse คำสั่งหลัง login (CWD /etc, ...) ยังไม่ทำรอบนี้
    row[10] = float(num_failed)   # REAL
    row[11] = float(logged_in)    # REAL
    # 12-20: num_compromised..is_host_login — ต้องรู้คำสั่งที่รันหลัง login ไม่ใช่แค่ login outcome เว้น 0
    row[21] = float(is_guest)     # REAL
    return duration, row, c["src_ip"], c["dst_ip"], flag


def enrich_window_stats(rows_meta):
    """เติม index 22-40 (count/srv_count/dst_host_*) จาก connection จริงในหน้าต่างเวลา/ปลายทางเดียวกัน

    rows_meta: list ของ (t0, row, src_ip, dst_ip, flag) เรียงเวลา — แก้ row ในที่ (in place)
    ไม่ใช่สูตรเดิมของ KDD ทุกตัวอักษร (ไม่มี retransmit-level serror tracking) แต่เป็นค่าที่คำนวณจริงจาก
    connection ที่สังเกตได้ ไม่ใช่ 0 คงที่
    """
    for i, (t0, row, src, dst, flag) in enumerate(rows_meta):
        # count/srv_count: connection อื่นไปปลายทางเดียวกัน (ไม่สน service) / service เดียวกัน ใน 2s ที่ผ่านมา
        win = [m for m in rows_meta[:i + 1] if t0 - m[0] <= WINDOW_T_S]
        same_dst = [m for m in win if m[3] == dst]
        count = len(same_dst)
        srv_count = len(same_dst)  # service เดียวกันเสมอ (ftp เท่านั้นใน sensor นี้)
        err = sum(1 for m in same_dst if m[4] in ("S0", "REJ", "RSTO"))
        serror_rate = err / count if count else 0.0
        same_srv_rate = 1.0  # sensor นี้จับเฉพาะ ftp — service เดียวกันเสมอโดยนิยาม
        row[22] = float(count)
        row[23] = float(srv_count)
        row[24] = serror_rate
        row[25] = serror_rate
        row[26] = 0.0  # rerror_rate — ไม่ track RST แยกจาก timeout รอบนี้
        row[27] = 0.0
        row[28] = same_srv_rate
        row[29] = 0.0  # diff_srv_rate
        row[30] = 0.0  # srv_diff_host_rate

        hist = [m for m in rows_meta[:i + 1] if m[3] == dst][-WINDOW_HOST_N:]
        dh_count = len(hist)
        dh_err = sum(1 for m in hist if m[4] in ("S0", "REJ", "RSTO"))
        row[31] = float(dh_count)
        row[32] = float(dh_count)   # dst_host_srv_count — service เดียวกันเสมอในนี้
        row[33] = 1.0               # dst_host_same_srv_rate
        row[34] = 0.0
        row[35] = 0.0               # dst_host_same_src_port_rate — ไม่ track ตรงนี้
        row[36] = 0.0
        row[37] = dh_err / dh_count if dh_count else 0.0
        row[38] = dh_err / dh_count if dh_count else 0.0
        row[39] = 0.0
        row[40] = 0.0


def post_event(backend, token, model_name, attack_class, conf, src, dst_ip=None, probs=None):
    try:
        requests.post(backend.rstrip("/") + "/internal/event", headers={"X-Internal-Token": token}, timeout=8,
                      json={"model_name": model_name, "attack_class": attack_class, "confidence": float(conf),
                            "source_ip": src, "timestamp": _now_iso(), "dst_ip": dst_ip, "dst_port": 21,
                            "protocol": "TCP", "sensor": "ftp-r2l"})
        print(f"  -> EVENT {model_name} {attack_class} {conf:.2f} src={src} probs={probs}", flush=True)
    except Exception as e:
        print(f"  !! event post failed: {e}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pcap-dir", required=True)
    ap.add_argument("--backend", default="http://127.0.0.1:8000")
    ap.add_argument("--token", default="livedemo")
    a = ap.parse_args()

    pred_url = a.backend.rstrip("/") + "/api/predict"
    all_rows_meta = deque(maxlen=5000)   # (t0,row,src,dst,flag) สะสมข้าม pcap เพื่อ window stats ต่อเนื่อง
    done = set()
    print(f"FTP R2L sensor watching {a.pcap_dir} -> {a.backend}", flush=True)
    while True:
        files = sorted(glob.glob(os.path.join(a.pcap_dir, "*.pcap")))
        ready = [f for f in files[:-1] if f not in done]
        for f in ready:
            print(f"  processing {os.path.basename(f)}", flush=True)
            try:
                conns = reconstruct_connections(f)
            except Exception as e:
                print(f"  !! parse {f}: {e}", flush=True)
                conns = []
            for c in conns:
                t0, row, src, dst, flag = connection_to_row(c)
                all_rows_meta.append((c["t0"], row, src, dst, flag))
            done.add(f)
            try: os.remove(f)
            except OSError: pass

        if len(all_rows_meta) >= 10:
            rows_meta = list(all_rows_meta)
            enrich_window_stats(rows_meta)
            window = [m[1] for m in rows_meta[-10:]]
            src_last = rows_meta[-1][2]
            dst_last = rows_meta[-1][3]
            try:
                r = requests.post(pred_url, timeout=10, json={"model_name": "intrusion", "window": window}).json()
                res = r.get("result") or {}
                cls, conf = res.get("predicted_class"), res.get("confidence", 0.0)
                print(f"  window[-10:] src={src_last} predicted={cls} conf={conf:.3f} "
                      f"all_probs={res.get('all_probabilities')}", flush=True)
                if cls and cls != "Normal":
                    post_event(a.backend, a.token, "intrusion", cls, conf, src_last, dst_last, res.get("all_probabilities"))
            except Exception as e:
                print(f"  !! predict failed: {e}", flush=True)
            all_rows_meta.clear()   # กันทำนายซ้ำ window เดิม — รอ connection ใหม่สะสมอีก 10

        time.sleep(2)


if __name__ == "__main__":
    main()
