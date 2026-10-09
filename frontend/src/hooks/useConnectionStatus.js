// ─────────────────────────────────────────────────────────────────────────────
// hooks/useConnectionStatus.js — Hook จัดการสถานะการเชื่อมต่อ WebSocket
//
// State machine: CONNECTED → RECONNECTING → DISCONNECTED → RECONNECTING → CONNECTED
//
// *** หมายเหตุ Prototype ***
// ในเวอร์ชันปัจจุบัน สถานะการเชื่อมต่อถูกควบคุมจาก UI ล้วน:
//   - Sidebar badge: คลิกสลับ CONNECTED ↔ DISCONNECTED
//   - Settings > Connection: มี demo panel สำหรับทดสอบสถานะอื่น
// เมื่อต้องการเชื่อม WebSocket จริง ให้เรียก goConnected/goReconnecting/goDegraded/goDisconnected
// จาก ws.onopen / heartbeat timeout / ws.onclose แทน — ส่วนที่เหลือของแอปไม่ต้องแก้ไข
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

/**
 * CONN_STATUS — enum ค่าสถานะการเชื่อมต่อทั้งหมด
 * ใช้เปรียบเทียบแทนการ hardcode string เพื่อป้องกัน typo
 */
export const CONN_STATUS = {
  CONNECTED:    'connected',     // เชื่อมต่อปกติ ข้อมูล real-time
  RECONNECTING: 'reconnecting',  // กำลังพยายามเชื่อมต่อใหม่ (มี countdown)
  DEGRADED:     'degraded',      // เชื่อมต่อได้แต่ข้อมูลอาจล่าช้า / ไม่สมบูรณ์
  DISCONNECTED: 'disconnected',  // ขาดการเชื่อมต่อ ข้อมูลอาจเก่า
}

/**
 * useConnectionStatus — Custom Hook บริหารสถานะ WebSocket
 * @returns {object} state และ functions สำหรับ control/simulate สถานะ
 */
