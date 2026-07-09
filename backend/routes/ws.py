"""
CyberShield — Detection Feed WebSocket

/ws/feed — Server-to-client broadcast stream ของ Prediction Events
Dashboard เป็น read-only — browser ไม่เคยส่ง payload กลับ
Sensors (nfstream, mitmproxy) เป็น sole source ของ predictions
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json

router = APIRouter(tags=["websocket"])

# รายการ active WebSocket connections ทั้งหมด
active_connections: List[WebSocket] = []


async def broadcast(data: dict) -> None:
    """ส่ง Prediction Event ไปยัง dashboard clients ทุกตัวที่เชื่อมต่ออยู่"""
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_json(data)
        except Exception:
            disconnected.append(ws)

    # ลบ connections ที่ตัดไปแล้ว
    for ws in disconnected:
        if ws in active_connections:
            active_connections.remove(ws)


@router.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket):
    """WebSocket endpoint สำหรับ real-time detection feed"""
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep-alive ping ทุก 30 วินาที
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
