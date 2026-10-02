// ─────────────────────────────────────────────────────────────────────────────
// context/AppContext.jsx — Global State ของแอป (Context API)
// เก็บและแชร์ข้อมูลที่ทุกหน้าต้องการร่วมกัน เช่น:
//   - ข้อมูลผู้ใช้ที่ล็อกอิน (auth)
//   - ธีม (dark/light)
//   - ภาษา (th/en)
//   - สถานะการเชื่อมต่อ (conn)
//   - สถานะ modal ต่างๆ
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react'
import { STR } from '../i18n/strings'               // ไฟล์ภาษา (strings สำหรับ th/en)
import { useConnectionStatus } from '../hooks/useConnectionStatus' // hook สถานะ WebSocket

// สร้าง Context object — ค่าเริ่มต้นเป็น null จะถูกแทนที่โดย AppProvider
const AppContext = createContext(null)

/**
 * AppProvider — ครอบทั้งแอปเพื่อจัดการ Global State
 * @param {object} auth        - ข้อมูล user ที่ล็อกอิน (จาก App.jsx)
 * @param {function} updateProfile - ฟังก์ชันอัปเดต profile ของ user
 * @param {ReactNode} children - component ลูกทั้งหมดที่อยู่ภายใน
 */
export function AppProvider({ auth, updateProfile, children }) {
  // ── ธีม (dark/light): โหลดจาก localStorage หรือใช้ dark เป็นค่าเริ่มต้น ──
  const [theme, setTheme] = useState(() => localStorage.getItem('cybershield_theme') || 'dark')

  // ── ภาษา (th/en): โหลดจาก localStorage หรือใช้ ภาษาไทย เป็นค่าเริ่มต้น ──
  const [lang, setLang] = useState(() => localStorage.getItem('cybershield_lang') || 'th')

  // ── โหมด Preview: Admin ดู UI ในมุมมองของ General User ──
  const [previewAsGeneral, setPreviewAsGeneral] = useState(false)

  // ── Help Popover: เก็บ id ของ InfoHelp ที่กำลังเปิดอยู่ (null = ปิดทั้งหมด) ──
  const [openHelpId, setOpenHelpId] = useState(null)

  // ── Modal "ไม่มีสิทธิ์เข้าถึง": เปิด/ปิด AccessDeniedModal ──
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false)

  // ── สถานะการเชื่อมต่อ WebSocket (connected/reconnecting/degraded/disconnected) ──
  // - Sidebar badge ใช้ conn.disconnectNow() / conn.resume() สลับสถานะ
  // - Settings > Connection ใช้ simulate.* เพื่อทดสอบสถานะอื่น
  const conn = useConnectionStatus()

  // บันทึกธีมลง localStorage ทุกครั้งที่มีการเปลี่ยน
  useEffect(() => {
    localStorage.setItem('cybershield_theme', theme)
  }, [theme])

  // บันทึกภาษาลง localStorage ทุกครั้งที่มีการเปลี่ยน
  useEffect(() => {
    localStorage.setItem('cybershield_lang', lang)
  }, [lang])

  // รีเซ็ต previewAsGeneral ทุกครั้งที่ user เปลี่ยน (logout/login)
  // เพื่อป้องกัน admin ติด preview mode หลัง logout
  useEffect(() => {
    setPreviewAsGeneral(false)
  }, [auth?.user])

  // ── ฟังก์ชันแปลภาษา (t) — เลือกชุด string ตามภาษาปัจจุบัน ──
  const t = STR[lang] || STR.th

  // ── สิทธิ์: true ถ้าเป็น admin จริงๆ (ไม่ใช่ Guest หรือ General User) ──
  const isAdminActual = !!auth?.user && auth.role !== 'General User'

  // ── มุมมอง: true ถ้า user ควรเห็น UI แบบ General (จำกัดสิทธิ์) ──
  // เกิดขึ้นเมื่อ: role เป็น General User จริง หรือ admin เปิด previewAsGeneral
  const isGeneralView = auth?.role === 'General User' || (isAdminActual && previewAsGeneral)

  // ── รวม value ทั้งหมดที่จะแชร์ผ่าน Context ──
  const value = {
    auth, updateProfile,            // ข้อมูลและฟังก์ชัน user
    theme, setTheme,                // ธีม dark/light
    lang, setLang,                  // ภาษา
    t,                              // ฟังก์ชันแปลภาษา
    previewAsGeneral, setPreviewAsGeneral, // Admin preview mode
    isAdminActual, isGeneralView,   // สิทธิ์การมองเห็น
    openHelpId, setOpenHelpId,      // Help popover
    accessDeniedOpen, setAccessDeniedOpen, // Modal ไม่มีสิทธิ์
    conn,                           // สถานะ WebSocket connection
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * useApp — Custom hook สำหรับเข้าถึง Global State
 * ต้องใช้ภายใน AppProvider เท่านั้น
 * ตัวอย่าง: const { t, theme, conn } = useApp()
 */
export function useApp() {
  const ctx = useContext(AppContext)
  // ป้องกันการใช้ hook นอก Provider
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
