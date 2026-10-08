"""
CyberShield — SQLite Database Helper (ตัวช่วยจัดการฐานข้อมูล)

เปิด SQLite connection พร้อมเปิด WAL mode ทุกครั้ง
Schema ออกแบบให้ migrate ไป PostgreSQL ได้ (ไม่ใช้ type เฉพาะของ SQLite)
"""

import sqlite3  # ไลบรารี SQLite ใน Python standard library ไม่ต้องติดตั้งเพิ่ม
import os       # ใช้ดึง path ของไฟล์ database ให้ถูกต้องไม่ว่าจะรันจาก directory ไหน

# ── Path ของไฟล์ฐานข้อมูล ──
# os.path.dirname(__file__) = โฟลเดอร์ที่ไฟล์ db.py อยู่ (backend/)
# ".." = ขึ้นไป 1 ระดับ = root ของโปรเจค
# → cybershield.db จะอยู่ที่ root ไม่ใช่ใน backend/
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cybershield.db")

# ── SQL Schema: ตาราง prediction_events ──
# เก็บทุก prediction ที่โมเดลส่งมาจาก sensors + manual test
# ใช้ type ที่ compatible กับ PostgreSQL (INTEGER, TEXT, REAL)
# เพื่อให้ migrate ได้โดยไม่ต้องแก้ schema
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS prediction_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- รหัส event ไม่ซ้ำกัน
    model_name  TEXT    NOT NULL,  -- โมเดลที่ตรวจพบ: "intrusion", "flow", "sqli"
    attack_class TEXT   NOT NULL,  -- ชื่อ class ที่ทำนาย: "Normal", "R2L", "SQLi" ฯลฯ
    confidence  REAL    NOT NULL,  -- ค่าความมั่นใจ 0.0-1.0
    source_ip   TEXT    NOT NULL,  -- IP ต้นทางที่ตรวจพบ
    timestamp   TEXT    NOT NULL,  -- เวลา ISO 8601 เช่น 2025-01-01T12:00:00
    is_alert    INTEGER NOT NULL DEFAULT 0  -- 1 = confidence >= threshold (ภัยคุกคาม), 0 = ปกติ
);
"""

# ── Indexes เพื่อเพิ่มความเร็ว Query ──
# timestamp DESC: ใช้บ่อยที่สุด (ดึงเหตุการณ์ล่าสุด)
# model_name: filter ตามโมเดลใน /api/logs
# is_alert: filter เฉพาะ alert ใน /api/logs และ Dashboard
CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON prediction_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_model ON prediction_events (model_name);
CREATE INDEX IF NOT EXISTS idx_events_alert ON prediction_events (is_alert);
"""

# ── SQL Schema: ตารางสำหรับระบบ Incident Management ──
CREATE_INCIDENTS_SQL = """
CREATE TABLE IF NOT EXISTS incident_status (
    -- สถานะ triage ของแต่ละ prediction event (OPEN/INVESTIGATING/MITIGATED)
    event_id   INTEGER PRIMARY KEY,   -- FK ไป prediction_events.id (ไม่มี FK constraint เพื่อ simplicity)
    status     TEXT NOT NULL DEFAULT 'OPEN',  -- สถานะปัจจุบัน
    updated_by TEXT NOT NULL,         -- username ที่อัปเดตล่าสุด
    updated_at TEXT NOT NULL          -- เวลา ISO 8601 ที่อัปเดต
);
CREATE TABLE IF NOT EXISTS audit_log (
    -- บันทึกทุก action ที่ operator ทำ (เช่น กด MITIGATED, บล็อก IP)
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,  -- ผู้ดำเนินการ
    action    TEXT NOT NULL,  -- คำอธิบาย action เช่น "เริ่มตรวจสอบ"
    target    TEXT NOT NULL,  -- เป้าหมาย เช่น "Ref #42 (192.168.1.1)"
    timestamp TEXT NOT NULL   -- เวลา ISO 8601
);
CREATE TABLE IF NOT EXISTS blocked_ips (
    -- รายการ IP ที่ถูก quarantine (block) โดย operator
    ip         TEXT PRIMARY KEY,  -- IP address (unique, ซ้ำไม่ได้)
    blocked_by TEXT NOT NULL,     -- username ที่บล็อก
    blocked_at TEXT NOT NULL      -- เวลา ISO 8601 ที่บล็อก
);
"""