export function useConnectionStatus() {
  // ── State หลัก ──
  const [status, setStatus] = useState(CONN_STATUS.CONNECTED)  // สถานะปัจจุบัน
  const [lastUpdate, setLastUpdate] = useState(Date.now())     // เวลาที่รับข้อมูลล่าสุด
  const [retryIn, setRetryIn] = useState(null)                 // นับถอยหลัง (วินาที) ก่อน reconnect
  const [toast, setToast] = useState(null)                     // ข้อความ toast notification

  // ── Timer refs (ใช้ ref แทน state เพื่อไม่ให้ trigger re-render) ──
  const countdownTimerRef = useRef(null) // interval สำหรับ countdown ถอยหลัง
  const stepTimerRef = useRef(null)      // timeout สำหรับ state transition
  const toastTimerRef = useRef(null)     // timeout สำหรับซ่อน toast อัตโนมัติ

  // ── Cleanup: ล้าง timer ทั้งหมดเมื่อ component unmount ──
  useEffect(() => () => {
    clearTimeout(countdownTimerRef.current)
    clearTimeout(stepTimerRef.current)
    clearTimeout(toastTimerRef.current)
    clearInterval(countdownTimerRef.current)
  }, [])

  // ── ล้าง timer ทั้งหมด (ใช้ก่อนเปลี่ยนสถานะ) ──
  function clearTimers() {
    clearInterval(countdownTimerRef.current)
    clearTimeout(stepTimerRef.current)
    countdownTimerRef.current = null
    stepTimerRef.current = null
  }

  /**
   * showToast — แสดง toast notification แล้วซ่อนอัตโนมัติใน 4.5 วินาที
   * @param {string} title - หัวข้อ toast
   * @param {string} [sub] - ข้อความรอง (optional)
   */
  function showToast(title, sub) {
    clearTimeout(toastTimerRef.current)
    setToast({ title, sub })
    toastTimerRef.current = setTimeout(() => setToast(null), 4500)
  }

  /**
   * markDataReceived — บันทึกเวลาที่รับข้อมูลล่าสุด
   * เรียกจาก ws.onmessage เมื่อใช้ WebSocket จริง
   */
  function markDataReceived() {
    setLastUpdate(Date.now())
  }

  /**
   * goConnected — เปลี่ยนสถานะเป็น CONNECTED
   * @param {boolean} announce - ถ้า true จะแสดง toast "เชื่อมต่อสำเร็จ"
   */
  function goConnected({ announce = false } = {}) {
    clearTimers()
    setRetryIn(null)
    setStatus(CONN_STATUS.CONNECTED)
    setLastUpdate(Date.now())
    if (announce) showToast('เชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ')
  }

  /**
   * disconnectNow — ตัดการเชื่อมต่อทันที (ไม่มี auto-reconnect countdown)
   * ใช้โดย Sidebar badge เมื่อผู้ใช้คลิกปิดเอง
   * (ต่างจาก simulate.disconnected() ที่จะมี countdown แล้ว reconnect อัตโนมัติ)
   */
  function disconnectNow() {
    clearTimers()
    setRetryIn(null)
    setStatus(CONN_STATUS.DISCONNECTED)
  }

  /**
   * goDegraded — เปลี่ยนสถานะเป็น DEGRADED (เชื่อมต่อได้แต่ไม่เสถียร)
   */
  function goDegraded() {
    clearTimers()
    setRetryIn(null)
    setStatus(CONN_STATUS.DEGRADED)
  }

  /**
   * runCountdown — นับถอยหลังจาก seconds ลงมาถึง 0 แล้วเรียก onDone
   * ใช้โดย RECONNECTING และ DISCONNECTED เพื่อแสดง "กำลัง reconnect ใน X วินาที"
   * @param {number} seconds - จำนวนวินาที
   * @param {function} onDone - callback เมื่อนับถอยหลังครบ
   */
  function runCountdown(seconds, onDone) {
    clearTimers()
    setRetryIn(seconds)
    let remaining = seconds
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1
      setRetryIn(Math.max(0, remaining))
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
        onDone()
      }
    }, 1000) // tick ทุก 1 วินาที
  }

  /**
   * goReconnecting — เปลี่ยนเป็น RECONNECTING แล้วนับถอยหลัง seconds วินาที
   * เมื่อครบจะเรียก goConnected พร้อม announce toast
   * @param {number} seconds - ค่าเริ่มต้น 8 วินาที
   */
  function goReconnecting(seconds = 8) {
    clearTimers()
    setStatus(CONN_STATUS.RECONNECTING)
    runCountdown(seconds, () => goConnected({ announce: true }))
  }

  /**
   * goDisconnected — เปลี่ยนเป็น DISCONNECTED พร้อม countdown
   * เมื่อนับถอยหลังครบจะเปลี่ยนเป็น RECONNECTING แล้ว CONNECTED อัตโนมัติ
   * (จำลอง flow: หลุด → รอ → reconnect → เชื่อมต่อสำเร็จ)
   * @param {number} seconds - ค่าเริ่มต้น 10 วินาที
   */
  function goDisconnected(seconds = 10) {
    clearTimers()
    setStatus(CONN_STATUS.DISCONNECTED)
    runCountdown(seconds, () => {
      setStatus(CONN_STATUS.RECONNECTING)
      setRetryIn(null)
      stepTimerRef.current = setTimeout(() => goConnected({ announce: true }), 1500)
    })
  }

  /**
   * retryNow — ลองเชื่อมต่อใหม่ทันที (ตัด countdown ที่กำลังวิ่งอยู่)
   * ใช้โดยปุ่ม "ลองเชื่อมต่อทันที" ใน banner แจ้งเตือนการขาดการเชื่อมต่อ
   */
  function retryNow() {
    clearTimers()
    setStatus(CONN_STATUS.RECONNECTING)
    setRetryIn(null)
    // จำลองการ reconnect สำเร็จใน 1.2 วินาที
    stepTimerRef.current = setTimeout(() => goConnected({ announce: true }), 1200)
  }

  /**
   * dismissToast — ปิด toast notification ทันที
   */
  function dismissToast() {
    clearTimeout(toastTimerRef.current)
    setToast(null)
  }

  /**
   * resume — เชื่อมต่อใหม่ทันทีพร้อม toast (ใช้โดย Sidebar badge เมื่อสลับกลับ)
   */
  function resume() {
    goConnected({ announce: true })
  }

  // ── ส่งออก state และ functions ทั้งหมดให้ component ที่ใช้ hook นี้ ──
  return {
    status,         // สถานะปัจจุบัน (CONNECTED/RECONNECTING/DEGRADED/DISCONNECTED)
    lastUpdate,     // timestamp ที่รับข้อมูลล่าสุด (ms)
    retryIn,        // วินาทีที่เหลือก่อน reconnect (null = ไม่มี countdown)
    toast,          // ข้อมูล toast { title, sub } หรือ null
    dismissToast,   // ปิด toast ด้วยตัวเอง
    markDataReceived, // บอกว่าเพิ่งได้รับข้อมูล (อัปเดต lastUpdate)
    retryNow,       // ลอง reconnect ทันที
    resume,         // สลับกลับ CONNECTED (Sidebar badge)
    disconnectNow,  // ตัดการเชื่อมต่อทันที (Sidebar badge)
    // simulate: ฟังก์ชันจำลองสถานะต่างๆ สำหรับ Settings > Connection panel
    simulate: {
      connected:    () => goConnected(),
      reconnecting: () => goReconnecting(8),
      degraded:     () => goDegraded(),
      disconnected: () => goDisconnected(10),
    },
  }
}
