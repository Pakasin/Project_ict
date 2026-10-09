// ─────────────────────────────────────────────────────────────────────────────
// App.jsx — Root Component ของแอป CyberShield
//
// จัดการ:
//   1. Auth State (login/logout, checkAuth)
//   2. Routing ระหว่างหน้าต่างๆ (Dashboard, Incidents, Logs, etc.)
//   3. Layout หลัก: Sidebar + Main Content (AppShell)
//   4. WebSocket feed รับ alert แบบ real-time
//   5. Theme switching (ThemedRoot)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { LIVE_EVENT } from './hooks/useLiveEvents'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Logs from './pages/Logs'
import Test from './pages/Test'
import Login from './pages/Login'
import Analytics from './pages/Analytics'
import Incidents from './pages/Incidents'
import Settings from './pages/Settings'
import { playSound } from './utils/sound'
import { AppProvider, useApp } from './context/AppContext'
import InfoHelp from './components/InfoHelp'
import AccessDeniedModal from './components/AccessDeniedModal'
import { CONN_STATUS } from './hooks/useConnectionStatus'
import { relativeTimeTh } from './utils/time'

// ── หน้าที่เป็น Admin Only (ปัจจุบันว่างเปล่า: General User เข้าทุกหน้าได้แต่อ่านอย่างเดียว) ──
// ถ้าต้องการจำกัดหน้าไหน ให้เพิ่ม path เข้ามา เช่น ['/settings']
const ADMIN_ONLY_PATHS = []

// ── SVG Path ของไอคอนแต่ละเมนูใน Sidebar ──
const ICONS = {
  dashboard:  "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z", // Grid 4 ช่อง
  analytics:  "M5 20V10M12 20V4M19 20v-6",                                      // Bar chart
  incidents:  "M12 3l9 16H3L12 3zM12 10v4M12 17h.01",                          // รูปสามเหลี่ยม alert
  logs:       "M5 3h14v18H5V3zM8 8h8M8 12h8M8 16h5",                           // เอกสาร
  manualTest: "M3 4h18v16H3V4zM7 9l3 3-3 3M12 15h4",                           // Terminal
  settings:   "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2", // เฟือง
}

/**
 * Icon — Component สร้าง SVG icon จาก path data
 * @param {string} d    - SVG path data (จาก ICONS object)
 * @param {number} size - ขนาด icon (px), default 17
 */
