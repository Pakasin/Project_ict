"""
CyberShield — Logs API

GET /api/logs — ดึง Prediction Events จาก SQLite
รองรับ filters: model_name, attack_class, alerts_only
รองรับ pagination: limit, offset
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.db import get_prediction_events

router = APIRouter(prefix="/api", tags=["logs"])


class LogEntry(BaseModel):
    id: int
    model_name: str
    attack_class: str
    confidence: float
    source_ip: str
    timestamp: str
    is_alert: int


class LogsResponse(BaseModel):
    ok: bool
    data: list[LogEntry]
    count: int


@router.get("/logs", response_model=LogsResponse)
async def get_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    model_name: str | None = Query(default=None),
    attack_class: str | None = Query(default=None),
    alerts_only: bool = Query(default=False),
    since: str | None = Query(default=None, description="ISO timestamp — return only events at/after this time"),
):
    """ดึง Prediction Events พร้อม filters และ pagination"""
    events = get_prediction_events(
        limit=limit,
        offset=offset,
        model_name=model_name,
        attack_class=attack_class,
        alerts_only=alerts_only,
        since=since,
    )
    return LogsResponse(ok=True, data=events, count=len(events))
