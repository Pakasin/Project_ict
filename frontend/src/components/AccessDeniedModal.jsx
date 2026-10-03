// ─────────────────────────────────────────────────────────────────────────────
// components/AccessDeniedModal.jsx — Modal แจ้งเตือน "ไม่มีสิทธิ์เข้าถึง"
//
// แสดงขึ้นเมื่อ General User (หรือ Admin ที่เปิด Preview Mode) พยายามเข้าถึง:
//   1. หน้าที่กำหนดเป็น Admin-only (ADMIN_ONLY_PATHS)
//   2. Tab ใน Settings ที่ต้องการสิทธิ์ Admin
//
// การเปิด/ปิด modal นี้ควบคุมผ่าน accessDeniedOpen ใน AppContext
// ─────────────────────────────────────────────────────────────────────────────

import { useApp } from '../context/AppContext'
import { playSound } from '../utils/sound'

/**
 * AccessDeniedModal — Modal แสดงข้อความแจ้งเตือนไม่มีสิทธิ์
 * @param {function} onDismiss - callback เมื่อกด "ย้อนกลับ" หรือคลิกพื้นหลัง
 */
export default function AccessDeniedModal({ onDismiss }) {
  const { t, accessDeniedOpen } = useApp()

  // ถ้า modal ไม่ได้ถูก trigger ให้เปิด ไม่ต้อง render อะไร
  if (!accessDeniedOpen) return null

  // เล่นเสียง click แล้วเรียก callback ปิด modal
  function handleDismiss() {
    playSound('click')
    onDismiss()
  }

  return (
    // พื้นหลังมืด — คลิกพื้นหลังเพื่อปิด modal
    <div className="dialog-backdrop" onClick={handleDismiss}>
      {/* การ์ด modal — คลิกภายในการ์ดไม่ให้ event ลอยไปถึง backdrop */}
      <div className="dialog card elev-lg" style={{ maxWidth: 380, textAlign: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>

        {/* ไอคอน "ห้าม" วงกลมไขว้กัน */}
        <div className="modal-icon icon-alert" style={{ borderRadius: '50%' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"></line>
          </svg>
        </div>

        {/* หัวข้อและคำอธิบาย (ข้อความมาจาก i18n strings) */}
        <h3 style={{ margin: 0 }}>{t.access.title}</h3>
        <p className="text-muted" style={{ fontSize: 13.5, margin: 0 }}>{t.access.desc}</p>

        {/* ปุ่มย้อนกลับ — ปิด modal แล้ว navigate กลับ */}
        <button className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-2)' }} onClick={handleDismiss}>{t.access.back}</button>
      </div>
    </div>
  )
}
