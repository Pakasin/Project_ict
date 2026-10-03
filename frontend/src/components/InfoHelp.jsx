// ─────────────────────────────────────────────────────────────────────────────
// components/InfoHelp.jsx — ปุ่ม "!" สำหรับแสดง Help Tooltip แบบ Popover
//
// ใช้ทั่วแอป เช่น ข้างหัวข้อ MITRE ATT&CK, F1-Score, Packet Speed
// เมื่อกดจะเปิด popover แสดงคำอธิบายของ id นั้นจาก i18n strings (t.help.[id])
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

// ── ค่าคงที่สำหรับการคำนวณตำแหน่ง Popover ──
const MARGIN = 8       // ระยะห่างขอบ popover กับขอบหน้าต่าง (px)
const POP_WIDTH = 280  // ความกว้าง popover (px) ใช้คำนวณว่าจะล้นขอบจอไหม

/**
 * InfoHelp — ปุ่ม help แบบ inline (!) พร้อม Popover
 * @param {string} id - รหัส help ที่ใช้ดึงข้อมูลจาก t.help[id] (title + desc)
 *                      เช่น id="mitre", id="f1score", id="packetSpeed"
 */
export default function InfoHelp({ id }) {
  const { t, openHelpId, setOpenHelpId } = useApp()
  const btnRef = useRef(null)   // ref ของปุ่ม "!" เพื่อคำนวณตำแหน่ง popover
  const popRef = useRef(null)   // ref ของ popover เพื่อวัดความสูงจริง
  const [pos, setPos] = useState({ top: -9999, left: -9999 }) // ซ่อน popover ไว้ก่อน

  // ตรวจว่า popover ของ id นี้เปิดอยู่หรือไม่
  const isOpen = openHelpId === id
  // ดึงข้อมูล help ของ id นี้จาก strings ปัจจุบัน
  const help = t.help?.[id]

  // ── คำนวณตำแหน่ง Popover แบบ smart positioning ──
  useEffect(() => {
    if (!isOpen) return

    function measure() {
      const btn = btnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()

      // คำนวณ left: ถ้าล้นขอบขวา ให้เลื่อนซ้าย
      let left = rect.left
      if (left + POP_WIDTH + MARGIN > window.innerWidth) left = window.innerWidth - POP_WIDTH - MARGIN
      if (left < MARGIN) left = MARGIN

      // คำนวณ top: เปิดล่างปุ่ม ถ้าพื้นที่ด้านล่างไม่พอให้เปิดบนปุ่มแทน
      const estHeight = popRef.current?.offsetHeight || 140
      let top = rect.bottom + 6
      const fitsBelow = window.innerHeight - rect.bottom - MARGIN >= estHeight
      if (!fitsBelow && rect.top - MARGIN >= estHeight) top = rect.top - estHeight - 6
      if (top < MARGIN) top = MARGIN
      if (top + estHeight > window.innerHeight - MARGIN) top = Math.max(MARGIN, window.innerHeight - estHeight - MARGIN)
      setPos({ top, left })
    }

    measure() // คำนวณครั้งแรกทันที

    // ── ปิด Popover เมื่อ: คลิกนอก, กด Escape, หรือ scroll/resize ──
    function onDocClick(e) { if (!e.target.closest('[data-info-help]')) setOpenHelpId(null) }
    function onKeyDown(e) { if (e.key === 'Escape') setOpenHelpId(null) }

    window.addEventListener('scroll', measure, true)  // recalculate เมื่อ scroll
    window.addEventListener('resize', measure)         // recalculate เมื่อ resize
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)

    // cleanup: ลบ event listeners เมื่อ popover ปิดหรือ component unmount
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, setOpenHelpId])

  // ถ้าไม่มีข้อมูล help สำหรับ id นี้ ไม่ต้อง render อะไร
  if (!help) return null

  return (
    // wrapper — data-info-help ใช้ใน onDocClick เพื่อรู้ว่าคลิกอยู่ใน InfoHelp
    <span className="info-help" data-info-help="true">
      {/* ปุ่ม "!" — toggle เปิด/ปิด popover */}
      <button
        ref={btnRef}
        type="button"
        className="info-help-btn"
        aria-label={help.title}
        data-plain="true"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenHelpId(isOpen ? null : id) }}
      >
        !
      </button>

      {/* Popover — แสดงตำแหน่งแบบ fixed (ติดกับ viewport ไม่ scroll ตาม) */}
      {isOpen && (
        <div ref={popRef} className="info-help-pop" style={{ top: pos.top, left: pos.left }}>
          <div className="info-help-title">{help.title}</div> {/* หัวข้อ help */}
          <div className="info-help-desc">{help.desc}</div>   {/* คำอธิบาย */}
        </div>
      )}
    </span>
  )
}
