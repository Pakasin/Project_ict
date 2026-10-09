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
from backend.mitre import technique_for
from backend.db import (
    set_incident_status,
    get_incident_statuses,
    add_audit_log,
    get_audit_logs,
    get_audit_logs_for_event,
    block_ip,
    unblock_ip,
    get_blocked_ips,
    get_event_by_id,
    get_related_events,
    get_incident_notes,
    add_incident_note,
    set_incident_assignee,
    get_incident_assignees,
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
async def audit_log(limit: int = Query(default=50, ge=1, le=200), _admin: str = Depends(require_admin)):
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


@router.get("/events/{event_id}")
async def event_detail(event_id: int):
    """รายละเอียด event + บันทึก + ผู้รับผิดชอบ + events อื่นจาก IP เดียวกัน"""
    ev = get_event_by_id(event_id)
    if ev is None:
        return {"ok": False, "error": "not found"}
    return {
        "ok": True,
        "data": {
            "event": ev,
            "mitre": technique_for(ev["attack_class"]),
            "notes": get_incident_notes(event_id),
            "assignee": get_incident_assignees().get(event_id),
            "related": get_related_events(ev["source_ip"], event_id),
            "audit": get_audit_logs_for_event(event_id),
        },
    }


class NoteRequest(BaseModel):
    note: str


@router.post("/incidents/{event_id}/notes", response_model=OkResponse)
async def add_note(event_id: int, body: NoteRequest, username: str = Depends(require_admin)):
    text = body.note.strip()
    if not text or len(text) > 2000:
        return OkResponse(ok=False, error="note must be 1-2000 chars")
    now = datetime.now().isoformat()
    add_incident_note(event_id, username, text, now)
    add_audit_log(username, "เพิ่มบันทึก", f"Ref #{event_id}", now)
    return OkResponse(ok=True)


class AssignRequest(BaseModel):
    assignee: str | None = None


@router.put("/incidents/{event_id}/assignee", response_model=OkResponse)
async def assign(event_id: int, body: AssignRequest, username: str = Depends(require_admin)):
    now = datetime.now().isoformat()
    set_incident_assignee(event_id, (body.assignee or "").strip() or None, now)
    add_audit_log(username, f"มอบหมายให้ {body.assignee or '-'}", f"Ref #{event_id}", now)
    return OkResponse(ok=True)


@router.get("/incidents/assignees")
async def assignees():
    return {"ok": True, "data": get_incident_assignees()}
