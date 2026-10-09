"""
CyberShield — SQLite Database Helper (ตัวช่วยจัดการฐานข้อมูล)

เปิด SQLite connection พร้อมเปิด WAL mode ทุกครั้ง
Schema ออกแบบให้ migrate ไป PostgreSQL ได้ (ไม่ใช้ type เฉพาะของ SQLite)
"""

import sqlite3  # ไลบรารี SQLite ใน Python standard library ไม่ต้องติดตั้งเพิ่ม
import re
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
CREATE TABLE IF NOT EXISTS users (
    -- บัญชี General User ที่สมัครเอง (admin อยู่ใน .env ไม่อยู่ที่นี่)
    username      TEXT PRIMARY KEY COLLATE NOCASE,  -- ไม่แยกตัวพิมพ์เล็ก/ใหญ่
    password_hash TEXT NOT NULL,   -- pbkdf2_sha256$iters$salt$hash (backend/auth/passwords.py)
    name          TEXT NOT NULL,
    lastname      TEXT NOT NULL,
    phone         TEXT NOT NULL,
    email         TEXT NOT NULL,
    created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mfa (
    -- TOTP MFA ต่อบัญชี (ทั้ง admin และ General User) — enabled=0 คือยังตั้งค่าไม่เสร็จ
    username        TEXT PRIMARY KEY COLLATE NOCASE,
    secret          TEXT NOT NULL,           -- base32 (ต้องเก็บแบบอ่านได้เพื่อคำนวณ TOTP)
    enabled         INTEGER NOT NULL DEFAULT 0,
    last_counter    INTEGER NOT NULL DEFAULT 0,  -- TOTP counter ล่าสุดที่ใช้ (กัน replay)
    recovery_hashes TEXT NOT NULL DEFAULT '[]',  -- JSON list ของ sha256 recovery code ที่ยังไม่ใช้
    created_at      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS incident_meta (
    -- ข้อมูลเสริมของ incident: ผู้รับผิดชอบ
    event_id   INTEGER PRIMARY KEY,
    assignee   TEXT,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS incident_notes (
    -- บันทึกของ operator ต่อ incident
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id  INTEGER NOT NULL,
    username  TEXT NOT NULL,
    note      TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_event ON incident_notes (event_id);
CREATE TABLE IF NOT EXISTS app_settings (
    -- ค่าตั้งค่าที่แก้ผ่าน UI (เช่น threshold ต่อโมเดล) — override ค่าจาก .env
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sensor_heartbeat (
    -- sensor ส่ง heartbeat / event ล่าสุดเมื่อไร (ใช้แสดงสุขภาพ sensor)
    sensor    TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    info      TEXT
);
CREATE TABLE IF NOT EXISTS mute_rules (
    -- กฎปิดเสียง: event ที่ตรงกฎยังถูกบันทึก (ตรวจย้อนหลังได้) แต่ไม่นับเป็น alert และไม่ส่ง webhook
    -- ต้องมีวันหมดอายุเสมอ (ไม่มีกฎถาวร) และต้องระบุอย่างน้อย source_ip หรือ attack_class
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    source_ip    TEXT,                 -- NULL = ทุก IP
    attack_class TEXT,                 -- NULL = ทุกประเภท
    reason       TEXT NOT NULL,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL,        -- ISO 8601 เวลาท้องถิ่น (เหมือน sensor)
    expires_at   TEXT NOT NULL
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
        # migration: คอลัมน์ที่เพิ่มทีหลัง (ฐานข้อมูลเก่าไม่มี) — nullable จึงเพิ่มได้ปลอดภัย
        have = {r["name"] for r in conn.execute("PRAGMA table_info(prediction_events)")}
        for col, typ in (("dst_ip", "TEXT"), ("dst_port", "INTEGER"), ("protocol", "TEXT"),
                         ("bytes", "INTEGER"), ("sensor", "TEXT"), ("muted_by", "INTEGER")):
            if col not in have:
                conn.execute(f"ALTER TABLE prediction_events ADD COLUMN {col} {typ}")
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
    dst_ip: str | None = None,
    dst_port: int | None = None,
    protocol: str | None = None,
    bytes_: int | None = None,
    sensor: str | None = None,
    muted_by: int | None = None,   # id ของ mute rule ที่ปิดเสียง event นี้ (ถ้ามี — is_alert จะเป็น False)
) -> int:
    """บันทึก Prediction Event ลง SQLite แล้วคืน row id ของแถวที่เพิ่งบันทึก

    dst_ip/dst_port/protocol/bytes/sensor เป็น optional (sensor รุ่นเก่าไม่ส่งมา)
    """
    conn = get_db()
    try:
        cursor = conn.execute(
            """
            INSERT INTO prediction_events
                (model_name, attack_class, confidence, source_ip, timestamp, is_alert,
                 dst_ip, dst_port, protocol, bytes, sensor, muted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (model_name, attack_class, confidence, source_ip, timestamp, int(is_alert),
             dst_ip, dst_port, protocol, bytes_, sensor, muted_by),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


# ช่วง confidence ของแต่ละ severity — ต้องตรง _severity_band และ getSevKey ใน frontend
SEVERITY_RANGE = {"CRITICAL": (0.95, 1.0001), "HIGH": (0.90, 0.95), "MEDIUM": (0.80, 0.90), "LOW": (0.0, 0.80)}


# คอลัมน์ที่ใช้ exclude ได้ — ชื่อคอลัมน์ถูกต่อเข้า SQL จึงต้องเป็นรายการตายตัวนี้เท่านั้น
EXCLUDABLE_COLUMNS = ("model_name", "attack_class", "source_ip")
FULL_IP_RE = re.compile(r"^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]*:[0-9a-fA-F:]+)$")


def _events_where(
    model_name: str | None,
    attack_class: str | None,
    alerts_only: bool,
    since: str | None,
    until: str | None,
    source_ip: str | None,
    q: str | None,
    severity: str | None = None,
    status: str | None = None,
    exclude: dict[str, list[str]] | None = None,
) -> tuple[str, list]:
    """สร้าง WHERE clause (parameterized) ที่ใช้ร่วมกันระหว่างดึงรายการและนับ total

    exclude: {"model_name"|"attack_class"|"source_ip": [ค่าที่ไม่เอา, ...]} ตรงแบบ exact (NOT IN)
    """
    where = " WHERE 1=1"
    params: list = []
    for col in EXCLUDABLE_COLUMNS:
        values = (exclude or {}).get(col)
        if values:
            where += f" AND {col} NOT IN ({','.join('?' * len(values))})"
            params.extend(values)
    if model_name:
        where += " AND model_name = ?"
        params.append(model_name)
    if attack_class:
        where += " AND attack_class = ?"
        params.append(attack_class)
    if alerts_only:
        where += " AND is_alert = 1"
    if since:
        where += " AND timestamp >= ?"
        params.append(since)
    if until:
        where += " AND timestamp <= ?"
        params.append(until)
    if source_ip:
        if FULL_IP_RE.match(source_ip):
            # IP ครบ = ตรงแบบ exact ("1.2.3.4" ต้องไม่ไปติด "1.2.3.45")
            where += " AND source_ip = ?"
            params.append(source_ip)
        else:
            where += " AND source_ip LIKE ?"  # พิมพ์ไม่ครบ = ค้นแบบ substring
            params.append(f"%{source_ip}%")
    if q:
        where += " AND (source_ip LIKE ? OR attack_class LIKE ? OR model_name LIKE ? OR id = ?)"
        # "EVT-42" หรือ "42" = ค้นด้วยรหัสอ้างอิง (ตรง ref ที่ frontend แสดง)
        ref = q.upper().removeprefix("EVT-")
        params.extend([f"%{q}%"] * 3 + [int(ref) if ref.isdigit() else -1])
    if severity in SEVERITY_RANGE:
        lo, hi = SEVERITY_RANGE[severity]
        where += " AND confidence >= ? AND confidence < ?"
        params.extend([lo, hi])
    if status == "OPEN":
        where += " AND id NOT IN (SELECT event_id FROM incident_status WHERE status != 'OPEN')"
    elif status in ("INVESTIGATING", "MITIGATED"):
        where += " AND id IN (SELECT event_id FROM incident_status WHERE status = ?)"
        params.append(status)
    return where, params


def get_prediction_events(
    limit: int = 100,
    offset: int = 0,
    model_name: str | None = None,
    attack_class: str | None = None,
    alerts_only: bool = False,
    since: str | None = None,
    until: str | None = None,
    source_ip: str | None = None,
    q: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    exclude: dict[str, list[str]] | None = None,
) -> tuple[list[dict], int]:
    """ดึง Prediction Events (ใหม่→เก่า) พร้อม filters/pagination คืน (rows, total ที่ตรง filter)"""
    where, params = _events_where(model_name, attack_class, alerts_only, since, until, source_ip, q, severity, status, exclude)
    conn = get_db()
    try:
        total = conn.execute("SELECT COUNT(*) FROM prediction_events" + where, params).fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM prediction_events" + where + " ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            [*params, limit, offset],
        ).fetchall()
        return [dict(row) for row in rows], total
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


def get_event_stats(since: str | None = None, bucket_minutes: int = 60, until: str | None = None) -> dict:
    """สรุปสถิติ prediction_events สำหรับ Dashboard/Analytics

    Query แบบ portable (SELECT ธรรมดา) แล้วรวมยอดใน Python เพื่อให้ migrate PostgreSQL ได้
    "alert" = is_alert=1 และ class ไม่ใช่ Normal/BENIGN
    """
    from collections import Counter
    from datetime import datetime, timedelta

    conn = get_db()
    try:
        query = ("SELECT id, model_name, attack_class, confidence, source_ip, timestamp, is_alert, dst_ip, dst_port, protocol, muted_by "
                 "FROM prediction_events WHERE 1=1")
        params: list = []
        if since:
            query += " AND timestamp >= ?"
            params.append(since)
        if until:
            query += " AND timestamp <= ?"
            params.append(until)
        query += " ORDER BY timestamp ASC LIMIT 200000"
        rows = conn.execute(query, params).fetchall()
        mitigated = {r["event_id"] for r in conn.execute(
            "SELECT event_id FROM incident_status WHERE status = 'MITIGATED'").fetchall()}
    finally:
        conn.close()

    by_class: Counter = Counter()
    by_model: Counter = Counter()
    by_severity: Counter = Counter()
    top_sources: Counter = Counter()
    scope: Counter = Counter()
    top_targets: Counter = Counter()
    top_ports: Counter = Counter()
    by_protocol: Counter = Counter()
    buckets: dict[str, dict] = {}
    total = alerts = resolved = muted = 0
    step = timedelta(minutes=max(1, bucket_minutes))

    for r in rows:
        if r["muted_by"]:
            muted += 1      # ถูก mute rule ปิดเสียง: ไม่ใช่ alert และก็ไม่ใช่ "ปกติ" — นับแยก ไม่ให้ปนกราฟ
            continue
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
        if r["id"] in mitigated:
            resolved += 1
        by_class[r["attack_class"]] += 1
        by_model[r["model_name"]] += 1
        by_severity[_severity_band(r["confidence"])] += 1
        top_sources[r["source_ip"]] += 1
        if r["dst_ip"]:
            top_targets[r["dst_ip"]] += 1
        if r["dst_port"] is not None:
            top_ports[str(r["dst_port"])] += 1
        if r["protocol"]:
            by_protocol[r["protocol"]] += 1
        private = _is_private_ip(r["source_ip"])
        scope["internal" if private else "unknown" if private is None else "external"] += 1

    def as_list(c: Counter, n: int | None = None) -> list[dict]:
        return [{"key": k, "count": v} for k, v in c.most_common(n)]

    return {
        "totals": {"events": total, "alerts": alerts, "normal": total - alerts, "resolved": resolved, "muted": muted},
        "by_class": as_list(by_class),
        "by_model": as_list(by_model),
        "by_severity": {k: by_severity.get(k, 0) for k in ("CRITICAL", "HIGH", "MEDIUM", "LOW")},
        "top_sources": as_list(top_sources, 10),
        "top_targets": as_list(top_targets, 10),
        "top_ports": as_list(top_ports, 10),
        "by_protocol": as_list(by_protocol),
        "source_scope": {k: scope.get(k, 0) for k in ("internal", "external", "unknown")},
        "timeline": [buckets[k] for k in sorted(buckets)],
    }


# ── Mute rules ──────────────────────────────────────────────────────────────────

def add_mute_rule(source_ip: str | None, attack_class: str | None, reason: str,
                  created_by: str, created_at: str, expires_at: str) -> int:
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO mute_rules (source_ip, attack_class, reason, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?)",
            (source_ip, attack_class, reason, created_by, created_at, expires_at))
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def list_mute_rules(now_iso: str, include_expired: bool = False) -> list[dict]:
    conn = get_db()
    try:
        q = "SELECT * FROM mute_rules"
        params: list = []
        if not include_expired:
            q += " WHERE expires_at > ?"
            params.append(now_iso)
        rows = conn.execute(q + " ORDER BY expires_at ASC, id ASC", params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_mute_rule(rule_id: int) -> bool:
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM mute_rules WHERE id = ?", (rule_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def find_active_mute(source_ip: str, attack_class: str, now_iso: str) -> int | None:
    """id ของกฎที่ยังไม่หมดอายุและตรงกับ event นี้ (NULL ในกฎ = ตรงทุกค่า, ที่ระบุต้องตรงแบบ exact) หรือ None"""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM mute_rules WHERE expires_at > ? "
            "AND (source_ip IS NULL OR source_ip = ?) AND (attack_class IS NULL OR attack_class = ?) "
            "ORDER BY id ASC LIMIT 1", (now_iso, source_ip, attack_class)).fetchone()
        return row["id"] if row else None
    finally:
        conn.close()


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


def get_audit_logs_for_event(event_id: int) -> list[dict]:
    """ประวัติการดำเนินการของ operator ที่เกี่ยวกับ event นี้ (target ขึ้นต้น "Ref #<id>")"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT username, action, target, timestamp FROM audit_log "
            "WHERE target = ? OR target LIKE ? ORDER BY timestamp DESC, id DESC",
            (f"Ref #{event_id}", f"Ref #{event_id} (%"),
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


# ── Event detail / notes / assignee ─────────────────────────────────────────

def get_event_by_id(event_id: int) -> dict | None:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM prediction_events WHERE id = ?", (event_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_related_events(source_ip: str, exclude_id: int, limit: int = 20) -> list[dict]:
    """events อื่นจาก source IP เดียวกัน (ใหม่→เก่า) ใช้ใน ThreatInspectModal"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM prediction_events WHERE source_ip = ? AND id != ? ORDER BY timestamp DESC LIMIT ?",
            (source_ip, exclude_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_incident_notes(event_id: int) -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, username, note, timestamp FROM incident_notes WHERE event_id = ? ORDER BY id ASC",
            (event_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def add_incident_note(event_id: int, username: str, note: str, timestamp: str) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO incident_notes (event_id, username, note, timestamp) VALUES (?, ?, ?, ?)",
            (event_id, username, note, timestamp),
        )
        conn.commit()
    finally:
        conn.close()


def set_incident_assignee(event_id: int, assignee: str | None, updated_at: str) -> None:
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO incident_meta (event_id, assignee, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(event_id) DO UPDATE SET assignee = excluded.assignee, updated_at = excluded.updated_at""",
            (event_id, assignee, updated_at),
        )
        conn.commit()
    finally:
        conn.close()


def get_incident_assignees() -> dict[int, str]:
    conn = get_db()
    try:
        rows = conn.execute("SELECT event_id, assignee FROM incident_meta WHERE assignee IS NOT NULL").fetchall()
        return {r["event_id"]: r["assignee"] for r in rows}
    finally:
        conn.close()


# ── Settings (runtime thresholds) ───────────────────────────────────────────

def get_setting(key: str) -> str | None:
    conn = get_db()
    try:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None
    finally:
        conn.close()


def set_setting(key: str, value: str) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        conn.commit()
    finally:
        conn.close()


# ── Sensor heartbeat ────────────────────────────────────────────────────────

def touch_sensor(sensor: str, last_seen: str, info: str | None = None) -> None:
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO sensor_heartbeat (sensor, last_seen, info) VALUES (?, ?, ?)
               ON CONFLICT(sensor) DO UPDATE SET last_seen = excluded.last_seen,
                                                 info = COALESCE(excluded.info, sensor_heartbeat.info)""",
            (sensor, last_seen, info),
        )
        conn.commit()
    finally:
        conn.close()


def get_sensors() -> list[dict]:
    conn = get_db()
    try:
        return [dict(r) for r in conn.execute("SELECT sensor, last_seen, info FROM sensor_heartbeat ORDER BY sensor")]
    finally:
        conn.close()


# ── Users (General User accounts) ───────────────────────────────────────────

def create_user(username: str, password_hash: str, name: str, lastname: str, phone: str,
                email: str, created_at: str) -> bool:
    """สร้างบัญชี — คืน False ถ้า username ซ้ำ (ไม่แยกตัวพิมพ์)"""
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash, name, lastname, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (username, password_hash, name, lastname, phone, email, created_at),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def get_user(username: str) -> dict | None:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ── MFA (TOTP) ──────────────────────────────────────────────────────────────

def get_mfa(username: str) -> dict | None:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM mfa WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def is_mfa_enabled(username: str) -> bool:
    m = get_mfa(username)
    return bool(m and m["enabled"])


def set_mfa_pending(username: str, secret: str, created_at: str) -> None:
    """เริ่ม/เริ่มใหม่ขั้นตั้งค่า (enabled=0) — ไม่ทับถ้า MFA เปิดอยู่แล้ว (ผู้เรียกต้องเช็กก่อน)"""
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO mfa (username, secret, enabled, last_counter, recovery_hashes, created_at) "
            "VALUES (?, ?, 0, 0, '[]', ?) "
            "ON CONFLICT(username) DO UPDATE SET secret=excluded.secret, enabled=0, last_counter=0, "
            "recovery_hashes='[]', created_at=excluded.created_at",
            (username, secret, created_at),
        )
        conn.commit()
    finally:
        conn.close()


def enable_mfa(username: str, counter: int, recovery_hashes_json: str) -> None:
    conn = get_db()
    try:
        conn.execute("UPDATE mfa SET enabled=1, last_counter=?, recovery_hashes=? WHERE username=?",
                     (counter, recovery_hashes_json, username))
        conn.commit()
    finally:
        conn.close()


def update_mfa_counter(username: str, counter: int) -> bool:
    """อัปเดต counter แบบ atomic — คืน False ถ้ามีคนใช้ counter นี้ไปแล้ว (กัน replay แบบแข่งกัน)"""
    conn = get_db()
    try:
        cur = conn.execute("UPDATE mfa SET last_counter=? WHERE username=? AND last_counter<?",
                           (counter, username, counter))
        conn.commit()
        return cur.rowcount == 1
    finally:
        conn.close()


def consume_recovery_code(username: str, code_hash: str) -> bool:
    """ใช้ recovery code (ครั้งเดียว) — คืน True ถ้าพบและลบออกแล้ว"""
    import json
    conn = get_db()
    try:
        row = conn.execute("SELECT recovery_hashes FROM mfa WHERE username=? AND enabled=1", (username,)).fetchone()
        if not row:
            return False
        hashes = json.loads(row["recovery_hashes"])
        if code_hash not in hashes:
            return False
        hashes.remove(code_hash)
        cur = conn.execute("UPDATE mfa SET recovery_hashes=? WHERE username=? AND recovery_hashes=?",
                           (json.dumps(hashes), username, row["recovery_hashes"]))
        conn.commit()
        return cur.rowcount == 1
    finally:
        conn.close()


def delete_mfa(username: str) -> None:
    conn = get_db()
    try:
        conn.execute("DELETE FROM mfa WHERE username=?", (username,))
        conn.commit()
    finally:
        conn.close()
