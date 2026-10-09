"""
CyberShield — Logs API

GET /api/logs — ดึง Prediction Events จาก SQLite
รองรับ filters: model_name, attack_class, alerts_only, since, until, source_ip, q
รองรับ pagination: limit, offset
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.db import get_prediction_events
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
):
    """ดึง Prediction Events พร้อม filters และ pagination"""
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
    )
    for e in events:
        e["mitre"] = technique_id_for(e["attack_class"])
    return LogsResponse(ok=True, data=events, count=len(events), total=total)