def get_db() -> sqlite3.Connection:
    """เปิด SQLite connection พร้อมตั้งค่า WAL mode และ row_factory

    เรียกทุกครั้งที่ต้องการ connection — ไม่ใช้ connection pool
    เพราะ SQLite ไม่รองรับ multi-thread access บน connection เดิม
    """
    conn = sqlite3.connect(DB_PATH)

    # WAL (Write-Ahead Logging) mode: ให้ read กับ write ทำงานพร้อมกันได้
    # โดยไม่ต้อง lock ทั้งไฟล์ — จำเป็นสำหรับ FastAPI async + sensors
    # ต้องเปิดทุกครั้งที่สร้าง connection ใหม่ (SQLite ไม่จำ setting ข้าม connection)
    conn.execute("PRAGMA journal_mode=WAL")

    # row_factory = sqlite3.Row ทำให้ผลลัพธ์ query เข้าถึงได้แบบ dict
    # เช่น row["id"] แทน row[0] — ง่ายต่อการอ่านและลด bug จาก index ผิด
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """สร้าง tables และ indexes ถ้ายังไม่มี — เรียกตอน app startup"""
    conn = get_db()
    try:
        conn.executescript(CREATE_TABLE_SQL + CREATE_INDEX_SQL + CREATE_INCIDENTS_SQL)
        conn.commit()
    finally:
        conn.close()


