# HTTP sensor บน VM (Python ไม่มี TensorFlow)

`http_sensor_lite.py` = `http_sensor.py` เวอร์ชันที่รันบนเครื่องที่ลง TensorFlow ไม่ได้ (เช่น VM `project` ที่ Python 3.14 ไม่มี TF wheel)
การตัดสินใจใช้โค้ดชุดเดียวกัน (`backend/sqli_detect.py`) ต่างกันแค่คะแนนโมเดลถูกขอจาก backend ผ่าน `/internal/sqli-score`
ถ้า backend ไม่ตอบ sensor ใช้กฎ `sqli_rules` อย่างเดียวต่อ (ไม่ล้ม)

```
traffic ─► VM:8081 mitmproxy (reverse → nginx:80) ─► http_sensor_lite.py
                                                      ├ สกัดค่า + กฎ sqli_rules   (บน VM)
                                                      └ คะแนนโมเดล v2 ◄── SSH reverse tunnel ◄── backend บน host
```

## ติดตั้งครั้งเดียว (บน VM)
- `sudo apt-get install -y mitmproxy` (ลองแล้ว: 8.1.1 ใช้ได้กับ Python 3.14.4 ของ VM)
- คัดลอก 7 ไฟล์ไป `~/cs/` โดยรักษาโครงสร้างโฟลเดอร์: `backend/__init__.py`, `backend/sqli_extract.py`, `backend/sqli_rules.py`,
  `backend/sqli_detect.py`, `backend/sensors/__init__.py`, `backend/sensors/heartbeat.py`, `backend/sensors/http_sensor_lite.py`
- สร้าง `~/cs/env` (สิทธิ์ 600) — **ห้ามใส่ token ในบรรทัดคำสั่ง** (ps เห็น):
  ```
  INTERNAL_TOKEN=<ค่าเดียวกับ .env ของ backend>
  CYBERSHIELD_BACKEND=http://127.0.0.1:8001
  SQLI_LIVE_ML_THRESHOLD=0.99
  CS_SENSOR_STATS=/home/vboxuser/cs/stats.jsonl
  ```

## เปิดใช้
1. **host:** backend ปลายทาง — สำหรับทดสอบให้ใช้ backend แยกที่ DB ชั่วคราว ไม่ใช่ตัวจริง ไม่งั้น event ทดสอบจะปนข้อมูลจริง
   (ดู `docs`/CLAUDE.md: หน้า Test ต้องแยกจากเหตุการณ์จริง)
2. **host → VM:** `ssh -N -R 127.0.0.1:8001:127.0.0.1:8001 vboxuser@<VM>` ให้ VM เรียก `127.0.0.1:8001` ถึง backend ได้
3. **VM:** `cd ~/cs && set -a && . ./env && set +a && mitmdump --mode reverse:http://127.0.0.1:80 --listen-port 8081 -s backend/sensors/http_sensor_lite.py`
   - reverse mode ส่งต่อไปยังปลายทางที่กำหนดเท่านั้น (ไม่ใช่ open proxy) และไม่ต้องแก้ iptables
   - `--listen-host 127.0.0.1` ถ้าไม่อยากเปิดพอร์ตให้เครือข่ายอื่น; ใช้ `--mode transparent` + iptables REDIRECT ได้ตามออกแบบเดิม (ต้อง root)

## อ่านผล
- **บน VM:** `python3 ~/cs/backend/sensors/http_stats_summary.py ~/cs/stats.jsonl` → จำนวน request, ถูกจับกี่ตัว (กฎ/โมเดล), กฎไหนทำงาน
- **บน host:** `GET /api/logs?model_name=sqli_rules` และ `model_name=sqli` ของ backend ทดสอบ, หน้า Logs กรองโมเดล `SQLi signature rules`
- ตัวนับ "requests seen" คือทุก request ที่ผ่าน proxy; request ที่ **ไม่ถูกจับ** ไม่มีรายละเอียดเก็บไว้ (ตั้งใจ — ข้อความ request อาจมีข้อมูลผู้ใช้)
  ถ้าต้องดูว่าตัวไหนหลุด ให้เก็บ pcap/log ฝั่งเว็บเองในช่วงทดสอบ

## ปิด
หยุด `mitmdump` บน VM, ปิด ssh tunnel, ปิด backend ทดสอบ, ลบ `~/cs/env` (มี token) และ `~/cs/stats.jsonl`

## ข้อจำกัด
- ตัวเลขความแม่นยำทั้งหมดมาจากชุดข้อมูลสาธารณะและชุดมือเขียน (CONTEXT.md Known Limitations #0) — ยังไม่เคยวัดกับเครื่องมือโจมตีจริงบน VM นี้
- ทดสอบแล้วเฉพาะ request ปกติ + การเล่นซ้ำในเครื่อง ไม่ใช่ทราฟฟิกสดจากเครื่องมือ
- reverse mode ต่างจากที่ออกแบบไว้ (transparent) — โค้ดตรวจจับเหมือนกัน แต่การดักผ่าน iptables ยังไม่ได้ลอง
