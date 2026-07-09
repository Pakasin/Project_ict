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
        conn.executescript(CREATE_TABLE_SQL + CREATE_INDEX_SQL)
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

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
