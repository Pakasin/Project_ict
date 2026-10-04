"""
CyberShield — Flow Recorder (เก็บ flow จริงจาก nfstream พร้อม label สำหรับเทรน/ทดสอบ)

เป้าหมาย: ได้ข้อมูลโจมตีจาก "เครื่องมือหลายตัว" + ค่าจาก nfstream จริง (แก้ช่องโหว่ที่ Flow v2
เห็นเครื่องมือน้อย และ nfstream-vs-CICFlowMeter ยังไม่เคยตรวจเทียบ)

⚠️ ใช้โจมตีได้เฉพาะเครื่อง/เครือข่ายที่เป็นของคุณเอง (เช่น VM เป้าหมายบน home LAN ของตัวเอง)

⚠️ ทดสอบแล้ว (VM จริง, nfstream 6.6.0): --source lo (loopback) จับ flow ไม่ได้เลย แม้มี traffic จริง
(ยืนยัน 0 flows ด้วย ab ยิงใส่ 127.0.0.1) — ข้อจำกัดของ nfstream/libpcap กับ loopback framing
ต้องจับผ่าน interface จริง (เช่น enp0s3) หรือ veth/bridge ที่มี Ethernet framing เท่านั้น

⚠️ ทดสอบแล้ว (VM จริง): nfstream live capture มีช่วง "warmup" หลังสร้าง NFStreamer — burst สั้นๆ
ไม่กี่ครั้งที่จบเร็วมาก (เช่น SSH handshake เสร็จใน <100ms) ภายในไม่กี่วินาทีแรกอาจไม่ถูกจับเป็น flow เลย
(ยืนยัน: 3 SSH attempts ติดกันหลัง recorder เริ่ม 2s ได้ 0 flow สด แต่ pcap เดียวกันอ่านย้อนหลังผ่าน
nfstream offline ได้ครบ 3 flow ถูกต้องทุกค่า — ตัด live-capture timing ออกจากสมการแล้วพิสูจน์ว่า flow-matching
logic ไม่ใช่ปัญหา) workload ที่ยืดยาวกว่านี้ (เช่น ab หลายร้อย request) ไม่เจอปัญหานี้เพราะมี traffic ต่อเนื่อง
ข้ามช่วง warmup ไปเอง — เวลาเก็บ burst สั้น (brute-force, port scan) ให้ sleep ≥10s ก่อนเริ่มยิง และยิงหลายสิบครั้ง
กระจายเวลา ไม่ใช่ไม่กี่ครั้งติดกันทันที

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
import signal
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
    # process group แยกของตัวเอง: nfstream fork worker ภายใน (ยืนยันจริงจากการทดสอบบน VM — process
    # ค้างอยู่หลัง os._exit() ของ parent เป็นสิบนาที แย่ง capture กับรอบถัดไปจนได้ 0 flow) worker พวกนี้
    # สืบ pgid จาก parent ตอน fork เลยฆ่าพร้อมกันได้ด้วย killpg ส่วน os._exit() เดิมฆ่าได้แค่ parent เอง
    os.setpgrp()
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
                  f"(source อาจเงียบ หรือ nfstream ยังไม่ flush flow — ดู idle_timeout) — บังคับหยุดทั้ง process group",
                  flush=True)
            os.killpg(os.getpgrp(), signal.SIGKILL)  # ฆ่า nfstream worker ที่ fork ไว้ด้วย ไม่ใช่แค่ตัวเอง

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
    print(f"saved {path}  {counts}", flush=True)
    # แม้จบ loop ปกติ (ไม่ใช่ watchdog) ก็ฆ่า process group ตัวเองตรงนี้ — ยืนยันจริงจากการทดสอบว่า
    # nfstream worker ที่ fork ไว้ไม่จบเองตาม parent (แม้ parent คืนจาก main() / interpreter จะ exit
    # ตามปกติ) ปล่อยไว้จะกลายเป็น orphan process ที่ยังแย่ง capture บน interface เดิมกับรอบถัดไป
    os.killpg(os.getpgrp(), signal.SIGKILL)


if __name__ == "__main__":
    main()
