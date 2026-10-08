"""
CyberShield — Stats API

GET /api/stats — สถิติรวมจาก prediction_events สำหรับ Dashboard/Analytics
รองรับ: since (ISO timestamp), bucket (นาทีต่อ bucket ของ timeline)
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.db import get_event_stats

router = APIRouter(prefix="/api", tags=["stats"])


class CountItem(BaseModel):
    key: str
    count: int


class TimelineBucket(BaseModel):
    t: str
    alerts: int
    normal: int


class StatsData(BaseModel):
    totals: dict[str, int]
    by_class: list[CountItem]
    by_model: list[CountItem]
    by_severity: dict[str, int]
    top_sources: list[CountItem]
    source_scope: dict[str, int]
    timeline: list[TimelineBucket]


class StatsResponse(BaseModel):
    ok: bool
    data: StatsData


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    since: str | None = Query(default=None, description="ISO timestamp — นับเฉพาะ events at/after เวลานี้"),
    bucket: int = Query(default=60, ge=1, le=1440, description="ความกว้าง bucket ของ timeline (นาที)"),
):
    """สถิติรวม: totals, by_class, by_model, by_severity, top_sources, source_scope, timeline"""
    return StatsResponse(ok=True, data=get_event_stats(since=since, bucket_minutes=bucket))
