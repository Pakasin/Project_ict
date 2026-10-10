"""
CyberShield — Telnet R2L sensor (REAL NSL-KDD content features — เหมือน ftp_r2l_sensor.py แต่สำหรับ telnet)

NSL-KDD R2L เดิมมีทั้ง FTP-based และ telnet-based attack (guess_passwd ผ่าน telnet เป็นหนึ่งใน R2L
subtype ดั้งเดิมของ KDD'99) sensor นี้ปิดช่องที่ ftp_r2l_sensor.py ไม่ครอบคลุม

Telnet control channel เป็น plaintext เหมือน FTP — login(1) (มาตรฐาน Linux PAM login) ตอบกลับ
ด้วยข้อความที่อ่านตรงได้: "Login incorrect" (ผิด), ไม่มีข้อความนี้แปลว่าผ่าน → num_failed_logins,
logged_in เป็นค่าจริงเหมือน FTP sensor

ข้อต่างสำคัญจาก FTP: PAM ของ login(1) อนุญาตให้ "ลองรหัสผิดได้หลายครั้งในการเชื่อมต่อเดียว" ก่อนตัด
(ไม่เหมือน vsftpd ที่ปิด connection ทันทีเมื่อ login ผิด) ดังนั้น num_failed_logins ต่อ "connection"
ของ sensor นี้มีค่าได้มากกว่า 0/1 (เช่น 0,1,2,3) ไม่ใช่ binary เหมือน FTP — เป็น feature ที่สมจริงกว่าด้วยซ้ำ

ทดสอบจริง 2026-10-10: รัน telnetd มาตรฐาน (GNU inetutils-telnetd ผ่าน inetd) บน VM นี้เจอบั๊ก
"ttloop: peer died" (pty ใช้งานไม่ได้บนเคอร์เนลรุ่นนี้ แก้ 2 รอบไม่หาย) ใช้ `socat` แทน:
  sudo socat TCP-LISTEN:23,fork,reuseaddr EXEC:/bin/login,pty,setsid,stderr,ctty
ไม่ใช่ telnet protocol จริง (ไม่มี IAC negotiation) — hydra -t 1 (serial) ใช้งานได้จริง (ยืนยันแล้ว
เจอ login สำเร็จจริง) แต่ concurrent (-t สูง) ไม่เสถียร hydra เองก็เตือนไว้ว่า "telnet is by its
nature unreliable to analyze" — เป็นข้อจำกัดของ protocol เอง ไม่ใช่ sensor นี้

ยังวัดไม่ได้จริง (เติม 0 เหมือน FTP sensor): hot, num_compromised, root_shell, su_attempted, num_root,
num_file_creations, num_shells, num_access_files, num_outbound_cmds, is_host_login

protocol_type/service/flag — ค่าเดียวกับ ftp_r2l_sensor.py ยกเว้น service:
  service: telnet = 23 (จาก label_encoders_nslkdd.pkl classes_ list เดียวกับที่ตรวจสอบไว้ใน FTP sensor)

ใช้: sudo .venv/bin/python backend/sensors/telnet_r2l_sensor.py --pcap-dir /tmp/live_telnet \
       --backend http://127.0.0.1:8000 --token livedemo
ต้องจับ pcap เฉพาะ port 23 แยกจาก sensor อื่น (tcpdump -w ... 'tcp port 23')
"""
import argparse, glob, os, sys, time
from collections import deque
from datetime import datetime, timezone

import requests
from scapy.all import rdpcap, TCP, IP

PROTO_TYPE = {"tcp": 1}
SERVICE = {"telnet": 23}
FLAG = {"SF": 9, "REJ": 1, "S0": 5, "RSTO": 2, "RSTR": 4}