function Icon({ d, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

/**
 * AppShell — Layout หลักของแอปหลังล็อกอิน
 * ประกอบด้วย: Sidebar (ซ้าย) + Main Content (ขวา)
 * รับผิดชอบ: WebSocket feed, DEFCON level, alert count badge ใน nav
 */
function AppShell({ auth, onLogout }) {
  const { t, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView, setAccessDeniedOpen, conn } = useApp()

  // ── State ระดับ DEFCON (1=วิกฤต, 5=ปกติ) — ปรับตาม confidence ของ alert ──
  const [defcon, setDefcon] = useState(5)
  // ── จำนวน Alert ที่ active อยู่ขณะนี้ — แสดงเป็น badge แดงข้าง Incidents ──
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)   // dropdown เปลี่ยน view
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // sidebar บนมือถือ
  const viewSwitcherRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // ── ปิด Sidebar มือถือ (off-canvas) ทุกครั้งที่ navigate ไปหน้าใหม่ ──
  // (breakpoint < 900px เท่านั้น ที่มี off-canvas sidebar)
  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  function handleNavClick() {
    playSound('click')
    setMobileMenuOpen(false)
  }

  // ป้องกัน admin-only routes: รองรับทั้งการ navigate ตรงผ่าน URL
  // และกรณีที่ admin เปิด preview mode ขณะอยู่ในหน้า admin-only
  // (การซ่อน route เพียงอย่างเดียวไม่เพียงพอสำหรับทั้งสองกรณีนี้)
  useEffect(() => {
    if (isGeneralView && ADMIN_ONLY_PATHS.includes(location.pathname)) {
      setAccessDeniedOpen(true)
    }
  }, [isGeneralView, location.pathname])

  function dismissAccessDenied() {
    setAccessDeniedOpen(false)
    navigate('/')
  }

  useEffect(() => {
    if (!viewMenuOpen) return
    function onDocClick(e) { if (!viewSwitcherRef.current?.contains(e.target)) setViewMenuOpen(false) }
    function onKeyDown(e) { if (e.key === 'Escape') setViewMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [viewMenuOpen])

  // ── WebSocket Feed: รับ alert แบบ real-time จาก backend ──
  // หยุดรับข้อมูลเมื่อสถานะเป็น DISCONNECTED (badge ถูก toggle)
  // เมื่อ reconnect จะสมัคร subscribe ใหม่อัตโนมัติ
  useEffect(() => {
    if (conn.status === CONN_STATUS.DISCONNECTED) return
    let alive = true
    let retryTimer = null
    let ws = null

    function connect() {
      // เลือก protocol ws:// หรือ wss:// ตาม HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/feed`)

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          conn.markDataReceived() // ทั้ง ping และ event ถือว่า "ได้รับข้อมูลล่าสุด" จริง
          if (data.type === 'ping') return // heartbeat ping — ไม่ต้องทำอะไร

          // แจ้งหน้าต่างๆ (Dashboard/Logs/Incidents) ให้รีเฟรชข้อมูลสด
          window.dispatchEvent(new CustomEvent(LIVE_EVENT, { detail: data }))

          // ── ถ้าเป็น alert (backend ตัดสินด้วย threshold ต่อโมเดลที่ตั้งใน Settings) ──
          if (data.is_alert) {
            setActiveAlertsCount((prev) => Math.min(prev + 1, 99)) // เพิ่ม badge count (max 99)
            if (data.confidence >= 0.95) { // = ระดับ CRITICAL ตรงกับ severity band ใน backend
              // วิกฤต: DEFCON 2 + เสียง critical (3 pulse)
              setDefcon(2)
              playSound('critical')
            } else {
              // ภัยสูง: DEFCON 3 + เสียง alert (siren)
              setDefcon(3)
              playSound('alert')
            }
            // ลด badge count และ DEFCON หลัง 15 วินาที (auto-decay)
            setTimeout(() => {
              setActiveAlertsCount((prev) => Math.max(0, prev - 1))
              setDefcon((d) => (d === 2 ? 3 : d === 3 ? 4 : 5))
            }, 15000)
          }
        } catch (err) {
          console.warn('WS parse error:', err)
        }
      }

      // reconnect อัตโนมัติทุก 5 วินาทีถ้า WebSocket หลุด
      ws.onopen = () => conn.simulate.connected()
      ws.onclose = () => {
        if (!alive) return
        conn.simulate.degraded() // สถานะจริง: socket หลุด กำลังลองใหม่
        retryTimer = setTimeout(connect, 5000)
      }
      ws.onerror = () => { ws.close() }
    }

    connect()
    return () => {
      alive = false
      if (retryTimer) clearTimeout(retryTimer)
      if (ws) ws.close()
    }
  }, [conn.status === CONN_STATUS.DISCONNECTED])

  const roleColor = 'var(--color-neutral-600)'

  // ── ข้อความ label ของ Connection Badge แต่ละสถานะ ──
  const CONN_LABEL = {
    [CONN_STATUS.CONNECTED]:    'เชื่อมต่อสด (Real-time)',
    [CONN_STATUS.RECONNECTING]: 'กำลังเชื่อมต่อใหม่...',
    [CONN_STATUS.DEGRADED]:     'การเชื่อมต่อไม่เสถียร',
    [CONN_STATUS.DISCONNECTED]: 'ขาดการเชื่อมต่อ',
  }

  return (
    <div className="app-layout">
      <AccessDeniedModal onDismiss={dismissAccessDenied} />
      {conn.toast && (
        <div className="toast-container">
          <div className="toast success show">
            <span className="toast-icon"><Icon d="M5 13l4 4L19 7" size={14} /></span>
            <span className="toast-msg">
              <strong>{conn.toast.title}</strong>
              {conn.toast.sub && <div>{conn.toast.sub}</div>}
            </span>
          </div>
        </div>
      )}
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" aria-label="เปิดเมนู" onClick={() => { playSound('click'); setMobileMenuOpen((v) => !v) }}>
          <Icon d="M4 6h16M4 12h16M4 18h16" size={18} />
        </button>
        <div className="sidebar-logo">
          <span className="shield-icon"><Icon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" size={18} /></span>
          <h1>{t.brand}</h1>
        </div>
      </div>
      <div className={`sidebar-backdrop ${mobileMenuOpen ? 'show' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="shield-icon"><Icon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" size={22} /></span>
            <h1>{t.brand}</h1>
            <span className="tag tag-neutral version">v2.0</span>
          </div>

          <button
            className={`conn-badge ${conn.status}`}
            onClick={() => {
              playSound('click')
              if (conn.status === CONN_STATUS.CONNECTED) conn.disconnectNow()
              else conn.resume()
            }}
            title={conn.status === CONN_STATUS.CONNECTED ? 'คลิกเพื่อจำลองการขาดการเชื่อมต่อ' : 'คลิกเพื่อเชื่อมต่อใหม่'}
          >
            {conn.status === CONN_STATUS.RECONNECTING
              ? <span className="conn-spinner" aria-hidden="true"></span>
              : <span className="conn-dot"></span>}
            <span className="conn-badge-text">
              <span className="conn-badge-label">
                {CONN_LABEL[conn.status]}
                {conn.status === CONN_STATUS.RECONNECTING && conn.retryIn != null && ` (${conn.retryIn}s)`}
              </span>
              {conn.status === CONN_STATUS.CONNECTED && (
                <span className="conn-badge-sub">อัปเดตล่าสุดเมื่อ: {relativeTimeTh(conn.lastUpdate)}</span>
              )}
              {conn.status === CONN_STATUS.DEGRADED && (
                <span className="conn-badge-sub">ข้อมูลอาจล่าช้า</span>
              )}
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick} end>
            <span className="nav-icon"><Icon d={ICONS.dashboard} /></span>{t.nav.dashboard}
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="nav-icon"><Icon d={ICONS.analytics} /></span>{t.nav.analytics}
          </NavLink>
          <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="nav-icon"><Icon d={ICONS.incidents} /></span>{t.nav.incidents}
            {activeAlertsCount > 0 && <span className="nav-alert-pill mono">{activeAlertsCount}</span>}
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="nav-icon"><Icon d={ICONS.logs} /></span>{t.nav.logs}
          </NavLink>
          <NavLink to="/test" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="nav-icon"><Icon d={ICONS.manualTest} /></span>{t.nav.manualTest}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="nav-icon"><Icon d={ICONS.settings} /></span>{t.nav.settings}
          </NavLink>
        </nav>



        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-info" onClick={() => { window.location.hash = ''; }}>
              <div className="user-avatar">{auth.user ? auth.user[0].toUpperCase() : 'A'}</div>
              <div style={{ minWidth: 0 }}>
                <div className="username-label">
                  {auth.profile?.name && auth.profile?.lastname
                    ? `${auth.profile.name} ${auth.profile.lastname}`
                    : auth.user || 'Admin'}
                </div>
                <div className="user-role" style={{ color: roleColor }}>{auth.role || 'General User'}</div>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary logout-btn" onClick={onLogout}>{t.logout}</button>
        </div>
      </aside>

      <main className="main-content">
        <div className={`conn-banner ${conn.status === CONN_STATUS.DISCONNECTED ? 'show' : ''}`}>
          <Icon d="M12 3l9 16H3L12 3zM12 10v4M12 17h.01" size={16} />
          <span>
            ขาดการเชื่อมต่อกับเซิร์ฟเวอร์ ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน{' '}
            {conn.retryIn != null
              ? `กำลังพยายามเชื่อมต่อใหม่ใน ${conn.retryIn} วินาที...`
              : 'กำลังพยายามเชื่อมต่อใหม่...'}
          </span>
          <button id="connRetryBtn" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={conn.retryNow}>
            ลองเชื่อมต่อทันที
          </button>
        </div>
        {previewAsGeneral && (
          <div className="tag tag-outline preview-banner">
            <span>{t.settings.previewBannerText}</span>
            <button className="btn btn-ghost" onClick={() => setPreviewAsGeneral(false)}>{t.settings.previewBackBtn}</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard activeAlertsCount={activeAlertsCount} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/test" element={<Test />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App — Root Component: จัดการ Auth State และ Routing ระดับบน
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate()
  // auth.checked: false = กำลังตรวจสอบ (แสดง spinner), true = ตรวจสอบเสร็จแล้ว
  const [auth, setAuth] = useState({ checked: false, user: null, role: null, email: null })

  // ตรวจสอบ session เมื่อ app โหลดครั้งแรก
  useEffect(() => { checkAuth() }, [])

  /**
   * checkAuth — ตรวจสอบ session ที่มีอยู่
   * ถาม /api/me (session cookie) — ไม่เชื่อ localStorage
   */
  async function checkAuth() {
    try {
      // backend session (cookie) คือแหล่งความจริงเดียว — เดิมเชื่อ localStorage ทำให้ UI โชว์ว่าเป็น admin
      // ทั้งที่ API ปฏิเสธเพราะไม่มี session
      const res = await fetch('/api/me')
      const data = await res.json()
      if (data.ok) {
        // โปรไฟล์ที่แก้ไว้ในหน้า Settings (เก็บเฉพาะในเบราว์เซอร์) ทับค่าจาก server ได้ถ้าเป็นผู้ใช้คนเดียวกัน
        let saved = null
        try { saved = JSON.parse(localStorage.getItem('cybershield_active_user') || 'null') } catch { /* ไม่มี */ }
        const profile = saved?.user === data.username && saved.profile ? { ...data.profile, ...saved.profile } : data.profile
        setAuth({
          checked: true,
          user: data.username,
          role: data.role === 'admin' ? 'SOC Lead Operator' : 'General User',
          email: data.email,
          profile,
        })
      } else {
        localStorage.removeItem('cybershield_active_user')
        setAuth({ checked: true, user: null, role: null, email: null, profile: null })
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setAuth({ checked: true, user: null, role: null, email: null, profile: null })
    }
  }

  function handleLoginSuccess(username, role = 'General User', email = null, profile = null) {
    playSound('success')
    const nextAuth = {
      checked: true,
      user: username,
      role: role || 'General User',
      email: email || `${username}@cybershield.th`,
      profile: profile || { name: username, lastname: '', phone: '-' }
    }
    setAuth(nextAuth)
    localStorage.setItem('cybershield_active_user', JSON.stringify(nextAuth))
    navigate('/')
  }

  function updateProfile(nextProfile) {
    setAuth((prev) => {
      const merged = { ...prev, profile: { ...prev.profile, ...nextProfile } }
      localStorage.setItem('cybershield_active_user', JSON.stringify(merged))
      return merged
    })
  }

  async function handleLogout() {
    playSound('click')
    localStorage.removeItem('cybershield_active_user')
    try {
      const res = await fetch('/api/logout', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setAuth({ checked: true, user: null, role: null, email: null })
        navigate('/')
      }
    } catch (err) {
      console.error('Logout failed:', err)
      setAuth({ checked: true, user: null, role: null, email: null })
      navigate('/')
    }
  }

  return (
    <AppProvider auth={auth} updateProfile={updateProfile}>
      <ThemedRoot>
        {!auth.checked ? (
          <div className="loading-spinner" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>
        ) : !auth.user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <AppShell auth={auth} onLogout={handleLogout} />
        )}
      </ThemedRoot>
    </AppProvider>
  )
}

/**
 * ThemedRoot — Component ที่ apply theme (dark/light) ลง <html> element
 *
 * ต้องตั้ง attribute บน document.documentElement (<html>) เพราะ CSS ใช้
 * selector :root[data-theme="dark"] ซึ่ง match เฉพาะ <html> เท่านั้น
 * (ถ้า set บน <div> ธรรมดา theme จะไม่ทำงาน)
 */
function ThemedRoot({ children }) {
  const { theme } = useApp()
  // อัปเดต data-theme attribute บน <html> ทุกครั้งที่ theme เปลี่ยน
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return (
    // wrapper ห่อเนื้อหาทั้งหมด รับสี background และ text จาก CSS variables
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {children}
    </div>
  )
}
