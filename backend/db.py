"""
CyberShield — SQLite Database Helper

เปิด connection พร้อมเปิด WAL mode ทุกครั้ง
Schema ออกแบบให้ migrate ไป PostgreSQL ได้ (ไม่ใช้ type เฉพาะของ SQLite)
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cybershield.db")

# SQL schema — ใช้ type ที่ compatible กับ PostgreSQL
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS prediction_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name  TEXT    NOT NULL,
    attack_class TEXT   NOT NULL,
    confidence  REAL    NOT NULL,
    source_ip   TEXT    NOT NULL,
    timestamp   TEXT    NOT NULL,
    is_alert    INTEGER NOT NULL DEFAULT 0
);
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON prediction_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_model ON prediction_events (model_name);
CREATE INDEX IF NOT EXISTS idx_events_alert ON prediction_events (is_alert);
"""

CREATE_INCIDENTS_SQL = """
CREATE TABLE IF NOT EXISTS incident_status (
    event_id   INTEGER PRIMARY KEY,
    status     TEXT NOT NULL DEFAULT 'OPEN',
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    action    TEXT NOT NULL,
    target    TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blocked_ips (
    ip         TEXT PRIMARY KEY,
    blocked_by TEXT NOT NULL,
    blocked_at TEXT NOT NULL
);
"""


def get_db() -> sqlite3.Connection:
    """เปิด SQLite connection พร้อม WAL mode และ auto-create schema"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")  # ต้องเปิด WAL ทุกครั้ง
    conn.row_factory = sqlite3.Row  # ให้ query ได้ผลลัพธ์เป็น dict-like
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
    model_name: str,
    attack_class: str,
    confidence: float,
    source_ip: str,
    timestamp: str,
    is_alert: bool = False,
) -> int:
    """บันทึก Prediction Event ลง SQLite — return row id"""
    conn = get_db()
    try:
        cursor = conn.execute(
            """
            INSERT INTO prediction_events
                (model_name, attack_class, confidence, source_ip, timestamp, is_alert)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (model_name, attack_class, confidence, source_ip, timestamp, int(is_alert)),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_prediction_events(
    limit: int = 100,
    offset: int = 0,
    model_name: str | None = None,
    attack_class: str | None = None,
    alerts_only: bool = False,
    since: str | None = None,
) -> list[dict]:
    """ดึง Prediction Events จาก SQLite พร้อม filters"""
    conn = get_db()
    try:
        query = "SELECT * FROM prediction_events WHERE 1=1"
        params: list = []

        if model_name:
            query += " AND model_name = ?"
            params.append(model_name)
        if attack_class:
            query += " AND attack_class = ?"
            params.append(attack_class)
        if alerts_only:
            query += " AND is_alert = 1"
        if since:
            query += " AND timestamp >= ?"
            params.append(since)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def set_incident_status(event_id: int, status: str, updated_by: str, updated_at: str) -> None:
    """Upsert สถานะ incident ของ event หนึ่ง ๆ"""
    conn = get_db()
    try:
        conn.execute(
            """
            INSERT INTO incident_status (event_id, status, updated_by, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(event_id) DO UPDATE SET
                status = excluded.status,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
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
