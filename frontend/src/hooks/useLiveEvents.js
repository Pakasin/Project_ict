// ─────────────────────────────────────────────────────────────────────────────
// hooks/useLiveEvents.js — เรียก callback เมื่อมี event ใหม่จาก /ws/feed
//
// App.jsx เป็นเจ้าของ WebSocket เพียงตัวเดียว แล้ว dispatch CustomEvent 'cybershield:event'
// หน้าต่างๆ (Dashboard, Logs, Incidents) subscribe ผ่าน hook นี้เพื่อรีเฟรชข้อมูลแบบสด
// โดยไม่เปิด socket เพิ่ม. throttle: event ถี่ (เช่น DDoS) รวมเป็นการรีเฟรชครั้งเดียวต่อ delayMs
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

export const LIVE_EVENT = 'cybershield:event'

export function useLiveEvents(callback, { enabled = true, delayMs = 1500 } = {}) {
  const cbRef = useRef(callback)
  cbRef.current = callback  // ใช้ callback ล่าสุดเสมอโดยไม่ต้อง resubscribe

  useEffect(() => {
    if (!enabled) return
    let timer = null
    const onEvent = (e) => {
      if (timer) return  // มี refresh รออยู่แล้ว
      timer = setTimeout(() => { timer = null; cbRef.current(e.detail) }, delayMs)
    }
    window.addEventListener(LIVE_EVENT, onEvent)
    return () => { window.removeEventListener(LIVE_EVENT, onEvent); if (timer) clearTimeout(timer) }
  }, [enabled, delayMs])
}