WINDOW_T_S = 2.0
WINDOW_HOST_N = 100
TELNET_PORT = 23


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def reconstruct_connections(pcap_path):
    """อ่าน pcap (tcp port 23 เท่านั้น) → list ของ connection dict เรียงตามเวลา

    1 TCP connection อาจมีหลาย login attempt ข้างใน (PAM retry) — นับ num_failed_logins จริงต่อ
    connection แทนที่จะสมมติว่า 1 connection = 1 attempt เหมือน FTP
    """
    pkts = rdpcap(pcap_path)
    conns = {}
    order = []
    for p in pkts:
        if IP not in p or TCP not in p:
            continue
        ip, tcp = p[IP], p[TCP]
        if tcp.dport != TELNET_PORT and tcp.sport != TELNET_PORT:
            continue
        c2s = tcp.dport == TELNET_PORT
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
    """1 connection จริง → (ts, row[41], src_ip, dst_ip, flag) ตาม NSL-KDD column order มาตรฐาน"""
    duration = max(0.0, c["t1"] - c["t0"])
    server = c["server_text"]
    # login(1) มาตรฐาน: พิมพ์ "Login incorrect" ทุกครั้งที่ผิด (ไม่สนตัวพิมพ์ใหญ่เล็กกันเหนียว)
    num_failed = server.lower().count("login incorrect")
    # สำเร็จ = เคยถาม Password: อย่างน้อยครั้งหนึ่ง และไม่มี "Login incorrect" เลยตลอด connection
    asked_password = "password:" in server.lower()
    logged_in = 1 if (asked_password and num_failed == 0) else 0
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
    row[2] = float(SERVICE["telnet"])
    row[3] = float(FLAG.get(flag, FLAG["S0"]))
    row[4] = float(c["src_bytes"])
    row[5] = float(c["dst_bytes"])
    row[6] = float(land)
    row[7] = 0.0
    row[8] = 0.0
    row[9] = 0.0
    row[10] = float(num_failed)   # REAL — ต่างจาก FTP ตรงนี้มีค่า >1 ได้จริง (PAM retry ในคอนเนกชันเดียว)
    row[11] = float(logged_in)    # REAL
    # 12-20: ยังวัดไม่ได้ (ดู docstring)
    row[21] = 0.0  # is_guest_login — ไม่มี anonymous telnet ให้ตรวจแบบ FTP
    return duration, row, c["src_ip"], c["dst_ip"], flag


def enrich_window_stats(rows_meta):
    """เหมือน ftp_r2l_sensor.py::enrich_window_stats ทุกประการ แค่ service เดียวในนี้คือ telnet"""
    for i, (t0, row, src, dst, flag) in enumerate(rows_meta):
        win = [m for m in rows_meta[:i + 1] if t0 - m[0] <= WINDOW_T_S]
        same_dst = [m for m in win if m[3] == dst]
        count = len(same_dst)
        srv_count = len(same_dst)
        err = sum(1 for m in same_dst if m[4] in ("S0", "REJ", "RSTO"))
        serror_rate = err / count if count else 0.0
        row[22] = float(count)
        row[23] = float(srv_count)
        row[24] = serror_rate
        row[25] = serror_rate
        row[26] = 0.0
        row[27] = 0.0
        row[28] = 1.0
        row[29] = 0.0
        row[30] = 0.0

        hist = [m for m in rows_meta[:i + 1] if m[3] == dst][-WINDOW_HOST_N:]
        dh_count = len(hist)
        dh_err = sum(1 for m in hist if m[4] in ("S0", "REJ", "RSTO"))
        row[31] = float(dh_count)
        row[32] = float(dh_count)
        row[33] = 1.0
        row[34] = 0.0
        row[35] = 0.0
        row[36] = 0.0
        row[37] = dh_err / dh_count if dh_count else 0.0
        row[38] = dh_err / dh_count if dh_count else 0.0
        row[39] = 0.0
        row[40] = 0.0


def post_event(backend, token, model_name, attack_class, conf, src, dst_ip=None, probs=None):
    try:
        requests.post(backend.rstrip("/") + "/internal/event", headers={"X-Internal-Token": token}, timeout=8,
                      json={"model_name": model_name, "attack_class": attack_class, "confidence": float(conf),
                            "source_ip": src, "timestamp": _now_iso(), "dst_ip": dst_ip, "dst_port": TELNET_PORT,
                            "protocol": "TCP", "sensor": "telnet-r2l"})
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
    all_rows_meta = deque(maxlen=5000)
    done = set()
    print(f"TELNET R2L sensor watching {a.pcap_dir} -> {a.backend}", flush=True)
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
            all_rows_meta.clear()

        time.sleep(2)


if __name__ == "__main__":
    main()