async def save_prediction_event(
    model_name: str,    # "intrusion", "flow", หรือ "sqli"
    attack_class: str,  # ชื่อ class ที่โมเดลทำนาย เช่น "R2L", "SQLi", "Normal"
    confidence: float,  # ค่าความมั่นใจ 0.0-1.0
    source_ip: str,     # IP ต้นทาง (จาก network packet หรือ HTTP request)
    timestamp: str,     # เวลา ISO 8601 ที่ตรวจพบ
    is_alert: bool = False,  # True ถ้า confidence >= threshold (กำหนดใน internal.py)
) -> int:
    """บันทึก Prediction Event ลง SQLite แล้วคืน row id ของแถวที่เพิ่งบันทึก

    เรียกจาก internal.py (sensor events) และสามารถเรียกจากที่อื่นได้
    เป็น async เพื่อให้ FastAPI ไม่ blocking ระหว่างรอ I/O
    """
    conn = get_db()
    try:
        cursor = conn.execute(
            """
            INSERT INTO prediction_events
                (model_name, attack_class, confidence, source_ip, timestamp, is_alert)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            # int(is_alert) แปลง True/False → 1/0 เพราะ SQLite ไม่มี boolean type
            (model_name, attack_class, confidence, source_ip, timestamp, int(is_alert)),
        )
        conn.commit()              # บันทึกลงดิสก์จริง
        return cursor.lastrowid   # คืน id ของแถวใหม่ — ใช้ broadcast ใน ws.py
    finally:
        conn.close()  # ปิด connection ทุกกรณี (ทั้ง success และ exception)


def get_prediction_events(
    limit: int = 100,          # จำนวน rows สูงสุดที่ดึง (ป้องกัน response ใหญ่เกินไป)
    offset: int = 0,           # ข้าม rows แรก offset ตัว (สำหรับ pagination)
    model_name: str | None = None,     # กรอง เฉพาะ model นี้ (None = ทุก model)
    attack_class: str | None = None,   # กรองเฉพาะ class นี้ (None = ทุก class)
    alerts_only: bool = False,         # True = เฉพาะ is_alert=1 (confidence >= threshold)
    since: str | None = None,          # กรองเฉพาะ events หลังจากเวลานี้ (ISO timestamp)
) -> list[dict]:
    """ดึง Prediction Events จาก SQLite พร้อม filters และ pagination

    ใช้ dynamic SQL query สร้าง WHERE clause ตาม filter ที่ระบุ
    ถ้าไม่ระบุ filter ไหนเลย จะดึง events ทั้งหมด (ตาม limit)
    """
    conn = get_db()
    try:
        # เริ่มจาก WHERE 1=1 เพื่อให้เพิ่ม AND condition ได้สะดวก
        # (ถ้าไม่มี WHERE 1=1 ต้องเช็คว่า condition แรกยังไม่มีก่อนจะใส่ WHERE)
        query = "SELECT * FROM prediction_events WHERE 1=1"
        params: list = []  # list ของ parameter สำหรับ parameterized query (ป้องกัน SQL injection)

        # เพิ่ม filter ตาม argument ที่ระบุมา
        if model_name:
            query += " AND model_name = ?"  # ? = placeholder ปลอดภัยจาก injection
            params.append(model_name)
        if attack_class:
            query += " AND attack_class = ?"
            params.append(attack_class)
        if alerts_only:
            query += " AND is_alert = 1"  # 1 = True ใน SQLite
        if since:
            # ดึงเฉพาะ events ที่เกิดขึ้นหลังจาก timestamp นี้
            # ใช้ >= เพื่อรวมเหตุการณ์ที่เกิดพอดีกับเวลา since ด้วย
            query += " AND timestamp >= ?"
            params.append(since)

        # เรียงลำดับจากใหม่ → เก่า และกำหนด limit/offset สำหรับ pagination
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        # แปลง sqlite3.Row → dict ธรรมดา เพื่อให้ serialize เป็น JSON ได้
        return [dict(row) for row in rows]
    finally:
        conn.close()


BENIGN_CLASSES = {"normal", "benign"}


def _severity_band(confidence: float) -> str:
    """ต้องตรงกับ getSevKey ใน frontend (>=.95 / >=.90 / >=.80 / else)"""
    if confidence >= 0.95:
        return "CRITICAL"
    if confidence >= 0.90:
        return "HIGH"
    if confidence >= 0.80:
        return "MEDIUM"
    return "LOW"


def _is_private_ip(ip: str) -> bool | None:
    """True = ภายในเครือข่าย, False = ภายนอก, None = parse ไม่ได้"""
    import ipaddress
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return None


def get_event_stats(since: str | None = None, bucket_minutes: int = 60) -> dict:
    """สรุปสถิติ prediction_events สำหรับ Dashboard/Analytics

    Query แบบ portable (SELECT ธรรมดา) แล้วรวมยอดใน Python เพื่อให้ migrate PostgreSQL ได้
    "alert" = is_alert=1 และ class ไม่ใช่ Normal/BENIGN
    """
    from collections import Counter
    from datetime import datetime, timedelta

    conn = get_db()
    try:
        query = ("SELECT model_name, attack_class, confidence, source_ip, timestamp, is_alert "
                 "FROM prediction_events WHERE 1=1")
        params: list = []
        if since:
            query += " AND timestamp >= ?"
            params.append(since)
        query += " ORDER BY timestamp ASC LIMIT 200000"
        rows = conn.execute(query, params).fetchall()
    finally:
        conn.close()

    by_class: Counter = Counter()
    by_model: Counter = Counter()
    by_severity: Counter = Counter()
    top_sources: Counter = Counter()
    scope: Counter = Counter()
    buckets: dict[str, dict] = {}
    total = alerts = 0
    step = timedelta(minutes=max(1, bucket_minutes))

    for r in rows:
        total += 1
        is_attack = bool(r["is_alert"]) and r["attack_class"].lower() not in BENIGN_CLASSES
        # floor timestamp ลง bucket
        try:
            # ทิ้ง tzinfo เพื่อไม่ให้ timestamp ที่มี/ไม่มี "Z" แยก bucket กัน
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")).replace(tzinfo=None)
            epoch = datetime(ts.year, ts.month, ts.day)
            floored = epoch + ((ts - epoch) // step) * step
            key = floored.isoformat()
        except ValueError:
            key = None
        if key is not None:
            b = buckets.setdefault(key, {"t": key, "alerts": 0, "normal": 0})
            b["alerts" if is_attack else "normal"] += 1
        if not is_attack:
            continue
        alerts += 1
        by_class[r["attack_class"]] += 1
        by_model[r["model_name"]] += 1
        by_severity[_severity_band(r["confidence"])] += 1
        top_sources[r["source_ip"]] += 1
        private = _is_private_ip(r["source_ip"])
        scope["internal" if private else "unknown" if private is None else "external"] += 1

    def as_list(c: Counter, n: int | None = None) -> list[dict]:
        return [{"key": k, "count": v} for k, v in c.most_common(n)]

    return {
        "totals": {"events": total, "alerts": alerts, "normal": total - alerts},
        "by_class": as_list(by_class),
        "by_model": as_list(by_model),
        "by_severity": {k: by_severity.get(k, 0) for k in ("CRITICAL", "HIGH", "MEDIUM", "LOW")},
        "top_sources": as_list(top_sources, 10),
        "source_scope": {k: scope.get(k, 0) for k in ("internal", "external", "unknown")},
        "timeline": [buckets[k] for k in sorted(buckets)],
    }


def set_incident_status(event_id: int, status: str, updated_by: str, updated_at: str) -> None:
    """Upsert สถานะ incident: INSERT ถ้ายังไม่มี, UPDATE ถ้ามีอยู่แล้ว

    ใช้ INSERT ... ON CONFLICT DO UPDATE (UPSERT) แทนการเช็คก่อนว่ามีหรือเปล่า
    — atomic operation ป้องกัน race condition กรณี request พร้อมกัน
    """
    conn = get_db()
    try:
        conn.execute(
            """
            INSERT INTO incident_status (event_id, status, updated_by, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(event_id) DO UPDATE SET
                status     = excluded.status,     -- อัปเดต status ใหม่
                updated_by = excluded.updated_by, -- อัปเดต ผู้แก้ไข
                updated_at = excluded.updated_at  -- อัปเดตเวลา
            """,
            (event_id, status, updated_by, updated_at),
        )
        conn.commit()
    finally:
        conn.close()


def get_incident_statuses() -> dict[int, str]:
    """คืน map event_id -> status ทั้งหมด"""
    conn = get_db()
    try:
        rows = conn.execute("SELECT event_id, status FROM incident_status").fetchall()
        return {row["event_id"]: row["status"] for row in rows}
    finally:
        conn.close()


def add_audit_log(username: str, action: str, target: str, timestamp: str) -> int:
    """บันทึกการดำเนินการของผู้ปฏิบัติงาน — return row id"""
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO audit_log (username, action, target, timestamp) VALUES (?, ?, ?, ?)",
            (username, action, target, timestamp),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_audit_logs(limit: int = 50) -> list[dict]:
    """ดึงบันทึกการดำเนินการล่าสุด"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY timestamp DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def block_ip(ip: str, blocked_by: str, blocked_at: str) -> None:
    """เพิ่ม IP เข้ารายการ quarantine (idempotent)"""
    conn = get_db()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO blocked_ips (ip, blocked_by, blocked_at) VALUES (?, ?, ?)",
            (ip, blocked_by, blocked_at),
        )
        conn.commit()
    finally:
        conn.close()


def unblock_ip(ip: str) -> None:
    """เอา IP ออกจากรายการ quarantine"""
    conn = get_db()
    try:
        conn.execute("DELETE FROM blocked_ips WHERE ip = ?", (ip,))
        conn.commit()
    finally:
        conn.close()


def get_blocked_ips() -> list[dict]:
    """ดึงรายการ IP ที่ถูก quarantine ทั้งหมด"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM blocked_ips ORDER BY blocked_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
