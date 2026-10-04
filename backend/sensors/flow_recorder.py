"""
CyberShield — Flow Recorder (เก็บ flow จริงจาก nfstream พร้อม label สำหรับเทรน/ทดสอบ)

เป้าหมาย: ได้ข้อมูลโจมตีจาก "เครื่องมือหลายตัว" + ค่าจาก nfstream จริง (แก้ช่องโหว่ที่ Flow v2
เห็นเครื่องมือน้อย และ nfstream-vs-CICFlowMeter ยังไม่เคยตรวจเทียบ)

⚠️ ใช้โจมตีได้เฉพาะเครื่อง/เครือข่ายที่เป็นของคุณเอง (เช่น VM เป้าหมายบน home LAN ของตัวเอง)

⚠️ ทดสอบแล้ว (VM จริง, nfstream 6.6.0): --source lo (loopback) จับ flow ไม่ได้เลย แม้มี traffic จริง
(ยืนยัน 0 flows ด้วย ab ยิงใส่ 127.0.0.1) — ข้อจำกัดของ nfstream/libpcap กับ loopback framing
ต้องจับผ่าน interface จริง (เช่น enp0s3) หรือ veth/bridge ที่มี Ethernet framing เท่านั้น

Label: flow ที่ src_ip อยู่ใน --attacker ได้ label ตาม --label ที่เหลือเป็น BENIGN
(ไม่ติด label ผิดถ้ามี traffic ปกติปนอยู่ระหว่างจับ)

ตัวอย่าง (ต้องรัน root บน Linux VM):
    sudo python backend/sensors/flow_recorder.py --tool hulk --label DoS --attacker 192.168.1.50
    sudo python backend/sensors/flow_recorder.py --tool benign --label BENIGN     # traffic ปกติล้วน
    python backend/sensors/flow_recorder.py --source capture.pcap --tool hulk --label DoS --attacker 192.168.1.50

ผลลัพธ์: data/captures/<tool>_<เวลา>.csv — 1 แถวต่อ flow เรียงตามลำดับที่ nfstream ปล่อย (flow-end)
ซึ่งเป็นลำดับเดียวกับที่ SourceWindowTracker / ตอนเทรนใช้ ห้าม sort ใหม่
คอลัมน์: meta (src_ip, dst_ip, dst_port, start_ms, end_ms) + 43 primitive (PRIM_COLS) + tool + label
"""

import argparse
import csv
import os
import sys
import threading
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.flow_features import (  # noqa: E402
    PRIM_COLS,
    nfstream_flow_meta,
    nfstream_flow_to_primitives,
)

LABELS = ("BENIGN", "DoS", "DDoS", "BruteForce")
META_COLS = ["src_ip", "dst_ip", "dst_port", "start_ms", "end_ms"]
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "captures")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Record labelled nfstream flows to CSV")
    p.add_argument("--source", default=os.getenv("NETWORK_INTERFACE", "eth0"),
                   help="interface (live) หรือไฟล์ .pcap")
    p.add_argument("--tool", required=True, help="ชื่อเครื่องมือโจมตี (หรือ 'benign') ใช้ตั้งชื่อไฟล์/คอลัมน์ tool")
    p.add_argument("--label", required=True, choices=LABELS, help="label ของ flow จาก --attacker")
    p.add_argument("--attacker", default="", help="src IP ของผู้โจมตี คั่นด้วย , (ว่างได้ถ้า --label BENIGN)")
    p.add_argument("--max-minutes", type=float, default=0, help="หยุดเองหลัง N นาที (0 = รอ Ctrl+C)")
    return p


def main():
    args = build_parser().parse_args()
    attackers = {a.strip() for a in args.attacker.split(",") if a.strip()}
    if args.label != "BENIGN" and not attackers:
        sys.exit("ต้องระบุ --attacker เมื่อ label ไม่ใช่ BENIGN (ไม่งั้นทุก flow จะถูก label เป็น BENIGN)")

    import nfstream  # import ช้า: ไม่ต้องมี nfstream ตอนแค่ --help / test

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{args.tool}_{time.strftime('%Y%m%d_%H%M%S')}.csv")

    streamer = nfstream.NFStreamer(
        source=args.source,
        statistical_analysis=True,
        accounting_mode=3,   # ต้องตรงกับ network_sensor.py
        idle_timeout=120,
    )

    deadline = time.time() + args.max_minutes * 60 if args.max_minutes else None
    counts = {}

    # --max-minutes ใช้เช็คแค่ตอนมี flow ใหม่เข้ามาเท่านั้น (nfstream iterator เป็น blocking call
    # ไม่มี API หยุดจากนอก loop) — ถ้า source เงียบ (เช่น flow ติดอยู่ใน idle_timeout 120s ยังไม่ถูกปล่อย)
    # loop จะค้างได้แม้เลยเวลาที่ตั้งไปแล้ว watchdog thread นี้บังคับจบ process ให้แน่นอน
    stop_timer = None
    if deadline:
        def _hard_stop():
            print(f"⏱️ ครบ {args.max_minutes:g} นาทีแล้วแต่ไม่มี flow ใหม่เข้ามา "
                  f"(source อาจเงียบ หรือ nfstream ยังไม่ flush flow — ดู idle_timeout) — บังคับหยุด", flush=True)
            os._exit(0)  # ข้าม cleanup ปกติ: บันทึกสิ่งที่ flush แล้วไว้พอ ดีกว่าค้างไม่จบ

        stop_timer = threading.Timer(args.max_minutes * 60, _hard_stop)
        stop_timer.daemon = True
        stop_timer.start()

    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(META_COLS + PRIM_COLS + ["tool", "label"])
        f.flush()
        try:
            for flow in streamer:
                src_ip, start_ms, dst_ip, dst_port = nfstream_flow_meta(flow)
                label = args.label if src_ip in attackers else "BENIGN"
                counts[label] = counts.get(label, 0) + 1
                w.writerow([src_ip, dst_ip, dst_port, start_ms, float(flow.bidirectional_last_seen_ms)]
                           + nfstream_flow_to_primitives(flow) + [args.tool, label])
                f.flush()  # ทุกแถว: _hard_stop ใช้ os._exit ข้าม cleanup ปกติ ข้อมูลที่ยังไม่ flush จะหาย
                if sum(counts.values()) % 500 == 0:
                    print(f"  {counts}", flush=True)
                if deadline and time.time() >= deadline:
                    break
        except KeyboardInterrupt:
            pass
    if stop_timer:
        stop_timer.cancel()
    print(f"saved {path}  {counts}")


if __name__ == "__main__":
    main()
