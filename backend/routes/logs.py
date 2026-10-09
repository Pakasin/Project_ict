"""
CyberShield — Logs API

GET /api/logs — ดึง Prediction Events จาก SQLite
รองรับ filters: model_name, attack_class, alerts_only, since, until, source_ip, q
รองรับ pagination: limit, offset
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.db import get_event_groups, get_prediction_events
from backend.mitre import technique_id_for

router = APIRouter(prefix="/api", tags=["logs"])


class LogEntry(BaseModel):
    id: int
    model_name: str
    attack_class: str
    confidence: float
    source_ip: str
    timestamp: str
    is_alert: int
    dst_ip: str | None = None
    dst_port: int | None = None
    protocol: str | None = None
    bytes: int | None = None
    sensor: str | None = None
    mitre: str | None = None  # MITRE ATT&CK technique id ของ attack_class (None = ไม่มี mapping)
    muted_by: int | None = None  # id ของ mute rule ที่ปิดเสียง event นี้ (มีค่า = ไม่นับเป็น alert)


class LogGroup(BaseModel):
    """การโจมตีหนึ่งครั้ง = event ของ (source_ip, attack_class, model_name) เดียวกันที่ห่างกันไม่เกิน gap_minutes"""
    source_ip: str
    attack_class: str
    model_name: str
    count: int
    alerts: int          # จำนวนที่นับเป็น alert
    muted: int           # จำนวนที่ถูก mute rule ปิดเสียง (ไม่หายไปจากภาพรวม)
    first_ts: str
    last_ts: str
    first_id: int
    last_id: int
    max_confidence: float
    sensors: list[str]
    duration_s: int


class GroupsResponse(BaseModel):
    ok: bool
    data: list[LogGroup]
    count: int
    total: int           # จำนวนกลุ่มทั้งหมดที่ตรง filter
    truncated: bool      # True = มี event เกินที่ยอมรวมต่อครั้ง (ใหม่สุดก่อน) — กลุ่มเก่าอาจไม่ครบ


class LogsResponse(BaseModel):
    ok: bool
    data: list[LogEntry]
    count: int
    total: int  # จำนวนทั้งหมดที่ตรง filter (ไม่ขึ้นกับ limit/offset)


@router.get("/logs", response_model=LogsResponse)
async def get_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    model_name: str | None = Query(default=None),
    attack_class: str | None = Query(default=None),
    alerts_only: bool = Query(default=False),
    since: str | None = Query(default=None, description="ISO timestamp — return only events at/after this time"),
    until: str | None = Query(default=None, description="ISO timestamp — return only events at/before this time"),
    source_ip: str | None = Query(default=None, description="substring ของ source IP"),
    q: str | None = Query(default=None, description="ค้นหา substring ใน source_ip / attack_class / model_name"),
    severity: str | None = Query(default=None, description="CRITICAL | HIGH | MEDIUM | LOW (จาก confidence)"),
    status: str | None = Query(default=None, description="OPEN | INVESTIGATING | MITIGATED"),
    exclude_model_name: str | None = Query(default=None, description="ไม่เอา model เหล่านี้ (คั่นด้วย ,)"),
    exclude_attack_class: str | None = Query(default=None, description="ไม่เอา attack class เหล่านี้ (คั่นด้วย ,)"),
    exclude_source_ip: str | None = Query(default=None, description="ไม่เอา source IP เหล่านี้ (คั่นด้วย , ตรงแบบ exact)"),
):
    """ดึง Prediction Events พร้อม filters และ pagination"""
    exclude = {
        col: [v for v in (raw or "").split(",") if v]
        for col, raw in (
            ("model_name", exclude_model_name),
            ("attack_class", exclude_attack_class),
            ("source_ip", exclude_source_ip),
        )
    }
    events, total = get_prediction_events(
        limit=limit,
        offset=offset,
        model_name=model_name,
        attack_class=attack_class,
        alerts_only=alerts_only,
        since=since,
        until=until,
        source_ip=source_ip,
        q=q,
        severity=severity,
        status=status,
        exclude=exclude,
    )
    for e in events:
        e["mitre"] = technique_id_for(e["attack_class"])
    return LogsResponse(ok=True, data=events, count=len(events), total=total)


@router.get("/logs/groups", response_model=GroupsResponse)
async def get_log_groups(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    gap_minutes: float = Query(default=15, ge=0, le=1440, description="event ห่างกันเกินนี้ถือเป็นการโจมตีครั้งใหม่"),
    model_name: str | None = Query(default=None),
    attack_class: str | None = Query(default=None),
    alerts_only: bool = Query(default=False),
    since: str | None = Query(default=None),
    until: str | None = Query(default=None),
    source_ip: str | None = Query(default=None),
    q: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    exclude_model_name: str | None = Query(default=None),
    exclude_attack_class: str | None = Query(default=None),
    exclude_source_ip: str | None = Query(default=None),
):
    """ยุบ event ที่ซ้ำกันเป็นกลุ่ม (การโจมตีหนึ่งครั้ง) — ใช้ filter ชุดเดียวกับ GET /api/logs"""
    exclude = {
        col: [v for v in (raw or "").split(",") if v]
        for col, raw in (("model_name", exclude_model_name), ("attack_class", exclude_attack_class), ("source_ip", exclude_source_ip))
    }
    groups, total, truncated = get_event_groups(
        gap_minutes=gap_minutes, limit=limit, offset=offset, model_name=model_name, attack_class=attack_class,
        alerts_only=alerts_only, since=since, until=until, source_ip=source_ip, q=q, severity=severity,
        status=status, exclude=exclude,
    )
    return GroupsResponse(ok=True, data=groups, count=len(groups), total=total, truncated=truncated)
