"""
CyberShield — Incidents / Audit / Firewall API

จัดการ incident status, operator audit trail, และ IP quarantine list
เดิมทั้งหมดนี้เก็บใน localStorage ฝั่ง frontend — ย้ายมา SQLite ให้คงอยู่ข้ามอุปกรณ์/เบราว์เซอร์

ทุก endpoint ที่ mutate state ต้องผ่าน require_admin — ป้องกัน General User
(ไม่มี session cookie จริง) ยิงตรงเข้ามาข้าม UI guard
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.auth.session import require_admin
from backend.db import (
    set_incident_status,
    get_incident_statuses,
    add_audit_log,
    get_audit_logs,
    block_ip,
    unblock_ip,
    get_blocked_ips,
)

router = APIRouter(prefix="/api", tags=["incidents"])

VALID_STATUSES = {"OPEN", "INVESTIGATING", "MITIGATED"}


class UpdateIncidentRequest(BaseModel):
    status: str
    source_ip: str
    action_name: str


class OkResponse(BaseModel):
    ok: bool
    error: str | None = None


@router.get("/incidents/statuses")
async def incident_statuses():
    return {"ok": True, "data": get_incident_statuses()}


@router.patch("/incidents/{event_id}", response_model=OkResponse)
async def update_incident(event_id: int, body: UpdateIncidentRequest, username: str = Depends(require_admin)):
    if body.status not in VALID_STATUSES:
        return OkResponse(ok=False, error=f"Invalid status: {body.status}")

    now = datetime.now().isoformat()
    set_incident_status(event_id, body.status, username, now)
    add_audit_log(username, body.action_name, f"Ref #{event_id} ({body.source_ip})", now)

    if body.status == "MITIGATED":
        block_ip(body.source_ip, username, now)

    return OkResponse(ok=True)


@router.get("/audit-log")
async def audit_log(limit: int = Query(default=50, ge=1, le=200)):
    return {"ok": True, "data": get_audit_logs(limit=limit)}


@router.get("/blocked-ips")
async def blocked_ips():
    return {"ok": True, "data": get_blocked_ips()}


class BlockIpRequest(BaseModel):
    ip: str


@router.post("/blocked-ips", response_model=OkResponse)
async def add_blocked_ip(body: BlockIpRequest, username: str = Depends(require_admin)):
    block_ip(body.ip, username, datetime.now().isoformat())
    return OkResponse(ok=True)


@router.delete("/blocked-ips/{ip}", response_model=OkResponse)
async def remove_blocked_ip(ip: str, username: str = Depends(require_admin)):
    unblock_ip(ip)
    return OkResponse(ok=True)
