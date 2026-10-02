# รวมซอร์สโค้ด Frontend ทั้งหมด — CyberShield

เอกสารนี้รวบรวมซอร์สโค้ดฉบับเต็มของทุกไฟล์ใน `frontend/` เพื่อความสะดวกในการอ่าน ค้นหา และตรวจสอบโครงสร้างทั้งโปรเจกต์ในที่เดียว

## สารบัญไฟล์ (Table of Contents)

- [package.json](#packagejson) — `22 lines`, `0.4 KB`
- [vite.config.js](#viteconfigjs) — `26 lines`, `0.6 KB`
- [index.html](#indexhtml) — `24 lines`, `1.1 KB`
- [src/main.jsx](#srcmainjsx) — `22 lines`, `1.7 KB`
- [src/App.jsx](#srcappjsx) — `432 lines`, `20.6 KB`
- [src/context/AppContext.jsx](#srccontextappcontextjsx) — `97 lines`, `6.0 KB`
- [src/hooks/useConnectionStatus.js](#srchooksuseconnectionstatusjs) — `213 lines`, `10.9 KB`
- [src/utils/time.js](#srcutilstimejs) — `34 lines`, `2.3 KB`
- [src/utils/sound.js](#srcutilssoundjs) — `198 lines`, `10.4 KB`
- [src/components/AccessDeniedModal.jsx](#srccomponentsaccessdeniedmodaljsx) — `52 lines`, `3.2 KB`
- [src/components/InfoHelp.jsx](#srccomponentsinfohelpjsx) — `102 lines`, `5.6 KB`
- [src/components/ThreatInspectModal.jsx](#srccomponentsthreatinspectmodaljsx) — `180 lines`, `10.5 KB`
- [src/pages/Login.jsx](#srcpagesloginjsx) — `347 lines`, `21.8 KB`
- [src/pages/Dashboard.jsx](#srcpagesdashboardjsx) — `730 lines`, `52.8 KB`
- [src/pages/Analytics.jsx](#srcpagesanalyticsjsx) — `307 lines`, `20.2 KB`
- [src/pages/Incidents.jsx](#srcpagesincidentsjsx) — `916 lines`, `61.2 KB`
- [src/pages/Logs.jsx](#srcpageslogsjsx) — `654 lines`, `47.0 KB`
- [src/pages/Settings.jsx](#srcpagessettingsjsx) — `522 lines`, `37.2 KB`
- [src/pages/Test.jsx](#srcpagestestjsx) — `450 lines`, `28.8 KB`
- [src/i18n/strings.js](#srci18nstringsjs) — `301 lines`, `45.7 KB`
- [src/index.css](#srcindexcss) — `1423 lines`, `73.2 KB`

---

<a id="packagejson"></a>

## [package.json](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/package.json)

**Path:** `package.json` | **Lines:** 22 | **Size:** 0.4 KB

```json
{
  "name": "cybershield-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}

```

---

<a id="viteconfigjs"></a>

## [vite.config.js](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/vite.config.js)

**Path:** `vite.config.js` | **Lines:** 26 | **Size:** 0.6 KB

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy REST API → FastAPI
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy Internal endpoint → FastAPI
      '/internal': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy WebSocket → FastAPI
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})

```

---

<a id="indexhtml"></a>

## [index.html](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/index.html)

**Path:** `index.html` | **Lines:** 24 | **Size:** 1.1 KB

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- SEO -->
    <title>CyberShield — AI Cyber Attack Detection</title>
    <meta name="description" content="Real-time network attack detection system powered by 3 specialized LSTM models. Monitor R2L, U2R, DDoS, DoS, PortScan, BruteForce, and SQL Injection attacks." />
    <meta name="keywords" content="cybersecurity, AI, LSTM, intrusion detection, DDoS, SQL injection, network security" />

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />

    <!-- Google Fonts — Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

---

<a id="srcmainjsx"></a>

## [src/main.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/main.jsx)

**Path:** `src/main.jsx` | **Lines:** 22 | **Size:** 1.7 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// main.jsx — จุดเข้าหลักของแอปพลิเคชัน (Entry Point)
// ทำหน้าที่ render root component (<App />) ลงใน <div id="root"> ของ index.html
// BrowserRouter ห่อทั้งแอปเพื่อรองรับการ routing ด้วย URL จริง (History API)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css' // โหลด CSS หลักของแอป (theme, design tokens, layout)

// สร้าง React root แบบ Concurrent Mode แล้ว render ทั้งแอปเข้าไปใน <div id="root">
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode: ตรวจจับปัญหาที่อาจเกิดขึ้นในโหมด development (เรียก lifecycle 2 ครั้ง)
  <React.StrictMode>
    {/* BrowserRouter: ให้แอปใช้ URL จริงเพื่อ navigate ระหว่างหน้าต่างๆ */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

```

---

<a id="srcappjsx"></a>

## [src/App.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/App.jsx)

**Path:** `src/App.jsx` | **Lines:** 432 | **Size:** 20.6 KB

```javascript
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
          if (data.type === 'ping') return // heartbeat ping — ไม่ต้องทำอะไร

          // ── ถ้าเป็น alert (confidence >= 0.82) ── 
          if (data.is_alert || data.confidence >= 0.82) {
            setActiveAlertsCount((prev) => Math.min(prev + 1, 99)) // เพิ่ม badge count (max 99)
            if (data.confidence >= 0.92) {
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
      ws.onclose = () => { if (alive) retryTimer = setTimeout(connect, 5000) }
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
   * ลำดับ: localStorage (cybershield_active_user) → API /api/me → ไม่ล็อกอิน
   */
  async function checkAuth() {
    try {
      // ── Step 1: ตรวจ localStorage (user ล็อกอินไว้แล้ว) ──
      const activeUser = JSON.parse(localStorage.getItem('cybershield_active_user') || 'null')
      if (activeUser && activeUser.username) {
        setAuth({
          checked: true,
          user: activeUser.username,
          role: activeUser.role || 'General User',
          email: activeUser.email,
          profile: activeUser.profile || { name: activeUser.username, lastname: '', phone: '-' }
        })
        return
      }

      // ── Step 2: ตรวจ session จาก backend (session cookie) ──
      const res = await fetch('/api/me')
      const data = await res.json()
      if (data.ok) {
        // backend admin session ยังอยู่
        setAuth({
          checked: true,
          user: data.username,
          role: 'SOC Lead Operator',
          email: `${data.username}@cybershield.th`,
          profile: { name: 'System', lastname: 'Admin', phone: '-' }
        })
      } else {
        // ไม่มี session → แสดงหน้า Login
        setAuth({ checked: true, user: null, role: null, email: null, profile: null })
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      // network error → แสดงหน้า Login
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

```

---

<a id="srccontextappcontextjsx"></a>

## [src/context/AppContext.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/context/AppContext.jsx)

**Path:** `src/context/AppContext.jsx` | **Lines:** 97 | **Size:** 6.0 KB

```javascript
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

```

---

<a id="srchooksuseconnectionstatusjs"></a>

## [src/hooks/useConnectionStatus.js](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/hooks/useConnectionStatus.js)

**Path:** `src/hooks/useConnectionStatus.js` | **Lines:** 213 | **Size:** 10.9 KB

```javascript
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

  // ── Demo Mode: จำลองข้อมูลใหม่มาถึงทุก 12 วินาที ──
  // เพื่อให้ "อัปเดตล่าสุด: เมื่อสักครู่" ใน Sidebar badge วิ่งได้เห็นๆ
  // เมื่อใช้ WebSocket จริง ให้ลบ interval นี้แล้วเรียก markDataReceived() จาก ws.onmessage
  useEffect(() => {
    if (status !== CONN_STATUS.CONNECTED) return
    const id = setInterval(() => setLastUpdate(Date.now()), 12000)
    return () => clearInterval(id)
  }, [status])

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

```

---

<a id="srcutilstimejs"></a>

## [src/utils/time.js](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/utils/time.js)

**Path:** `src/utils/time.js` | **Lines:** 34 | **Size:** 2.3 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// utils/time.js — ฟังก์ชันช่วยแปลงเวลาเป็นภาษาไทย
// ใช้แสดงในป้าย Sidebar badge ("อัปเดตล่าสุดเมื่อ: ...")
// เพื่อบอกว่าข้อมูลล่าสุดถูกรับมานานแค่ไหนแล้ว
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง timestamp (milliseconds) ให้เป็นข้อความภาษาไทยแบบ relative
 * เช่น "เมื่อสักครู่", "30 วินาทีที่แล้ว", "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว"
 *
 * @param {number} timestamp - เวลาในหน่วย milliseconds (จาก Date.now())
 * @returns {string} ข้อความเวลาภาษาไทย
 */
export function relativeTimeTh(timestamp) {
  // ถ้าไม่มี timestamp คืนค่า '-'
  if (!timestamp) return '-'

  // คำนวณจำนวนวินาทีที่ผ่านมาตั้งแต่ timestamp นั้น
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  // น้อยกว่า 8 วินาที → "เมื่อสักครู่" (ดูเป็น real-time)
  if (seconds < 8) return 'เมื่อสักครู่'

  // 8–59 วินาที → "XX วินาทีที่แล้ว"
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`

  // 1–59 นาที → "XX นาทีที่แล้ว"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`

  // 1+ ชั่วโมง → "XX ชั่วโมงที่แล้ว"
  const hours = Math.floor(minutes / 60)
  return `${hours} ชั่วโมงที่แล้ว`
}

```

---

<a id="srcutilssoundjs"></a>

## [src/utils/sound.js](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/utils/sound.js)

**Path:** `src/utils/sound.js` | **Lines:** 198 | **Size:** 10.4 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// utils/sound.js — ระบบเสียงแจ้งเตือนของแอป (Web Audio API)
// สร้างเสียงแบบ synthesized (ไม่ต้องใช้ไฟล์เสียงภายนอก)
// รองรับ 4 ประเภทเสียง: click, alert, critical, success
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CyberShield — Web Audio API Sound System
 * Synthesizes sci-fi HUD audio effects and threat sirens without any external audio file dependencies.
 */

// AudioContext instance ร่วม — สร้างครั้งเดียว แล้วใช้ซ้ำตลอด
let audioCtx = null;

/**
 * getAudioContext — สร้างหรือดึง AudioContext ที่มีอยู่แล้ว
 * - รองรับทั้ง window.AudioContext (standard) และ window.webkitAudioContext (Safari เก่า)
 * - ถ้า context ถูก suspend (เช่น browser ระงับไว้) จะ resume กลับมา
 */
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // browser อาจ suspend AudioContext หลังผู้ใช้ไม่โต้ตอบนาน → resume ก่อนเล่น
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─────────────────────────────────────────────────────────────────────────────
// ส่วนจัดการการตั้งค่าเสียง (บันทึกลง localStorage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * isSoundEnabled — ตรวจสอบว่าเสียงเปิดอยู่หรือไม่
 * ค่าเริ่มต้นคือ true (เปิด) ถ้าไม่เคยตั้งค่าไว้
 */
export function isSoundEnabled() {
  const stored = localStorage.getItem('cybershield_sound_enabled');
  return stored !== 'false'; // default true
}

/**
 * setSoundEnabled — เปิด/ปิดเสียงและบันทึกลง localStorage
 * @param {boolean} enabled - true = เปิดเสียง, false = ปิดเสียง
 */
export function setSoundEnabled(enabled) {
  localStorage.setItem('cybershield_sound_enabled', enabled ? 'true' : 'false');
}

/**
 * getVolume — ดึงค่าระดับเสียง (0.0 – 1.0) จาก localStorage
 * ค่าเริ่มต้นคือ 0.4 (40%)
 */
export function getVolume() {
  const stored = localStorage.getItem('cybershield_volume');
  return stored ? parseFloat(stored) : 0.4;
}

/**
 * setVolume — บันทึกระดับเสียงลง localStorage
 * @param {number} vol - ระดับเสียง 0.0 – 1.0
 */
export function setVolume(vol) {
  localStorage.setItem('cybershield_volume', vol.toString());
}

// ─────────────────────────────────────────────────────────────────────────────
// ส่วนสร้างเสียงแบบ synthesized
// ─────────────────────────────────────────────────────────────────────────────

/**
 * playSound — เล่นเสียงแจ้งเตือนตามประเภทที่กำหนด
 * @param {'alert' | 'critical' | 'click' | 'success'} type - ประเภทเสียง
 *
 * - 'click'    → เสียงคลิก HUD สั้นๆ (ใช้ทุกครั้งที่กดปุ่ม)
 * - 'alert'    → เสียง siren ภัยคุกคามระดับปานกลาง-สูง
 * - 'critical' → เสียง pulse เร็ว 3 ครั้ง สำหรับภัยวิกฤต (DEFCON 1/2)
 * - 'success'  → เสียง chime ขึ้นสูง สำหรับการทำสำเร็จ / reconnect
 */
export function playSound(type = 'alert') {
  // ถ้าผู้ใช้ปิดเสียง ไม่ต้องเล่น
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const vol = getVolume();

    // GainNode ควบคุมระดับเสียงรวม — เชื่อมกับ output จริง (speakers)
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    // ── เสียง 'click' — เสียงคลิก HUD สั้นๆ ความถี่สูง ──
    if (type === 'click') {
      // Short HUD high-pitched tick
      const osc = ctx.createOscillator();
      osc.type = 'sine';                                          // คลื่นไซน์ (เสียงนุ่ม)
      osc.frequency.setValueAtTime(1400, now);                   // เริ่มที่ความถี่สูง
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04); // ลดลงเร็ว (เสียง "tik")

      gainNode.gain.setValueAtTime(vol * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.04); // เล่นแค่ 40ms

    // ── เสียง 'alert' — Dual-tone Cyber Alert Siren ──
    // ใช้สำหรับภัยคุกคาม confidence >= 0.82 แต่ < 0.92
    } else if (type === 'alert') {
      // Dual-tone Cyber Alert Siren
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; // คลื่นเลื่อย (เสียงแหลมคม เหมือน siren)
      
      // สลับความถี่ D5 → A5 → D5 ให้ฟังดู "alert"
      osc.frequency.setValueAtTime(587.33, now);       // D5
      osc.frequency.setValueAtTime(880, now + 0.12);   // A5
      osc.frequency.setValueAtTime(587.33, now + 0.24); // D5

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(vol * 0.6, now + 0.02);
      gainNode.gain.setValueAtTime(vol * 0.6, now + 0.28);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      // Lowpass filter กรองความถี่สูงเกินไปออก ให้เสียงนุ่มขึ้น
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      osc.connect(filter);
      filter.connect(gainNode);

      osc.start(now);
      osc.stop(now + 0.4); // เล่น 400ms

    // ── เสียง 'critical' — Fast repeating DEFCON 1 pulse ──
    // ใช้สำหรับภัยคุกคามวิกฤต confidence >= 0.92 (DEFCON 2)
    } else if (type === 'critical') {
      // Fast repeating DEFCON 1 pulse — เล่น 3 pulse ต่อเนื่องกัน
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'square'; // คลื่นสี่เหลี่ยม (เสียงดังและแหลม)
        const start = now + i * 0.14; // แต่ละ pulse ห่างกัน 140ms
        osc.frequency.setValueAtTime(960, start);
        osc.frequency.linearRampToValueAtTime(480, start + 0.1); // ลดความถี่ลง (เสียง "dun")

        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(vol * 0.7, start);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        // Bandpass filter เน้นความถี่กลาง ให้เสียงดัง
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, start);

        osc.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      }

    // ── เสียง 'success' — Sci-fi ascending chime ──
    // ใช้เมื่อ: ล็อกอินสำเร็จ, reconnect สำเร็จ, สมัครสมาชิกสำเร็จ
    } else if (type === 'success') {
      // Sci-fi ascending chime — โน้ต C5, E5, G5, C6 เรียงขึ้น
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // คลื่นไซน์ (เสียงนุ่ม ไม่แหลม)
        const start = now + idx * 0.08; // แต่ละโน้ตเล่นห่างกัน 80ms

        osc.frequency.setValueAtTime(freq, start);

        const toneGain = ctx.createGain();
        toneGain.gain.setValueAtTime(vol * 0.4, start);
        toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(toneGain);
        toneGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25); // แต่ละโน้ตเล่น 250ms
      });
    }
  } catch (e) {
    // ถ้าเบราว์เซอร์ไม่รองรับ Web Audio API หรือเกิด error ใดๆ ให้ log แล้วผ่าน
    console.warn('Audio play error:', e);
  }
}

```

---

<a id="srccomponentsaccessdeniedmodaljsx"></a>

## [src/components/AccessDeniedModal.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/components/AccessDeniedModal.jsx)

**Path:** `src/components/AccessDeniedModal.jsx` | **Lines:** 52 | **Size:** 3.2 KB

```javascript
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

```

---

<a id="srccomponentsinfohelpjsx"></a>

## [src/components/InfoHelp.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/components/InfoHelp.jsx)

**Path:** `src/components/InfoHelp.jsx` | **Lines:** 102 | **Size:** 5.6 KB

```javascript
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

```

---

<a id="srccomponentsthreatinspectmodaljsx"></a>

## [src/components/ThreatInspectModal.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/components/ThreatInspectModal.jsx)

**Path:** `src/components/ThreatInspectModal.jsx` | **Lines:** 180 | **Size:** 10.5 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// components/ThreatInspectModal.jsx — Modal แสดงรายละเอียดภัยคุกคาม
//
// เปิดจาก: Dashboard, Incidents, Logs — เมื่อคลิก "ตรวจสอบ" / "Inspect" บนแถวเหตุการณ์
// แสดง: confidence score, attack class, model ที่ตรวจพบ, Source IP, timestamp
// Action (Admin เท่านั้น): Block & Quarantine IP, Export JSON Evidence
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';

/**
 * ThreatInspectModal — Modal ตรวจสอบภัยคุกคามแบบละเอียด
 * @param {object} event   - ข้อมูล event/log ที่ต้องการตรวจสอบ (จาก API หรือ mock)
 * @param {function} onClose - callback ปิด modal
 */
export default function ThreatInspectModal({ event, onClose }) {
  const { isGeneralView } = useApp();

  // ถ้าไม่มี event (modal ยังไม่ถูกเปิด) ไม่ต้อง render อะไร
  if (!event) return null;

  // ── State ของ Modal ──
  const [quarantined, setQuarantined] = useState(false);     // IP ถูก quarantine แล้วหรือยัง
  const [actionLoading, setActionLoading] = useState(false); // loading ระหว่างกด Block IP
  const [actionMessage, setActionMessage] = useState('');    // ข้อความผลลัพธ์หลังทำ action

  // ── ตรวจสอบสถานะ Quarantine จาก API (SQLite blocked_ips table) ──
  // ใช้ข้อมูลจาก Server แทน localStorage เพื่อความสอดคล้องข้ามหน้าและข้ามอุปกรณ์
  useEffect(() => {
    let cancelled = false;
    // ดึงรายการ IP ที่ถูกบล็อกทั้งหมด แล้วเช็คว่า source_ip ของ event นี้อยู่ในนั้นไหม
    fetch('/api/blocked-ips')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          setQuarantined(data.data.some((row) => row.ip === event.source_ip));
        }
      })
      .catch(() => {}); // ถ้า API ล้มเหลว ให้แสดง "ยังไม่ได้ quarantine" (safe default)
    return () => { cancelled = true; }; // cleanup: ป้องกัน state update หลัง unmount
  }, [event.source_ip]);

  // ── ประเมินระดับความรุนแรง: is_alert flag หรือ confidence >= 80% ──
  const isAlert = event.is_alert || event.confidence >= 0.8;

  /**
   * handleQuarantine — บล็อก Source IP ผ่าน API แล้วอัปเดตสถานะ
   * General User ไม่สามารถทำ action นี้ได้ (isGeneralView guard)
   */
  async function handleQuarantine() {
    if (isGeneralView) return; // General User ห้ามทำ action นี้
    playSound('click');
    setActionLoading(true);
    try {
      // ส่ง POST /api/blocked-ips เพื่อเพิ่ม IP เข้า blacklist
      const res = await fetch('/api/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: event.source_ip }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuarantined(true);
        setActionMessage(`Source IP ${event.source_ip} quarantined across edge firewalls.`);
        playSound('success'); // เสียงสำเร็จ
      } else {
        setActionMessage('Failed to quarantine IP.');
      }
    } catch {
      setActionMessage('Failed to quarantine IP.'); // กรณี network error
    } finally {
      setActionLoading(false);
    }
  }

  /**
   * handleExportJson — Export ข้อมูล event เป็นไฟล์ JSON
   * ทุก role สามารถทำได้ เพราะเป็น read-only action
   */
  function handleExportJson() {
    playSound('click');
    // สร้าง data URL ของ JSON แล้วสร้าง <a> ชั่วคราวเพื่อ trigger download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(event, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `cybershield_event_${event.id || event.timestamp}.json`);
    document.body.appendChild(a); a.click(); a.remove();
    playSound('success');
  }

  /**
   * formatTime — แปลง timestamp เป็น string ภาษาไทย (วัน/เดือน/ปี เวลา)
   */
  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleString('th-TH', { hour12: false }) } catch { return timestamp || 'N/A' }
  }

  return (
    // Backdrop — คลิกพื้นหลังเพื่อปิด modal
    <div className="dialog-backdrop" onClick={onClose}>
      {/* การ์ด modal — ธีม blueprint (มุมตกแต่ง) */}
      <div className="dialog card blueprint elev-lg" onClick={(e) => e.stopPropagation()}>
        {/* มุมตกแต่งสไตล์ blueprint */}
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>

        {/* ── ส่วนหัว Modal: ไอคอน + หัวข้อ + เลข Ref + ปุ่มปิด ── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* ไอคอนแสดงระดับ: "!" สีแดง = ภัยคุกคาม, "OK" สีเขียว = ปลอดภัย */}
            <div className={`modal-icon ${isAlert ? 'icon-alert' : 'icon-safe'}`}>{isAlert ? '!' : 'OK'}</div>
            <div>
              <h3 style={{ margin: 0 }}>Threat Inspection</h3>
              <span className="text-muted" style={{ fontSize: 12 }}>Ref: #{event.id || event.event_id || 'LIVE'}</span>
            </div>
          </div>
          {/* ปุ่มปิด modal */}
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }}>×</button>
        </div>

        {/* ── Banner แสดง Confidence Score และ Attack Class ── */}
        {/* สีแดง = ภัยคุกคาม, สีเขียว = ปลอดภัย */}
        <div className={`risk-banner ${isAlert ? 'banner-alert' : 'banner-safe'}`}>
          <div>
            <span className="risk-value mono">{(event.confidence * 100).toFixed(1)}%</span>
            <span className="risk-label">Threat Confidence</span>
          </div>
          <div>
            <div className="risk-attack-class">{event.attack_class || 'Unknown'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {/* badge ชื่อโมเดล LSTM ที่ตรวจพบ */}
              Detected by <span className={`event-model-badge ${event.model_name}`}>{event.model_name}</span> model
            </div>
          </div>
        </div>

        {/* ── Grid รายละเอียด: Source IP, Timestamp, Alert Status, Model Architecture ── */}
        <div className="modal-details-grid">
          <div className="detail-box"><span className="detail-label">Source IP</span><span className="mono">{event.source_ip}</span></div>
          <div className="detail-box"><span className="detail-label">Timestamp</span><span className="mono">{formatTime(event.timestamp)}</span></div>
          <div className="detail-box">
            <span className="detail-label">Alert Status</span>
            {/* badge แสดงระดับความเสี่ยง: HIGH PRIORITY (แดง) หรือ MONITORED (เขียว) */}
            <span className={`tag ${isAlert ? 'tag-danger' : 'tag-accent'}`} style={{ width: 'fit-content' }}>{isAlert ? 'HIGH PRIORITY' : 'MONITORED'}</span>
          </div>
          <div className="detail-box">
            <span className="detail-label">Model Architecture</span>
            <span className="mono">
              {/* แสดง dataset ที่ใช้ train model ตามชื่อโมเดล */}
              {event.model_name === 'intrusion' ? 'UNSW-NB15 LSTM (49 feats)' :
               event.model_name === 'flow' ? 'CIC-IDS2018 LSTM (78 feats)' : 'Deep Embedding LSTM (SQLi)'}
            </span>
          </div>
        </div>

        {/* ── ส่วน Actions: Block & Quarantine IP, Export JSON ── */}
        <div>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Active Containment &amp; Actions</div>
          {/* แสดงข้อความผลลัพธ์หลังจากทำ action */}
          {actionMessage && <div className="action-feedback">{actionMessage}</div>}
          <div className="action-buttons-group">
            {/* Block & Quarantine IP — General User เห็นแต่ปุ่ม disabled + tooltip ไทย */}
            <button
              className={`btn ${quarantined ? 'btn-secondary' : 'btn-danger'}`}
              onClick={handleQuarantine}
              disabled={quarantined || actionLoading || isGeneralView}
              title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
              style={isGeneralView ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >
              {actionLoading ? '...' : quarantined ? 'IP Quarantined' : `Block & Quarantine ${event.source_ip}`}
            </button>
            {/* Export JSON — ทุก role ทำได้ เป็นการ export ข้อมูลเพื่อการสืบสวน */}
            <button className="btn btn-secondary" onClick={handleExportJson}>Export JSON Evidence</button>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

<a id="srcpagesloginjsx"></a>

## [src/pages/Login.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Login.jsx)

**Path:** `src/pages/Login.jsx` | **Lines:** 347 | **Size:** 21.8 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Login.jsx — หน้าล็อกอินและสมัครสมาชิก
//
// รองรับ 2 โหมด (Tab): Sign In และ Sign Up
// Sign In: ตรวจสอบกับ localStorage ก่อน ถ้าไม่เจอจึง call API /api/login
// Sign Up: บันทึก user ใหม่ลง localStorage (role: General User)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

/**
 * Login — หน้าล็อกอิน / สมัครสมาชิก
 * @param {function} onLoginSuccess - callback เมื่อล็อกอินสำเร็จ (ส่ง username, role, email, profile)
 */
export default function Login({ onLoginSuccess }) {
  const { t } = useApp()

  // ── โหมดปัจจุบัน: 'signin' หรือ 'signup' ──
  const [authMode, setAuthMode] = useState('signin')

  // ── State ฟอร์ม Sign In ──
  const [loginUsername, setLoginUsername] = useState('')   // ช่อง Username
  const [loginPassword, setLoginPassword] = useState('')   // ช่อง Password
  const [showSigninPw, setShowSigninPw] = useState(false)  // toggle แสดง/ซ่อน password

  // ── State ฟอร์ม Sign Up ──
  const [regUsername, setRegUsername] = useState('')       // ชื่อผู้ใช้ (username)
  const [regName, setRegName] = useState('')               // ชื่อจริง
  const [regLastname, setRegLastname] = useState('')       // นามสกุล
  const [regPhone, setRegPhone] = useState('')             // เบอร์โทรศัพท์
  const [regEmail, setRegEmail] = useState('')             // อีเมล
  const [regPassword, setRegPassword] = useState('')       // รหัสผ่าน
  const [regConfirm, setRegConfirm] = useState('')         // ยืนยันรหัสผ่าน
  const [showSignupPw, setShowSignupPw] = useState(false)  // toggle แสดง/ซ่อน password
  const [showConfirmPw, setShowConfirmPw] = useState(false)// toggle แสดง/ซ่อน confirm password
  const [consentChecked, setConsentChecked] = useState(false) // checkbox ยินยอมข้อมูล

  // ── State ทั่วไป ──
  const [loading, setLoading] = useState(false)       // กำลังส่งฟอร์ม (ปิดปุ่ม)
  const [error, setError] = useState(null)            // ข้อความ error
  const [successMsg, setSuccessMsg] = useState(null)  // ข้อความสำเร็จ (หลังสมัครสมาชิก)
  const [shake, setShake] = useState(false)           // animation สั่น card เมื่อ error

  // ── สลับ Tab Sign In / Sign Up ──
  function handleTabSwitch(mode) {
    playSound('click')
    setAuthMode(mode)
    setError(null)        // ล้าง error เมื่อเปลี่ยน tab
    setSuccessMsg(null)
  }

  /**
   * triggerShake — แสดง error พร้อม animation สั่น card
   * @param {string} message - ข้อความ error ที่จะแสดง
   */
  function triggerShake(message) {
    playSound('click')
    setError(message)
    setSuccessMsg(null)
    setShake(true)
    setTimeout(() => setShake(false), 500) // หยุด animation หลัง 500ms
  }

  // ─────────────────────────────────────────────────────────────────────────
  // หน้าล็อกอิน — ส่วนของ handleLoginSubmit (Sign In logic)
  // ลำดับการตรวจสอบ:
  //   1. ตรวจ username/password จาก localStorage (user ที่สมัครผ่านหน้า Sign Up)
  //   2. ถ้าไม่เจอ → call API /api/login (สำหรับ admin จาก backend)
  // ─────────────────────────────────────────────────────────────────────────
  async function handleLoginSubmit(e) {
    e.preventDefault()

    // validation: ต้องกรอก username และ password
    if (!loginUsername.trim() || !loginPassword.trim()) {
      triggerShake('Please enter both username and password')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      // ── Step 1: ค้นหาใน localStorage (user ที่สมัครเอง) ──
      const localUsers = JSON.parse(localStorage.getItem('cybershield_registered_operators') || '[]')
      const foundUser = localUsers.find(
        (u) => u.username.toLowerCase() === loginUsername.trim().toLowerCase() && u.password === loginPassword
      )

      if (foundUser) {
        // ล็อกอินสำเร็จด้วย local user
        playSound('success')
        onLoginSuccess(foundUser.username, foundUser.role || 'General User', foundUser.email, {
          name: foundUser.name || foundUser.username,
          lastname: foundUser.lastname || '',
          phone: foundUser.phone || '-'
        })
        return
      }

      // ── Step 2: ส่งไป API /api/login (สำหรับ admin account จาก backend) ──
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data = await res.json()

      if (data.ok) {
        // API ล็อกอินสำเร็จ — ให้ role เป็น SOC Lead Operator
        playSound('success')
        onLoginSuccess(data.username, 'SOC Lead Operator', `${data.username}@cybershield.th`, {
          name: 'System', lastname: 'Administrator', phone: '-'
        })
      } else {
        triggerShake(data.message || 'Invalid username or password')
      }
    } catch (err) {
      // กรณี network error (server ไม่รัน หรือ CORS)
      triggerShake('Connection failed. Please verify the server is running')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // หน้าสมัครสมาชิก — ส่วนของ handleRegisterSubmit (Sign Up logic)
  // บันทึก user ใหม่ลง localStorage พร้อม role: 'General User'
  // ─────────────────────────────────────────────────────────────────────────
  function handleRegisterSubmit(e) {
    e.preventDefault()

    // ── Validation ทุกช่อง ──
    if (!regUsername.trim() || !regName.trim() || !regLastname.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirm.trim()) {
      triggerShake('Please fill in all registration fields')
      return
    }
    if (regUsername.trim().length < 3) { triggerShake('Username must be at least 3 characters long'); return }
    if (regName.trim().length < 2 || regLastname.trim().length < 2) { triggerShake('Please enter a valid first and last name'); return }
    if (!/^[0-9+\-()\s]{8,15}$/.test(regPhone.trim())) { triggerShake('Please enter a valid phone number'); return }
    if (!regEmail.includes('@') || !regEmail.includes('.')) { triggerShake('Please enter a valid email address'); return }
    if (!consentChecked) { triggerShake('Please accept the data-usage consent to continue'); return }
    if (regPassword.length < 6) { triggerShake('Password must be at least 6 characters long'); return }
    if (regPassword !== regConfirm) { triggerShake('Passwords do not match'); return }

    setLoading(true)
    setError(null)

    // จำลอง delay การบันทึก (500ms) เพื่อ UX ที่ดีขึ้น
    setTimeout(() => {
      try {
        // ตรวจสอบ username ซ้ำใน localStorage
        const localUsers = JSON.parse(localStorage.getItem('cybershield_registered_operators') || '[]')
        const exists = localUsers.some((u) => u.username.toLowerCase() === regUsername.trim().toLowerCase())

        // ป้องกันไม่ให้ใช้ชื่อ 'admin' เพราะเป็น reserved สำหรับ backend admin
        if (exists || regUsername.trim().toLowerCase() === 'admin') {
          triggerShake('Username already taken. Please choose another')
          setLoading(false)
          return
        }

        // ── สร้าง user object ใหม่ ──
        const newUser = {
          id: Date.now(),                         // ใช้ timestamp เป็น ID ชั่วคราว
          username: regUsername.trim(),
          name: regName.trim(),
          lastname: regLastname.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          password: regPassword,                  // หมายเหตุ: เก็บใน localStorage ไม่ encrypt
          role: 'General User',                   // user ที่สมัครเองจะได้ role General User
          createdAt: new Date().toISOString(),
        }

        // บันทึก user ใหม่เข้า localStorage
        localStorage.setItem('cybershield_registered_operators', JSON.stringify([...localUsers, newUser]))
        playSound('success')
        setLoading(false)
        // สลับกลับไป Sign In แล้วกรอก username ให้อัตโนมัติ
        setAuthMode('signin')
        setLoginUsername(newUser.username)
        setSuccessMsg(t.login.signupSuccessNotice) // ข้อความ "สมัครสำเร็จ กรุณาล็อกอิน"
      } catch (err) {
        triggerShake('Failed to save registration data')
        console.error('Registration error:', err)
        setLoading(false)
      }
    }, 500)
  }

  // ── Feature cards แสดงในแถบซ้ายของหน้าล็อกอิน (ฟีเจอร์ระบบ) ──
  const FEATURES = [
    { icon: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", viewBox: '0 0 20 24', title: t.login.featIntrusionTitle, desc: t.login.featIntrusionDesc },
    { icon: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4", viewBox: '0 0 24 24', title: t.login.featFlowTitle, desc: t.login.featFlowDesc },
    { icon: "M8.5 1.3L15.5 13H1.5L8.5 1.3ZM8.5 5.5v3.5M8.5 11v.01", viewBox: '0 0 16 16', title: t.login.featAlertTitle, desc: t.login.featAlertDesc },
  ]

  return (
    // ── Layout หลัก: แบ่ง 2 ส่วน (แถบซ้าย + ฟอร์ม) ──
    <div className="login-shell">

      {/* ── แถบซ้าย: แสดง Brand + Feature List + Footer status ── */}
      <div className="login-side-panel">
        <div className="login-side-content">
          {/* โลโก้และชื่อแอป */}
          <div className="login-brand-row">
            <span className="shield-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
            </span>
            <h1 style={{ fontSize: 22, margin: 0, color: '#F1F4FA' }}>{t.brand}</h1>
          </div>
          <div className="login-side-tagline">{t.tagline}</div>
        </div>

        {/* รายการฟีเจอร์ของระบบ (Intrusion Detection, Flow Analysis, Alert) */}
        <div className="login-feature-list">
          {FEATURES.map((f, i) => (
            <div className="login-feature-item" key={i}>
              <span className="login-feature-icon">
                <svg width="16" height="16" viewBox={f.viewBox} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </span>
              <div className="login-feature-text">
                <div className="ft-title">{f.title}</div>
                <div className="ft-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Status footer: dot สีเขียว + ข้อความระบบออนไลน์ */}
        <div className="login-side-footer">
          <span className="status-dot dot-online"></span>{t.login.sideFooter}
        </div>
      </div>

      {/* ── แถบขวา: Card ฟอร์มล็อกอิน/สมัครสมาชิก ── */}
      <div className="login-form-panel">
        {/* shake class เพิ่มเมื่อมี error เพื่อ animation สั่น */}
        <div className={`card elev-md login-card ${shake ? 'shake' : ''}`}>

          {/* ── หัว Card: ชื่อหน้าและ subtitle ── */}
          <div className="login-brand">
            <div className="login-brand-row" style={{ display: 'none' }}>
              <span className="shield-icon" style={{ width: 52, height: 52, borderRadius: 14 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
              </span>
            </div>
            <h1 style={{ fontSize: 21, margin: 0 }}>{authMode === 'signin' ? t.login.welcomeBack : t.login.tabSignup}</h1>
            <div className="login-tagline">{authMode === 'signin' ? t.login.signinSubtitle : t.login.signupSubtitle}</div>
          </div>

          {/* ── Tab เลือก Sign In / Sign Up ── */}
          <div className="auth-tabs">
            <button type="button" className={authMode === 'signin' ? 'active' : ''} onClick={() => handleTabSwitch('signin')}>{t.login.tabSignin}</button>
            <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => handleTabSwitch('signup')}>{t.login.tabSignup}</button>
          </div>

          {/* ── แสดง Error / Success notice ── */}
          {error && <div className="card login-notice" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
          {successMsg && <div className="card login-notice" style={{ borderColor: 'var(--color-accent)', fontSize: 13 }}>{successMsg}</div>}

          {/* ─────────────────────────────────────────────────────────────────────
              หน้าล็อกอิน — ส่วนของฟอร์ม Sign In
          ───────────────────────────────────────────────────────────────────── */}
          {authMode === 'signin' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* ช่อง Username */}
              <div className="field">
                <label>{t.login.usernameLabel}</label>
                <input className="input" placeholder={t.login.usernamePh} value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} disabled={loading} autoFocus />
              </div>
              {/* ช่อง Password พร้อมปุ่มแสดง/ซ่อน */}
              <div className="field">
                <label>{t.login.passwordLabel}</label>
                <div className="pw-field">
                  <input className="input" type={showSigninPw ? 'text' : 'password'} placeholder={t.login.passwordPh} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={loading} />
                  <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowSigninPw((s) => !s)}>
                    {showSigninPw ? t.login.hidePw : t.login.showPw}
                  </button>
                </div>
              </div>
              {/* hint สำหรับ admin account (username: admin) */}
              <div className="text-muted" style={{ fontSize: 12 }}>{t.login.adminHint}</div>
              {/* ปุ่ม Submit */}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '...' : t.login.submitSignin}
              </button>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────────
              หน้าสมัครสมาชิก — ส่วนของฟอร์ม Sign Up
          ───────────────────────────────────────────────────────────────────── */}
          {authMode === 'signup' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Grid 2 คอลัมน์: ชื่อ, นามสกุล, username, เบอร์โทร */}
              <div className="auth-grid">
                <div className="field"><label>{t.login.firstName}</label><input className="input" placeholder={t.login.firstNamePh} value={regName} onChange={(e) => setRegName(e.target.value)} disabled={loading} autoFocus /></div>
                <div className="field"><label>{t.login.lastName}</label><input className="input" placeholder={t.login.lastNamePh} value={regLastname} onChange={(e) => setRegLastname(e.target.value)} disabled={loading} /></div>
                <div className="field"><label>{t.login.usernameLabel}</label><input className="input" placeholder={t.login.usernamePh2} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={loading} /></div>
                <div className="field"><label>{t.login.phone}</label><input className="input" placeholder={t.login.phonePh} value={regPhone} onChange={(e) => setRegPhone(e.target.value)} disabled={loading} /></div>
              </div>
              {/* ช่อง Email */}
              <div className="field"><label>{t.login.email}</label><input className="input" placeholder={t.login.emailPh} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} /></div>
              {/* Grid 2 คอลัมน์: Password + Confirm Password */}
              <div className="auth-grid">
                <div className="field">
                  <label>{t.login.passwordLabel}</label>
                  <div className="pw-field">
                    <input className="input" type={showSignupPw ? 'text' : 'password'} minLength={6} placeholder={t.login.passwordPh2} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} />
                    <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowSignupPw((s) => !s)}>{showSignupPw ? t.login.hidePw : t.login.showPw}</button>
                  </div>
                </div>
                <div className="field">
                  <label>{t.login.confirmPassword}</label>
                  <div className="pw-field">
                    <input className="input" type={showConfirmPw ? 'text' : 'password'} minLength={6} placeholder={t.login.confirmPh} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} disabled={loading} />
                    <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowConfirmPw((s) => !s)}>{showConfirmPw ? t.login.hidePw : t.login.showPw}</button>
                  </div>
                </div>
              </div>
              {/* Checkbox ยินยอมการเก็บข้อมูลส่วนบุคคล */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ marginTop: 3 }} />
                <span>{t.login.consentText}</span>
              </label>
              {/* ปุ่ม Submit — disabled ถ้ายังไม่ยินยอม */}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading || !consentChecked}>
                {loading ? '...' : t.login.submitSignup}
              </button>
            </form>
          )}

          {/* ── Footer: badge Secure + หมายเหตุ ── */}
          <div className="login-footer">
            <span className="tag tag-outline">{t.login.secureBadge}</span>
            <p style={{ fontSize: 12, margin: 0 }} className="text-muted">{t.login.footerNote}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

```

---

<a id="srcpagesdashboardjsx"></a>

## [src/pages/Dashboard.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Dashboard.jsx)

**Path:** `src/pages/Dashboard.jsx` | **Lines:** 730 | **Size:** 52.8 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Dashboard.jsx — หน้าหลัก (Dashboard) ภาพรวมความปลอดภัย
//
// ประกอบด้วย:
//   - Stat Cards: สถานะระบบ, จำนวนเหตุการณ์, แจ้งเตือนวิกฤต, แก้ไขแล้ว
//   - Network Chart: กราฟความเร็วแพ็กเก็ตเครือข่ายแบบ real-time (SVG line chart พร้อมกราฟ 3 เส้น)
//   - Summary Table: รายการเหตุการณ์ล่าสุดจาก API (ใช้ mock ถ้ายังไม่มีข้อมูล)
//   - Donut Chart: สัดส่วนระดับความรุนแรง + Bar Chart: การแจ้งเตือนรายสัปดาห์
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react'
import InfoHelp from '../components/InfoHelp'
import ThreatInspectModal from '../components/ThreatInspectModal'
import { useApp } from '../context/AppContext'
import { relativeTimeTh } from '../utils/time'

// ── Config ระดับความรุนแรง (Severity) ───────────────────────────────────────
// ⚡ แก้ชื่อหรือสีที่นี่ → เห็นผลทันทีในตารางเหตุการณ์และตารางสุดท้าย
// ต้องใช้ค่า confidence เดียวกับ Incidents.jsx (ไม่งั้นจะแสดงไม่ตรงกัน)
const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต',    color: '#f87171' },  // confidence >= 95% — สีแดง
  HIGH:     { label: 'สูง',      color: '#fb923c' },  // confidence >= 90% — สีส้ม
  MEDIUM:   { label: 'ปานกลาง', color: '#fbbf24' }, // confidence >= 80% — สีเหลือง
  LOW:      { label: 'ต่ำ',      color: '#4ade80' },  // confidence < 80%  — สีเขียว
}

// ── Config สถานะเหตุการณ์ (Status) ───────────────────────────────────────
// ⚡ แก้ label ภาษาไทยหรือสีที่นี่ → badge สถานะในตารางเปลี่ยนทันที
const STATUS_CONFIG = {
  OPEN:          { label: 'เปิดอยู่',      bg: 'rgba(239,68,68,.12)',   color: '#f87171' }, // แดง
  INVESTIGATING: { label: 'กำลังตรวจสอบ', bg: 'rgba(234,179,8,.12)',   color: '#fbbf24' }, // เหลือง
  MITIGATED:     { label: 'แก้ไขแล้ว',    bg: 'rgba(34,197,94,.12)',   color: '#4ade80' }, // เขียว
}

// ── ฟังก์ชันแปลง confidence (0.0-1.0) → Severity key ─────────────────────
// ⚡ แก้ค่า threshold ที่นี่ → ระดับความรุนแรงในตารางเปลี่ยนทันที
// ตารางสุดท้ายและตัวเลข Stat Card ใช้ฟังก์ชันนี้ทั้งหมด
function getSevKey(confidence) {
  // >= 0.95 → CRITICAL, >= 0.90 → HIGH, >= 0.80 → MEDIUM, < 0.80 → LOW
  return confidence >= 0.95 ? 'CRITICAL' : confidence >= 0.9 ? 'HIGH' : confidence >= 0.8 ? 'MEDIUM' : 'LOW'
}

// ── Donut Chart — แสดงสัดส่วนระดับความรุนแรงแบบวงแหวน ─────────────────────────────────
function DonutChart({ data, size = 120, strokeWidth = 16 }) {
  const [hovered, setHovered] = useState(null)
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const GAP_DEG = 3.5 // องศาช่องว่างระหว่างแต่ละส่วน
  const GAP_ARC = (GAP_DEG / 360) * circumference

  // สร้าง segments พร้อมช่องว่างระหว่างกัน
  let segments = []
  let cumulative = 0
  data.forEach((d, i) => {
    if (d.value === 0) return
    const arcLen = (d.value / total) * circumference
    const drawn = Math.max(0, arcLen - GAP_ARC)
    segments.push({ ...d, i, arcLen, drawn, offset: cumulative })
    cumulative += arcLen
  })

  const hoveredItem = hovered !== null ? data[hovered] : null
  const hoveredPct = hoveredItem ? Math.round((hoveredItem.value / total) * 100) : null

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* วงกลมพื้นหลัง (Track) */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-soft)" strokeWidth={strokeWidth} />
        {segments.map(({ color, drawn, offset, i, label }) => (
          <circle key={i} cx={center} cy={center} r={radius} fill="none"
            stroke={hovered === null || hovered === i ? color : `${color}55`}
            strokeWidth={hovered === i ? strokeWidth + 3 : strokeWidth}
            strokeDasharray={`${drawn} ${circumference}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-opacity .2s, stroke-width .15s', cursor: 'pointer' }}
            transform={`rotate(-90 ${center} ${center})`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* ป้ายกำกับตรงกลางวงแหวน */}
      {hoveredItem ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <span style={{ fontSize: size * 0.18, fontWeight: 800, color: hoveredItem.color, lineHeight: 1 }}>{hoveredPct}%</span>
          <span style={{ fontSize: size * 0.1, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600, textAlign: 'center', maxWidth: size * 0.7 }}>{hoveredItem.label}</span>
        </div>
      ) : null}
    </div>
  )
}

// ── Bar Chart — กราฟแท่งแยกปริมาณ Alert รายสัปดาห์ (คลิก pin แต่ละแถวได้) ─────────────────────
function BarChart({ values }) {
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const MAX = Math.max(...values)
  const active = pinned !== null ? pinned : hovered

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* แถบกราฟแท่ง */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 5, padding: '0 2px', minHeight: 0 }}>
        {values.map((v, i) => {
          const isMax = v === MAX
          const isActive = active === i
          const pct = (v / MAX) * 100
          return (
            <div
              key={i}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => { if (pinned === null) setHovered(i) }}
              onMouseLeave={() => { if (pinned === null) setHovered(null) }}
              onClick={() => setPinned(pinned === i ? null : i)}
            >
              {/* ป้ายแสดงค่าเมื่อ hover */}
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: `${pct}%`, left: '50%',
                  transform: 'translate(-50%, -6px)',
                  background: isMax ? '#6366f1' : 'var(--card-bg)',
                  color: isMax ? '#fff' : 'var(--text)',
                  border: `1.5px solid ${isMax ? '#6366f1' : 'var(--border-soft)'}`,
                  borderRadius: 7, padding: '3px 7px',
                  fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                  zIndex: 10, pointerEvents: 'none',
                }}>
                  {v} ครั้ง
                  {/* ลูกศรชี้ลงใต้ป้าย */}
                  <span style={{
                    position: 'absolute', top: '100%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid ${isMax ? '#6366f1' : 'var(--border-soft)'}`,
                  }} />
                </div>
              )}
              {/* แท่งกราฟ */}
              <div style={{
                width: '100%',
                height: `${pct}%`,
                borderRadius: '6px 6px 3px 3px',
                background: isMax
                  ? 'linear-gradient(180deg,#818cf8,#6366f1)'
                  : isActive
                    ? 'linear-gradient(180deg,rgba(99,102,241,.8),rgba(99,102,241,.5))'
                    : 'linear-gradient(180deg,rgba(99,102,241,.45),rgba(99,102,241,.2))',
                boxShadow: isMax ? '0 0 10px rgba(99,102,241,.55)' : isActive ? '0 0 6px rgba(99,102,241,.35)' : 'none',
                transform: isActive ? 'scaleX(1.08)' : 'scaleX(1)',
                transition: 'height .4s ease, background .2s, transform .15s, box-shadow .2s',
              }} />
            </div>
          )
        })}
      </div>
      {/* แกน X (ป้ายเวลาด้านล่าง) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-soft)', marginTop: 8 }}>
        {['-24 ชม.', '-12 ชม.', 'ตอนนี้'].map(l => <span key={l} style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Dropdown ────────────────────────────────────────────────────────────────────
/**
 * Dropdown — Component dropdown menu ทั่วไป
 * ใช้เลือก: ช่วงเวลา, หน่วยวัด, และ filter ตารางสรุป
 * @param {function} trigger    - render prop สำหรับปุ่ม trigger (รับ boolean open)
 * @param {Array} items         - รายการ { key, label } ใน dropdown
 * @param {function} onSelect   - callback เมื่อเลือก item (รับ key)
 * @param {string} selectedKey  - key ที่เลือกอยู่ (ใช้ bold + สีเน้น)
 * @param {string} [tooltip]    - แสดง tooltip เหนือ dropdown เมื่อ open
 */
function Dropdown({ trigger, items, onSelect, selectedKey, tooltip }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // ปิด dropdown เมื่อคลิกนอก component
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {tooltip && open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: 'var(--shadow)', zIndex: 100, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {tooltip}
        </div>
      )}
      <div onClick={() => setOpen(o => !o)}>{trigger(open)}</div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 99, minWidth: 140, overflow: 'hidden' }}>
          {items.map(item => (
            <div key={item.key} onClick={() => { onSelect(item.key); setOpen(false) }}
              style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontWeight: item.key === selectedKey ? 700 : 400, background: item.key === selectedKey ? 'rgba(99,102,241,.1)' : 'transparent', color: item.key === selectedKey ? 'var(--accent)' : 'var(--text)', transition: 'background .12s' }}
              onMouseEnter={e => { if (item.key !== selectedKey) e.currentTarget.style.background = 'var(--row-head-bg)' }}
              onMouseLeave={e => { if (item.key !== selectedKey) e.currentTarget.style.background = 'transparent' }}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bell Notification ──────────────────────────────────────────────────────────
/**
 * BellButton — ปุ่มกระดิ่งแจ้งเตือนมุมบนขวาของ Dashboard
 * แสดง dot แดงเมื่อมีการแจ้งเตือนใหม่ และเปิด popover เมื่อคลิก
 * (ข้อมูลใน popover เป็น static demo — ใน production ให้ดึงจาก notification API)
 */
function BellButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // ปิด popover เมื่อคลิกนอก component
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', position: 'relative' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: '#f87171', border: '2px solid var(--card-bg)' }}></span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 99, width: 340, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251,191,36,.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
              พบพฤติกรรมการเข้าสู่ระบบที่ผิดปกติ
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
              Suspicious Activity (srv-auth-07, 198.51.100.4)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useApp()

  // ── ข้อมูลสำหรับกราฟเครือข่าย Real-time SVG Line Chart ───────────────────────────
  const CHART_BUCKETS = 26   // ⚡ จำนวน data point ในกราฟ (ยิ่งมาก = กราฟทอดยาวขึ้น)
  const BUCKET_MS = 2000     // ⚡ อัปเดตทุก 2 วินาที (ลด = เร็ว, เพิ่ม = ช้า)

  // ฟังก์ชันสร้างข้อมูลเริ่มต้นแบบสุ่ม (base = ค่าเฉลี่ย, vol = ความสั่น)
  const generateInitialSeries = (base, vol) => Array(CHART_BUCKETS).fill(0).map(() => Math.max(0, base + (Math.random() * vol - vol / 2)))

  // สาม series: แต่ละตัวคือ sliding window ของ CHART_BUCKETS ค่า
  // ⚡ แก้ค่า base → เส้นสูง/ต่ำลง, แก้ vol → สั่นมาก/น้อย
  const [safeHistory,   setSafeHistory]   = useState(() => generateInitialSeries(1800, 400)) // เส้นเขียว (ทราฟฟิกปกติ)
  const [threatHistory, setThreatHistory] = useState(() => generateInitialSeries(200,  100))  // เส้นแดง (ภัยคุกคาม)
  const [watchHistory,  setWatchHistory]  = useState(() => generateInitialSeries(60,   40))   // เส้นส้ม (เฝ้าระวัง)

  // เลื่อนกราฟทุก BUCKET_MS — ตัดค่าแรกออกแล้วเพิ่มค่าใหม่ด้านขวา
  useEffect(() => {
    const interval = setInterval(() => {
      // safe: ค่าเฉลี่ย 1800, สั่น +-200 ต่อ step, ต่ำสุด 1000 pps
      setSafeHistory(prev   => [...prev.slice(1), Math.max(1000, prev[prev.length - 1] + (Math.random() * 400 - 200))])
      // threat: ค่าเฉลี่ย 200, สั่น +-75 ต่อ step, ต่ำสุด 0
      setThreatHistory(prev => [...prev.slice(1), Math.max(0,    prev[prev.length - 1] + (Math.random() * 150 - 75))])
      // watch: ค่าเฉลี่ย 60, สั่น +-30 ต่อ step, ต่ำสุด 0
      setWatchHistory(prev  => [...prev.slice(1), Math.max(0,    prev[prev.length - 1] + (Math.random() * 60 - 30))])
    }, BUCKET_MS)
    return () => clearInterval(interval)  // cleanup: หยุด interval เมื่อ component unmount
  }, [])

  // ── คำนวณสำหรับ SVG Line Chart ───────────────────────────────────────────────
  const chartW = 640, chartH = 148  // ขนาด SVG canvas (px) — ยืดด้วย CSS preserveAspectRatio
  const maxVal = 4000               // ⚡ ค่าสูงสุดของแกน Y (pps) — แก้เพื่อปรับสเกลกราฟ
  const stepX = chartW / (CHART_BUCKETS - 1)  // ระยะห่างแนวนอนแต่ละจุดในกราฟ (px)

  // เปลี่ยน array ค่า → SVG path string (M x,y L x,y ...)
  const createPath = (data) => data
    .map((v, i) => [i * stepX, chartH - (v / maxVal) * chartH])  // ค่า → พิกัด x,y
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')

  const safePath    = createPath(safeHistory)    // เส้นเขียว (ปกติ)
  const safeAreaPath = `${safePath} L${chartW},${chartH} L0,${chartH} Z`  // พื้นที่ใต้เส้น (gradient fill)
  const threatPath  = createPath(threatHistory)  // เส้นแดง (ภัยคุกคาม)
  const watchPath   = createPath(watchHistory)   // เส้นส้ม (เฝ้าระวัง)

  // เส้นแนวนอนแนวตั้ง Y (gridlines): 0%, 25%, 50%, 75%, 100% ของ maxVal
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: chartH * f,
    label: f === 1 ? '0' : Math.round(maxVal * (1 - f) / 1000) + 'K'  // label: 4K, 3K, 2K, 1K, 0
  }))

  // คำนวณพิกัด (x, y) ทุกจุดในแต่ละ series (ใช้วาง dot ที่โคนสุด)
  const safePoints   = safeHistory.map((v, i)   => [i * stepX, chartH - (v / maxVal) * chartH])
  const threatPoints = threatHistory.map((v, i) => [i * stepX, chartH - (v / maxVal) * chartH])
  const watchPoints  = watchHistory.map((v, i)  => [i * stepX, chartH - (v / maxVal) * chartH])

  // จุดสุดท้ายของแต่ละเส้น — ใช้วาง dot เอา circle ไว้ที่ปลายเส้นด้านขวา
  const [lastSafeX,   lastSafeY]   = safePoints[safePoints.length - 1]
  const [lastThreatX, lastThreatY] = threatPoints[threatPoints.length - 1]
  const [lastWatchX,  lastWatchY]  = watchPoints[watchPoints.length - 1]

  // ── State Dropdown (ช่วงเวลา, หน่วยวัด, filter สรุป) ────────────────────────────
  // ⚡ เพิ่ม/ลบตัวเลือกใน Dropdown → ปาก dropdown เปลี่ยนทันที
  const [timeRange,     setTimeRange]     = useState('24h')  // ช่วงเวลาที่เลือก
  const [unitKey,       setUnitKey]       = useState('pps')  // หน่วยวัดกราฟ
  const [summaryFilter, setSummaryFilter] = useState('all')  // ตัวกรองตารางสรุป

  const TIME_OPTIONS   = [{ key: '1h', label: '1 ชั่วโมง' }, { key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: '30d', label: '30 วัน' }]
  const UNIT_OPTIONS   = [{ key: 'pps', label: 'pps (แพ็กเก็ต/วินาที)' }, { key: 'bps', label: 'bps (กิโล/วินาที)' }, { key: 'count', label: 'จำนวนแพ็กเก็ตรวม' }]
  const FILTER_OPTIONS = [{ key: 'all', label: 'ทั้งหมด' }, { key: 'critical', label: 'วิกฤต' }, { key: 'high', label: 'สูง' }, { key: 'medium', label: 'ปานกลาง' }, { key: 'low', label: 'ต่ำ' }]

  // ดึง label ปัจจุบันจาก state เพื่อแสดงในปุ่ม Dropdown
  const summaryLabel = FILTER_OPTIONS.find(o => o.key === summaryFilter)?.label || 'ทั้งหมด'
  const timeLabel    = TIME_OPTIONS.find(o => o.key === timeRange)?.label || '24 ชั่วโมง'
  const unitLabel    = UNIT_OPTIONS.find(o => o.key === unitKey)?.label || 'pps (แพ็กเก็ต/วินาที)'

  // ── Fallback Data (ข้อมูลเอีย เมื่อ API ยังไม่มีข้อมูล) ─────────────────────────────────
  // ⚡ แก้ข้อมูลที่นี่ → ตารางด้านล่างเปลี่ยนทันที (เมื่อ API ยังไม่มีข้อมูล)
  const FALLBACK_INCIDENTS = [
    { time: '2 วินาทีที่แล้ว', type: 'SQL Injection', desc: 'ตรวจพบ SQL Injection attempt on login endpoint', source: '192.168.1.45', target: 'srv-db-01', sevColor: '#f87171', sev: 'วิกฤต', statusBg: 'rgba(34,197,94,.12)', statusColor: '#4ade80', status: 'แก้ไขแล้ว' },
    { time: '5 นาทีที่แล้ว',  type: 'Brute Force',   desc: 'Multiple failed login attempts detected', source: '45.33.22.11', target: 'srv-web-02', sevColor: '#fb923c', sev: 'สูง', statusBg: 'rgba(234,179,8,.12)', statusColor: '#fbbf24', status: 'กำลังตรวจสอบ' },
    { time: '12 นาทีที่แล้ว', type: 'Port Scan',    desc: 'Sequential port scanning detected on DMZ', source: '112.54.33.2', target: 'dmz-fw-01', sevColor: '#fbbf24', sev: 'ปานกลาง', statusBg: 'rgba(148,163,184,.1)', statusColor: '#94a3b8', status: 'บล็อกแล้ว' },
  ]

  // ── ดึงข้อมูลจริงจาก Backend (API) ─────────────────────────────────────────────
  const [incidents,    setIncidents]    = useState([])    // events จาก /api/logs (alert only)
  const [statusMap,    setStatusMap]    = useState({})    // { event_id: 'OPEN'|'INVESTIGATING'|'MITIGATED' }
  const [selectedEvent, setSelectedEvent] = useState(null) // event ที่คลิกเปิด ThreatInspectModal

  useEffect(() => {
    fetchIncidents()  // ดึง events ที่เป็น alert
    fetchStatuses()   // ดึง triage status ของแต่ละ event
  }, [])

  // ดึง alert events 200 รายการล่าสุด
  async function fetchIncidents() {
    try {
      const res = await fetch('/api/logs?limit=200&alerts_only=true')
      const data = await res.json()
      if (data.ok) setIncidents(data.data)
    } catch { /* ถ้า fetch ไม่เสร็จ ใช้ FALLBACK_INCIDENTS ได้เลย */ }
  }

  // ดึง triage status ของทุก event จาก incident_status
  async function fetchStatuses() {
    try {
      const res = await fetch('/api/incidents/statuses')
      const data = await res.json()
      if (data.ok) setStatusMap(data.data)  // data.data = { "1": "MITIGATED", ... }
    } catch { }
  }

  // ดึงสถานะของ event หนึ่ง — ถ้าไม่มีใน statusMap ใช้ 'OPEN' เป็นค่าเริ่มต้น
  function getStatus(item) { return statusMap[item.id] || 'OPEN' }

  // ── คำนวณตัวเลขสำหรับ Stat Cards ───────────────────────────────────────────
  const hasRealIncidents = incidents.length > 0  // true = มีข้อมูลจาก API

  // ⚡ ตัวเลข Stat Cards: ถ้ามี API ใช้สด — ถ้าไม่มีใช้ตัวเลข fallback นี้
  const totalIncidents    = hasRealIncidents ? incidents.length : 7
  const criticalIncidents = hasRealIncidents
    ? incidents.filter(i => getSevKey(i.confidence) === 'CRITICAL').length
    : 3  // ตัวเลขสำรอง
  const resolvedIncidents = hasRealIncidents
    ? incidents.filter(i => getStatus(i) === 'MITIGATED').length
    : 12  // ตัวเลขสำรอง

  // เรียงจากใหม่ → เก่า และเอา 5 อันดับแรกเพื่อแสดงในตาราง
  const latestIncidents = [...incidents]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  // ── Style helper: Dropdown trigger button (pill shape) ───────────────────────────
  // ใช้กับ spread operator: {...pillBtn(), extraStyle} เพื่อ override บางค่า
  const pillBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10,
    border: '1px solid var(--border-soft)', background: 'var(--card-bg)', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── ส่วนหัวหน้า ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>ยินดีต้อนรับกลับ, admin 👋</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 13.5 }}>ภาพรวมสถานะความปลอดภัยของระบบและกิจกรรมล่าสุด</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ช่องค้นหา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', width: 260 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input placeholder="ค้นหา IP, เหตุการณ์, หรือตั้งต่างๆ..." style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
          </div>

          {/* Dropdown เลือกช่วงเวลา */}
          <Dropdown
            selectedKey={timeRange}
            items={TIME_OPTIONS}
            onSelect={setTimeRange}
            trigger={(open) => (
              <button style={pillBtn()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {timeLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            )}
          />

          {/* ปุ่มกระดิ่งแจ้งเตือน */}
          <BellButton />
        </div>
      </div>

      {/* ── การ์ดสถิติสรุป ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {/* สถานะระบบ */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4ade80', display: 'inline-block' }}></span>
            สถานะระบบ
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>ปลอดภัย</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>ทุกระบบทำงานปกติ</div>
        </div>

        {/* เหตุการณ์ทั้งหมด */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            เหตุการณ์ทั้งหมด
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{totalIncidents}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>เหตุการณ์ที่ต้องติดตาม</div>
        </div>

        {/* แจ้งเตือนวิกฤต — highlighted */}
        <div style={{ padding: '18px 20px', borderRadius: 14, border: '1.5px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#f87171', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            แจ้งเตือนวิกฤต
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171' }}>{criticalIncidents}</div>
          <div style={{ fontSize: 11.5, marginTop: 5, color: '#f87171', fontWeight: 600 }}>ต้องดำเนินการทันที</div>
        </div>

        {/* เหตุการณ์ที่แก้ไขแล้ว */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            เหตุการณ์ที่แก้ไขแล้ว
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{resolvedIncidents}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>ใน 24 ชั่วโมง</div>
        </div>

        {/* สถานะโดยรวม */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path></svg>
            สถานะโดยรวม
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>ออนไลน์</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>พร้อมใช้งาน</div>
        </div>
      </div>

      {/* ── กราฟเครือข่ายหลัก ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 7 }}>
              ความเร็วแพ็กเก็ตเครือข่ายแบบสด <InfoHelp id="packetSpeed" />
            </div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>ปริมาณทราฟฟิกเครือข่ายย้อนหลัง 24 ชั่วโมง แยกตามระดับความเสี่ยงที่ตรวจพบ</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* คำอธิบายสีกราฟ (Legend) */}
            {[['#4ade80', 'ปกติ / ไม่เป็นภัย'], ['#f87171', 'ภัยคุกคาม'], ['#fb923c', 'เฝ้าระวัง']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }}></span>
                {label}
              </div>
            ))}
            {/* Dropdown เลือกหน่วยวัด */}
            <Dropdown
              selectedKey={unitKey}
              items={UNIT_OPTIONS}
              onSelect={setUnitKey}
              trigger={(open) => (
                <button style={{ ...pillBtn(), fontSize: 12, padding: '6px 12px' }}>
                  {unitLabel}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              )}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20, width: 28, textAlign: 'right' }}>
            {gridLines.map((g, i) => <span key={i} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{g.label}</span>)}
          </div>
          <div style={{ flex: 1 }}>
            <svg width="100%" height="148" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                </linearGradient>
              </defs>
              {gridLines.map((g, i) => <line key={i} x1="0" y1={g.y} x2={chartW} y2={g.y} stroke="var(--border-soft)" strokeWidth="1" />)}
              <path d={safeAreaPath} fill="url(#safeGrad)" stroke="none" />
              <path d={safePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <path d={watchPath} fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <path d={threatPath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <circle cx={lastSafeX} cy={lastSafeY} r="3" fill="#4ade80" />
              <circle cx={lastWatchX} cy={lastWatchY} r="3" fill="#fb923c" />
              <circle cx={lastThreatX} cy={lastThreatY} r="3" fill="#f87171" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].map(t => (
                <span key={t} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ส่วนสรุปเหตุการณ์ ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>สรุปเหตุการณ์ & กิจกรรมล่าสุด</div>
          <Dropdown
            selectedKey={summaryFilter}
            items={FILTER_OPTIONS}
            onSelect={setSummaryFilter}
            tooltip={summaryFilter !== 'all' ? `กำลังกรองสรุปเหตุการณ์: ${summaryLabel}` : undefined}
            trigger={(open) => (
              <button style={{ ...pillBtn(), fontSize: 12.5, padding: '7px 14px' }}>
                {summaryLabel}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            )}
          />
        </div>

        {/* กริดการ์ดสรุป 4 ช่อง */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {/* การ์ด 1: ประเภทเหตุการณ์ */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>ประเภทเหตุการณ์</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>สัดส่วนเหตุการณ์ที่ตรวจพบวันนี้ แยกตามประเภทการโจมตีโจมตี</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={[
                { value: 34, color: '#6366f1', label: 'DoS' },
                { value: 28, color: '#22d3ee', label: 'Intrusion' },
                { value: 20, color: '#f97316', label: 'Brute Force' },
                { value: 10, color: '#f43f5e', label: 'SQL Injection' },
                { value: 8,  color: '#a78bfa', label: 'อื่นๆ' },
              ]} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['#6366f1', 'DoS', '34%'], ['#22d3ee', 'Intrusion', '28%'], ['#f97316', 'Brute Force', '20%'], ['#f43f5e', 'SQL Injection', '10%'], ['#a78bfa', 'อื่นๆ', '8%']].map(([c, l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 2: ความรุนแรง */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>ความรุนแรง</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>จำนวนเหตุการณ์ที่เปิดอยู่ แยกตามระดับความรุนแรง</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={[
                { value: 3,  color: '#f43f5e', label: 'วิกฤต' },
                { value: 8,  color: '#f97316', label: 'สูง' },
                { value: 15, color: '#eab308', label: 'ปานกลาง' },
                { value: 23, color: '#22c55e', label: 'ต่ำ' },
              ]} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['#f43f5e', 'วิกฤต', 3], ['#f97316', 'สูง', 8], ['#eab308', 'ปานกลาง', 15], ['#22c55e', 'ต่ำ', 23]].map(([c, l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 3: แหล่งที่มา */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>แหล่งที่มา</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 24 }}>สัดส่วนแหล่งของทราฟฟิกที่ตรวจพบเหตุการณ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: <path d="M2 7h20M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2m3 0v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />, color: '#4ade80', label: 'ภายในเครือข่าย', val: '45%' },
                { icon: <><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></>, color: '#60a5fa', label: 'ภายนอก', val: '35%' },
                { icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>, color: '#fb923c', label: 'ไม่ทราบ', val: '20%' },
              ].map(({ icon, color, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">{icon}</svg>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 4: แนวโน้ม 24 ชั่วโมง */}
          <div className="card elev-sm" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>แนวโน้ม 24 ชั่วโมง</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,.1)', padding: '3px 8px', borderRadius: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                พีค 42 ครั้ง
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 12 }}>จำนวนเหตุการณ์ที่ตรวจพบต่อช่วง 2 ชั่วโมง ย้อนหลัง 24 ชั่วโมง</div>
            <BarChart values={[12, 18, 14, 28, 16, 22, 18, 38, 42, 34, 26, 32]} />
          </div>
        </div>

        {/* ── ตารางรายการเหตุการณ์ล่าสุด ── */}
        <div className="card elev-sm" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                {['เวลา', 'ประเภท', 'รายละเอียด', 'แหล่งที่มา', 'เป้าหมาย', 'ความรุนแรง', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasRealIncidents ? latestIncidents.map((item) => {
                const sevKey = getSevKey(item.confidence)
                const sev = SEV_CONFIG[sevKey]
                const status = STATUS_CONFIG[getStatus(item)]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedEvent(item)}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{relativeTimeTh(new Date(item.timestamp).getTime())}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`event-model-badge ${item.model_name}`} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{item.attack_class || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)' }}>Confidence {(item.confidence * 100).toFixed(1)}% · ตรวจพบโดยโมเดล {item.model_name}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{item.source_ip}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-tertiary)' }}>—</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: sev.color, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: sev.color, display: 'inline-block', flexShrink: 0 }}></span>
                        {sev.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: status.bg, color: status.color, fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{status.label}</span>
                    </td>
                  </tr>
                )
              }) : FALLBACK_INCIDENTS.map((ev, i) => (
                <tr key={i} style={{ borderBottom: i < FALLBACK_INCIDENTS.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{ev.time}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: 'var(--gray-chip-bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{ev.type}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)' }}>{ev.desc}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{ev.source}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{ev.target}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: ev.sevColor, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: ev.sevColor, display: 'inline-block', flexShrink: 0 }}></span>
                      {ev.sev}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: ev.statusBg, color: ev.statusColor, fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{ev.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}

```

---

<a id="srcpagesanalyticsjsx"></a>

## [src/pages/Analytics.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Analytics.jsx)

**Path:** `src/pages/Analytics.jsx` | **Lines:** 307 | **Size:** 20.2 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Analytics.jsx — หน้าวิเคราะห์ภัยคุกคาม (Threat Analytics)
//
// ประกอบด้วย  3 ส่วนหลัก:
//   1. การกระจายประเภทภัยคุกคาม (Bar Spectrum Chart)
//   2. แผนที่ MITRE ATT&CK (Tactic → Technique → ความรุนแรง)
//   3. ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว (accuracy, F1-score, latency)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';
import { CONN_STATUS } from '../hooks/useConnectionStatus';

/**
 * Analytics — หน้าวิเคราะห์ภัยคุกคาม (Threat Analytics Dashboard)
 * แสดงกราฟ Bar Spectrum, แผนที่ MITRE ATT&CK และข้อมูลประสิทธิภาพโมเดล AI
 */
export default function Analytics() {
  const { t, lang, conn } = useApp();

  // liveEnabled: true เมื่อเชื่อมต่ออยู่ — ปุ่ม refresh จะถูก disabled ถ้าขาดการเชื่อมต่อ
  const liveEnabled = conn.status !== CONN_STATUS.DISCONNECTED;

  // timeRange: ช่วงเวลาที่เลือก ('24h' | '7d' | 'all') — ใช้สำหรับ filter กราฟในอนาคต
  const [timeRange, setTimeRange] = useState('24h');

  // refreshKey: เพิ่มทุกครั้งที่กดรีเฟรช เพื่อ trigger re-fetch ข้อมูล
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * handleRefresh — รีเฟรชกราฟและข้อมูล (ทำงานเฉพาะเมื่อเชื่อมต่ออยู่)
   * ถ้าขาดการเชื่อมต่อ ปุ่มจะถูก disabled และฟังก์ชันนี้จะ return ทันที
   */
  const handleRefresh = () => {
    if (!liveEnabled) return;
    playSound('click');
    setRefreshKey(k => k + 1); // trigger re-render/re-fetch
  };

  // ── ข้อมูลการกระจายประเภทภัยคุกคาม (Spectrum Bar Chart) ──
  // สัดส่วนผลการจำแนกของโมเดลจากข้อมูลทดสอบ (demo data)
  const spectrumRows = [
    { label: 'ปกติ / ไม่โจมตี', count: 342, pct: '55.0', color: 'var(--green)' },
    { label: 'DDoS', count: 84, pct: '13.5', color: 'var(--red)' },
    { label: 'DoS', count: 56, pct: '9.0', color: 'var(--red)' },
    { label: 'R2L (Remote to Local)', count: 23, pct: '3.7', color: 'var(--yellow)' },
    { label: 'U2R (User to Root)', count: 9, pct: '1.4', color: 'var(--blue)' },
    { label: 'Brute Force', count: 67, pct: '10.8', color: 'var(--blue)' },
    { label: 'SQL Injection', count: 41, pct: '6.6', color: 'var(--border)' },
    { label: 'อื่น ๆ / ไม่ทราบประเภท', count: 0, pct: '0.0', color: 'var(--text-tertiary)' }
  ];
  const displayTotal = 622; // ยอดรวมของแถวทั้งหมด

  /**
   * MitreIcon — ไอคอน SVG สำหรับแต่ละขั้นตอนใน MITRE ATT&CK
   * @param {string} name - ชื่อขั้นตอน ('recon' | 'initial' | 'credential' | 'lateral' | 'privilege' | 'impact')
   * - recon      → Reconnaissance (กล้องส่องทางไกล/เรดาร์)
   * - initial    → Initial Access (แสง/ดวงอาทิตย์ = ช่องโหว่เปิด)
   * - credential → Credential Access (กุญแจล็อก)
   * - lateral    → Lateral Movement (ลูกศร 2 ทิศ = การเคลื่อนย้าย)
   * - privilege  → Privilege Escalation (ลูกศรขึ้น = ยกระดับสิทธิ์)
   * - impact     → Impact (สัญญาณ wifi = network disruption)
   */
  const MitreIcon = ({ name }) => {
    let path = "";
    if (name === 'recon')      path = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v4 M12 18v4 M2 12h4 M18 12h4";
    if (name === 'initial')    path = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
    if (name === 'credential') path = "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4";
    if (name === 'lateral')    path = "M16 3l4 4-4 4 M8 21l-4-4 4-4 M4 7h16 M20 17H4";
    if (name === 'privilege')  path = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M16 5l-4-4-4 4";
    if (name === 'impact')     path = "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01";
    
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    )
  }

  // ── ข้อมูลแผนที่ MITRE ATT&CK ──
  // จับคู่เทคนิคการโจมตีที่ตรวจพบกับขั้นตอนมาตรฐาน MITRE ATT&CK
  const mitreRows = [
    { tactic: 'การลาดตระเวณ', technique: 'สแกนเครือข่าย', tacticEn: 'Reconnaissance', techEn: 'Network Scanning', sev: 'ปานกลาง', bg: 'var(--orange-bg-strong)', fg: 'var(--yellow-text)', icon: 'recon' },
    { tactic: 'การเข้าถึงเบื้องต้น', technique: 'โจมตีแบบใช้ช่องโหว่จากข้อมูล (SQLi)', tacticEn: 'Initial Access', techEn: 'Exploit Public-Facing Application (SQLi)', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'initial' },
    { tactic: 'การเข้าถึงข้อมูล', technique: 'โจมตีแบบ Brute Force', tacticEn: 'Credential Access', techEn: 'Brute Force', sev: 'สูง', bg: 'var(--orange-bg)', fg: 'var(--orange-text-mid)', icon: 'credential' },
    { tactic: 'การเคลื่อนที่ในระบบ', technique: 'Remote to Local (R2L)', tacticEn: 'Lateral Movement', techEn: 'Remote Services', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'lateral' },
    { tactic: 'การยกระดับสิทธิ์', technique: 'User to Root (U2R)', tacticEn: 'Privilege Escalation', techEn: 'Privilege Escalation', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'privilege' },
    { tactic: 'ผลกระทบ', technique: 'Network DoS (DDoS/DoS)', tacticEn: 'Impact', techEn: 'Network Denial of Service', sev: 'สูง', bg: 'var(--orange-bg)', fg: 'var(--orange-text-mid)', icon: 'impact' },
  ];

  // ── ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว ──
  // แสดงในส่วน "ข้อมูลประสิทธิภาพโมเดล" ด้านล่าง เป็นการ์ด 3 ใบ (INTRUSION, FLOW, SQLI)
  const telemetryData = [
    { 
      tag: 'INTRUSION', 
      name: 'Intrusion LSTM (NSL-KDD)', 
      desc: 'ตรวจจับการโจมตีแบบ Zero-day และการยกระดับสิทธิ์ R2L/U2R',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'Packet + Flow', 
      accLabel: 'ความแม่นยำ',
      acc: '96.32%', 
      f1Label: 'F1-SCORE',
      f1: '0.9421', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '12.6 ms',
      icon: <path d="M18 20V10 M12 20V4 M6 20v-6" />
    },
    { 
      tag: 'FLOW', 
      name: 'Flow LSTM (CSE-CIC-IDS2018)', 
      desc: 'ตรวจจับการโจมตี DDoS, DoS และรูปแบบ Brute Force',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'NetFlow + Packet', 
      accLabel: 'ความแม่นยำ',
      acc: '97.15%', 
      f1Label: 'F1-SCORE',
      f1: '0.9534', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '15.2 ms',
      icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" />
    },
    { 
      tag: 'SQLI', 
      name: 'Injection LSTM (SQLi)', 
      desc: 'ตรวจจับ SQL Injection จาก Query String และ Payload',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'Query + Payload', 
      accLabel: 'ความแม่นยำ',
      acc: '95.48%', 
      f1Label: 'F1-SCORE',
      f1: '0.9317', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '9.8 ms',
      icon: <path d="M4 5a8 3 0 1 0 16 0A8 3 0 1 0 4 5z M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5 M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>การวิเคราะห์ภัยคุกคาม & การวิเคราะห์</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 4, fontSize: 13.5 }}>การกระจายประเภทภัยคุกคาม แผนที่ MITRE ATT&CK และค่าความมั่นใจของโมเดล</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="pill-tab-group" style={{ background: 'var(--gray-chip-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
            {[{ key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: 'all', label: 'ทั้งหมด' }].map(({ key, label }) => (
              <button
                key={key}
                className="pill-tab"
                onClick={() => { setTimeRange(key); playSound('click'); }}
                style={{
                  background: timeRange === key ? 'var(--card-bg)' : 'transparent',
                  border: 'none',
                  boxShadow: timeRange === key ? 'var(--shadow)' : 'none',
                  color: timeRange === key ? 'var(--text)' : 'var(--text-secondary)',
                  padding: '7px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontWeight: timeRange === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-outline"
            onClick={handleRefresh}
            disabled={!liveEnabled}
            title={!liveEnabled ? 'ขาดการเชื่อมต่ออยู่ — เชื่อมต่อสดก่อนจึงจะรีเฟรชได้' : undefined}
            style={!liveEnabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span style={{ marginLeft: 6 }}>รีเฟรชกราฟ</span>
          </button>
        </div>
      </div>

      <div className="two-col">
        <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>การกระจายประเภทภัยคุกคาม</div>
              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>สัดส่วนผลการจำแนกของโมเดลจากข้อมูลทดสอบทั้งหมด</div>
            </div>
            <div className="tag tag-neutral" style={{ padding: '6px 12px', background: 'var(--gray-chip-bg)', color: 'var(--gray-chip-text)', fontSize: 11.5, fontWeight: 700 }}>รวมทั้งหมด {displayTotal} รายการ</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {spectrumRows.map((row) => (
              <div key={row.label} className="bar-list-row" style={{ gap: 8 }}>
                <div className="bar-list-head" style={{ fontSize: 13, color: 'var(--text)' }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 700 }}>{row.count} ({row.pct}%)</span>
                </div>
                <div className="dist-bar-bg" style={{ height: 8, background: 'var(--border-soft)' }}>
                  <div className="dist-bar-fill" style={{ width: `${row.pct}%`, background: row.color, height: '100%', borderRadius: 999 }} />
                </div>
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="card-title" style={{ marginBottom: 4, fontSize: 15 }}>แผนที่ MITRE ATT&CK <InfoHelp id="mitre" /></div>
          <div className="text-muted" style={{ fontSize: 11.5, marginBottom: 24 }}>จับคู่เทคนิคการโจมตีที่ตรวจพบกับขั้นตอนมาตรฐาน MITRE ATT&CK</div>
          
          <div className="mitre-row mitre-head" style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: 16 }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>กลุ่มภัย</span>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>เทคนิค (Technique)</span>
            <span style={{ textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>ความรุนแรง</span>
          </div>
          
          {mitreRows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: i === mitreRows.length - 1 ? 'none' : '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="mitre-cell-icon" style={{ background: 'var(--row-head-bg)', color: 'var(--text-secondary)' }}>
                  <MitreIcon name={row.icon} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{row.tactic}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{row.tacticEn}</div>
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{row.technique}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{row.techEn}</div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span className="tag" style={{ 
                  background: row.bg, 
                  color: row.fg,
                  fontSize: 11.5,
                  padding: '5px 12px'
                }}>
                  {row.sev}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
          ข้อมูลประสิทธิภาพโมเดล <InfoHelp id="modelPerf" />
        </div>
        <div className="model-grid">
          {telemetryData.map((m) => (
            <div key={m.tag} className="card elev-sm model-card" style={{ padding: '20px 22px', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag tag-neutral" style={{ padding: '4px 10px', fontSize: 11 }}>ผลลัพธ์สาธิต</span>
                <span className="status-badge-online"><span className="status-dot dot-online"></span>ออนไลน์</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="model-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)', width: 44, height: 44, borderRadius: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {m.icon}
                  </svg>
                </div>
                <div className="model-name" style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
              </div>
              
              <div className="model-desc" style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
                {m.desc}
              </div>
              
              <div className="model-stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.inputLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 14, fontWeight: 700 }}>{m.inputShape}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.accLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.acc}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{m.f1Label} <InfoHelp id="f1score" /></span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.f1}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.latencyLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.latency}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```

---

<a id="srcpagesincidentsjsx"></a>

## [src/pages/Incidents.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Incidents.jsx)

**Path:** `src/pages/Incidents.jsx` | **Lines:** 916 | **Size:** 61.2 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Incidents.jsx — หน้าจัดการเหตุการณ์ภัยคุกคาม (Incident Management)
//
// ประกอบด้วย:
//   - ตารางรายการเหตุการณ์พร้อม filter/search/sort และ date picker ภาษาไทย
//   - Triage flow: OPEN → INVESTIGATING → MITIGATED (สิ้นสุด)
//   - Donut Chart สัดส่วนระดับความรุนแรง + Audit Log การดำเนินการ
//   - ดึงข้อมูลจาก API (/api/logs, /api/incidents/statuses) ใช้ MOCK_INCIDENTS เป็น fallback
//   - Live feed: subscribe WebSocket /ws/feed เพื่อรับ alert ใหม่แบบ real-time
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { playSound } from '../utils/sound';
import ThreatInspectModal from '../components/ThreatInspectModal';
import InfoHelp from '../components/InfoHelp';
import { useApp } from '../context/AppContext';
import { CONN_STATUS } from '../hooks/useConnectionStatus';

// ── ข้อมูลจำลอง (Mock Data) — ใช้เมื่อยังไม่มีข้อมูลจาก API ────────────────────────────────────────────
const MOCK_INCIDENTS = [
  { id: 1, timestamp: '2025-05-19T14:32:11', attack_class: 'SQL Injection', description: 'SQL Injection attempt on login endpoint', detail: "GET /login.php?id=1 OR '1'='1'", source_ip: '203.0.113.45', source_flag: '🇺🇸', target: '192.168.1.45', severity: 'วิกฤต', sevKey: 'CRITICAL', status: 'OPEN', model_name: 'Injection LSTM', confidence: 0.97 },
  { id: 2, timestamp: '2025-05-19T14:28:45', attack_class: 'Brute Force', description: 'Multiple failed login attempts detected', detail: '(admin)', source_ip: '198.51.100.23', source_flag: '🇩🇪', target: '192.168.1.45', severity: 'สูง', sevKey: 'HIGH', status: 'INVESTIGATING', model_name: 'Intrusion LSTM', confidence: 0.91 },
  { id: 3, timestamp: '2025-05-19T14:21:07', attack_class: 'DDoS', description: 'High volume of traffic detected', detail: '(UDP Flood)', source_ip: '198.51.100.77', source_flag: '🇩🇪', target: '192.168.1.45', severity: 'สูง', sevKey: 'HIGH', status: 'OPEN', model_name: 'Flow LSTM', confidence: 0.95 },
  { id: 4, timestamp: '2025-05-19T14:15:33', attack_class: 'Port Scan', description: 'Sequential port scanning detected', detail: '(20 ports)', source_ip: '203.0.113.88', source_flag: '🇹🇭', target: '192.168.1.45', severity: 'ปานกลาง', sevKey: 'MEDIUM', status: 'MITIGATED', model_name: 'Intrusion LSTM', confidence: 0.83 },
  { id: 5, timestamp: '2025-05-19T14:03:55', attack_class: 'Suspicious Activity', description: 'Suspicious request to sensitive file', detail: '(/etc/passwd)', source_ip: '192.0.2.56', source_flag: '🇹🇭', target: '192.168.1.45', severity: 'ต่ำ', sevKey: 'LOW', status: 'MITIGATED', model_name: 'Intrusion LSTM', confidence: 0.78 },
];

const MOCK_AUDIT = [
  { id: 1, timestamp: '2025-05-19T12:30:00', username: 'admin Administrator', action: 'กักกัน IP Address 203.0.113.45 เรียบร้อย', icon: 'check', color: 'var(--green)', bg: 'var(--green-bg)' },
  { id: 2, timestamp: '2025-05-19T12:17:00', username: 'admin Administrator', action: 'บล็อก Signature ID 1200456 บนระบบ IPS', icon: 'block', color: 'var(--red)', bg: 'var(--red-bg)' },
  { id: 3, timestamp: '2025-05-19T12:06:00', username: 'admin Administrator', action: 'เพิ่มกฎ Firewall ป้องกัน SQL Injection', icon: 'calendar', color: 'var(--text-secondary)', bg: 'var(--row-head-bg)' },
  { id: 4, timestamp: '2025-05-19T11:50:00', username: 'admin Administrator', action: 'ตรวจสอบแหล่งที่มา DDoS จาก 198.51.100', icon: 'search', color: 'var(--text-secondary)', bg: 'var(--row-head-bg)' },
];

const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต', bg: 'rgba(239,68,68,.15)', color: '#f87171' },
  HIGH:     { label: 'สูง',    bg: 'rgba(249,115,22,.15)', color: '#fb923c' },
  MEDIUM:   { label: 'ปานกลาง', bg: 'rgba(234,179,8,.15)', color: '#fbbf24' },
  LOW:      { label: 'ต่ำ',    bg: 'rgba(34,197,94,.12)', color: '#4ade80' },
  INFO:     { label: 'ข้อมูล', bg: 'rgba(59,130,246,.12)', color: '#60a5fa' },
};

const STATUS_CONFIG = {
  OPEN:          { label: 'เปิดอยู่',      dot: '#f87171', dotBg: 'rgba(239,68,68,.12)' },
  INVESTIGATING: { label: 'กำลังตรวจสอบ', dot: '#fbbf24', dotBg: 'rgba(234,179,8,.12)' },
  MITIGATED:     { label: 'แก้ไขแล้ว',    dot: '#4ade80', dotBg: 'rgba(34,197,94,.12)', check: true },
};

// กระบวนการ Triage: OPEN → INVESTIGATING → MITIGATED. MITIGATED ไม่มี `next` —
// เป็นขั้นสุดท้าย (การแก้ไขเสร็จจะกักกัน source IP ฝั่งเซิร์ฟเวอร์โดยอัตโนมัติ)
const STATUS_FLOW = {
  OPEN:          { next: 'INVESTIGATING', label: 'เริ่มตรวจสอบ',    action: 'เปลี่ยนสถานะเป็นกำลังตรวจสอบ' },
  INVESTIGATING: { next: 'MITIGATED',     label: 'ทำเครื่องหมายว่าแก้ไขแล้ว', action: 'แก้ไข/กักกันเหตุการณ์เรียบร้อย' },
};

// ── Donut Chart — วงแหวนแสดงสัดส่วนระดับความรุนแรง ─────────────────────────────────────────────────
function DonutChart({ counts, total }) {
  const R = 60, cx = 80, cy = 80, stroke = 20;
  const C = 2 * Math.PI * R;
  const segments = [
    { key: 'CRITICAL', count: counts.CRITICAL, color: '#f87171' },
    { key: 'HIGH',     count: counts.HIGH,     color: '#fb923c' },
    { key: 'MEDIUM',   count: counts.MEDIUM,   color: '#fbbf24' },
    { key: 'LOW',      count: counts.LOW,      color: '#4ade80' },
    { key: 'INFO',     count: counts.INFO,     color: '#60a5fa' },
  ].filter(s => s.count > 0);

  let offset = 0;
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
      {segments.map((seg) => {
        const dash = (seg.count / total) * C;
        const gap = C - dash;
        const el = (
          <circle key={seg.key} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9.5" fill="var(--text-tertiary)">รวมทั้งหมด</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="9.5" fill="var(--text-tertiary)">เหตุการณ์ทั้งหมด</text>
    </svg>
  );
}

// ── ไอคอนใน Audit Log ──────────────────────────────────────────────────────────
function AuditIcon({ type }) {
  if (type === 'check') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  if (type === 'block') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
  if (type === 'calendar') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
}

// ── Thai Date Picker — ตัวเลือกวันที่ภาษาไทย (ปีพุทธศักราช) ──────────────────────────────────────
const TH_MONTHS       = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']; // ชื่อเดือนเต็ม (index 0–11)
const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];     // ชื่อเดือนย่อ (ใช้ใน month picker)
const TH_DAYS         = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];                                      // ชื่อวันในสัปดาห์ (เริ่มจันทร์)

/**
 * ThaiDatePicker — ตัวเลือกวันที่ภาษาไทย (ปีพุทธศักราช)
 * @param {string} value    - วันที่ที่เลือกอยู่ในรูปแบบ ISO "YYYY-MM-DD" (CE)
 * @param {function} onChange - callback เมื่อเลือกวันใหม่ ส่ง ISO string กลับ
 */
function ThaiDatePicker({ value, onChange }) {
  // pickerView: มุมมองปัจจุบันของ calendar popup — 'day' | 'month' | 'year'
  const [open, setOpen] = React.useState(false);
  const [pickerView, setPickerView] = React.useState('day');

  // view: วันที่ใช้ navigate ภายใน calendar (เดือน/ปีที่กำลังดู ไม่ใช่ที่เลือก)
  const [view, setView] = React.useState(() => value ? new Date(value + 'T00:00:00') : new Date());

  // inputVal: ข้อความใน text input เช่น "19/05/2568"
  const [inputVal, setInputVal] = React.useState(() => {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    return `${dd}/${mm}/${d.getFullYear()+543}`; // แปลงปี CE → พ.ศ. แล้วแสดง
  });
  const ref = React.useRef(null); // ref ของ wrapper ใช้ตรวจจับ click นอก picker

  // ปิด calendar popup เมื่อผู้ใช้คลิกนอก component
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // sync inputVal เมื่อ value เปลี่ยนจากภายนอก (เช่น กด clear)
  React.useEffect(() => {
    if (!value) { setInputVal(''); return; }
    const d = new Date(value + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    setInputVal(`${dd}/${mm}/${d.getFullYear()+543}`);
  }, [value]);

  // คำนวณค่าพื้นฐานสำหรับ render calendar ในเดือนปัจจุบัน
  const year  = view.getFullYear();  // ปี ค.ศ. ของ view
  const month = view.getMonth();     // เดือน (0-11) ของ view
  const bYear = year + 543;          // แปลงเป็น พ.ศ. เพื่อแสดงหัว
  const firstDay    = new Date(year, month, 1).getDay(); // วันที่ 1 ของเดือนตกวันอะไร (0=อาทิตย์)
  const startOffset = (firstDay + 6) % 7;               // offset สำหรับ grid (เริ่มจันทร์)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // จำนวนวันในเดือน
  const selected = value ? new Date(value + 'T00:00:00') : null; // วันที่ที่ถูกเลือกไว้

  // ── helpers ── ฟังก์ชันช่วยภายใน ──

  /**
   * commitDay — ยืนยันการเลือกวัน แล้วปิด calendar
   * @param {number} day - วันที่ที่เลือก (1-31)
   */
  function commitDay(day) {
    const d = new Date(year, month, day);
    const iso = d.toISOString().slice(0,10); // แปลงเป็น ISO string ส่งกลับ
    onChange(iso);
    // อัปเดต text input ให้แสดง วว/ดด/ปปปป (พ.ศ.)
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    setInputVal(`${dd}/${mm}/${d.getFullYear()+543}`);
    setOpen(false);         // ปิด calendar popup
    setPickerView('day');   // reset กลับเป็น day view
  }

  /**
   * parseInput — แปลง text ที่พิมพ์ใน input เป็น Date object
   * รองรับรูปแบบ: วว/ดด/ปปปป หรือ วว-ดด-ปปปป ทั้ง พ.ศ. และ ค.ศ.
   * @returns {Date|null} Date object หรือ null ถ้า format ไม่ถูกต้อง
   */
  function parseInput(raw) {
    const clean = raw.replace(/-/g,'/').trim(); // แทนที่ขีดกลางด้วย /
    const parts  = clean.split('/');
    if (parts.length !== 3) return null; // ต้องมีพอดี 3 ส่วน
    const dd = parseInt(parts[0],10);
    const mm = parseInt(parts[1],10);
    const yy = parseInt(parts[2],10);
    if (isNaN(dd)||isNaN(mm)||isNaN(yy)) return null; // ตัวเลขไม่ถูกต้อง
    // ถ้าปีมากกว่า 2500 ถือว่าเป็น พ.ศ. → ลบ 543 เพื่อแปลงเป็น ค.ศ.
    const ceYear = yy > 2500 ? yy - 543 : yy;
    if (mm < 1||mm > 12||dd < 1||dd > 31||ceYear < 1900||ceYear > 2200) return null; // ค่าเกินขอบเขต
    const date = new Date(ceYear, mm-1, dd);
    if (date.getMonth() !== mm-1) return null; // ตรวจสอบวันล้นเดือน เช่น 31/02
    return date;
  }

  /**
   * handleInputChange — จัดการ input ขณะพิมพ์
   * - กรองตัวอักษรที่ไม่ใช่ตัวเลขหรือ /
   * - ใส่ / อัตโนมัติหลังวันและเดือน
   * - ถ้า parse ได้ จะ call onChange ทันที (live update)
   */
  function handleInputChange(e) {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9/]/g,'');                              // กรองอักขระที่ไม่ใช่ตัวเลขและ /
    if (raw.length === 2 && !raw.includes('/')) raw += '/';        // ใส่ / หลังวันอัตโนมัติ
    if (raw.length === 5 && raw.split('/').length === 2) raw += '/'; // ใส่ / หลังเดือนอัตโนมัติ
    if (raw.length > 10) raw = raw.slice(0,10);                    // จำกัดความยาวสูงสุด 10 ตัว
    setInputVal(raw);
    // ถ้าข้อความที่พิมพ์ parse ได้แล้ว ให้อัปเดต value ทันที
    const d = parseInput(raw);
    if (d) {
      onChange(d.toISOString().slice(0,10));
      setView(d); // เลื่อน calendar ไปแสดงเดือนของวันที่นั้น
    }
  }

  /**
   * handleInputKeyDown — จัดการ keyboard shortcut ใน text input
   * - Enter: ยืนยันวันที่แล้วปิด calendar
   * - Escape: ปิด calendar โดยไม่เปลี่ยนค่า
   */
  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      const d = parseInput(inputVal);
      if (d) { onChange(d.toISOString().slice(0,10)); setView(d); setOpen(false); }
    }
    if (e.key === 'Escape') setOpen(false);
  }

  // ตรวจสอบว่าวันนี้ (today) อยู่ในเดือน/ปีที่กำลังดูอยู่
  const isToday = (day) => {
    const t = new Date();
    return day === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };
  // ตรวจสอบว่าวันนั้นเป็นวันที่ user เลือกไว้
  const isSelected = (day) =>
    selected && day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  // ช่วงปีสำหรับ year picker — แสดง 12 ปีต่อหน้า (grid 3×4)
  const yearRangeStart = Math.floor((year - 543) / 12) * 12;
  const yearsBE = Array.from({length:12},(_,i) => yearRangeStart + i + 543);

  // ── ฟังก์ชัน format ข้อความบนปุ่มเลือกวัน (trigger button) ──
  function formatDisplay(d) {
    if (!d) return 'วันที่…'; // placeholder เมื่อยังไม่ได้เลือก
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()].slice(0,3)}. ${d.getFullYear()+543}`; // เช่น "1 ม.ค. 2568"
  }

  const navBtn = (style={}) => ({
    background:'none', border:'none', cursor:'pointer',
    color:'var(--text-secondary)', padding:'4px 8px',
    borderRadius:6, fontSize:17, lineHeight:1, ...style
  });

  const headerClickable = {
    cursor:'pointer', borderRadius:6, padding:'2px 6px',
    transition:'background .12s',
    ':hover':{ background:'var(--row-head-bg)' },
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* ── trigger button ── */}
      <button
        onClick={() => {
          // sync view to selected date when opening so selected month/year is visible
          if (value) setView(new Date(value + 'T00:00:00'));
          setOpen(o=>!o);
          setPickerView('day');
        }}
        style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 14px', borderRadius:8,
          border:`1.5px solid ${open ? 'var(--accent)' : 'var(--border-soft)'}`,
          background:'var(--row-head-bg)', color: value ? 'var(--text)' : 'var(--text-secondary)',
          cursor:'pointer', fontSize:12.5, fontWeight: value ? 600 : 400,
          whiteSpace:'nowrap', transition:'border-color .15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {value ? formatDisplay(new Date(value + 'T00:00:00')) : 'วันที่…'}
        {value && (
          <span onClick={e=>{ e.stopPropagation(); onChange(''); setInputVal(''); }}
            style={{ marginLeft:4, opacity:.5, lineHeight:1, fontSize:14 }}>✕</span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:200,
          background:'var(--card-bg)', border:'1px solid var(--border-soft)',
          borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.2)',
          padding:16, width:300,
        }}>

          {/* ── manual text input ── */}
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:8,
            background:'var(--row-head-bg)', border:'1px solid var(--border-soft)',
            borderRadius:8, padding:'7px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
              <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
            <input
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              style={{
                border:'none', background:'transparent', outline:'none',
                fontSize:12.5, color:'var(--text)', flex:1,
                fontFamily:'inherit',
              }}
            />
          </div>

          {/* ── DAY VIEW ── */}
          {pickerView === 'day' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button style={navBtn()} onClick={() => setView(new Date(year, month-1, 1))}>‹</button>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={() => setPickerView('month')}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontWeight:700, fontSize:13.5, color:'var(--text)',
                    padding:'2px 8px', borderRadius:6,
                    transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  {TH_MONTHS[month]}
                </button>
                <button onClick={() => setPickerView('year')}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:13.5, color:'var(--text-secondary)',
                    padding:'2px 8px', borderRadius:6,
                    transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  {bYear}
                </button>
              </div>
              <button style={navBtn()} onClick={() => setView(new Date(year, month+1, 1))}>›</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
              {TH_DAYS.map(d=>(
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600,
                  color:'var(--text-tertiary)', padding:'2px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {Array(startOffset).fill(null).map((_,i)=><div key={'e'+i}/>)}
              {Array(daysInMonth).fill(null).map((_,i)=>{
                // sel = isSelected: วันที่ user เลือกจริง — tod = วันนี้ของระบบ (คนละ state)
                const day=i+1; const sel=isSelected(day); const tod=isToday(day);
                return (
                  <button key={day} onClick={()=>commitDay(day)}
                    style={{
                      position:'relative',
                      width:'100%', aspectRatio:'1', borderRadius:8,
                      cursor:'pointer', fontSize:12.5, fontWeight:sel?700:400,
                      transition:'background .12s, border-color .12s',
                      // selected: สีฟ้าจาง — ไม่ผูกกับ isToday เลย
                      border: sel ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                      background: sel ? 'rgba(37,99,235,0.12)' : 'transparent',
                      color: sel ? '#2563EB' : 'var(--text)',
                    }}
                    onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background='var(--row-head-bg)'; }}
                    onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background='transparent'; }}
                  >
                    {day}
                    {/* วันนี้: dot เล็กๆ เท่านั้น ห้าม background เด็ดขาด */}
                    {tod && !sel && (
                      <span style={{
                        position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                        width:3, height:3, borderRadius:'50%',
                        background:'var(--text-tertiary)', display:'block',
                      }}/>
                    )}
                  </button>
                );
              })}
            </div>
          </>)}

          {/* ── MONTH VIEW ── */}
          {pickerView === 'month' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={navBtn()} onClick={()=>setView(new Date(year-1,month,1))}>‹</button>
              <button onClick={()=>setPickerView('year')}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontWeight:700, fontSize:13.5, color:'var(--text)',
                  padding:'2px 8px', borderRadius:6 }}
              >{bYear}</button>
              <button style={navBtn()} onClick={()=>setView(new Date(year+1,month,1))}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {TH_MONTHS_SHORT.map((m,i)=>{
                // isSelectedM: เดือนที่ user เลือกจริงๆ — เปรียบกับ selected (จาก prop value) เท่านั้น
                // ต้องเช็คทั้ง month และ year ของ selected กับปีที่กำลัง view อยู่
                const isSelectedM = selected
                  && selected.getMonth() === i
                  && selected.getFullYear() === year;
                // ห้ามใช้ isViewM เป็น selected state — แค่ใช้สำหรับ subtle outline เพื่อบอกว่า view ชี้อยู่ที่ไหน
                const isViewM = i === month && !isSelectedM;
                return (
                  <button key={i}
                    onClick={()=>{
                      // เมื่อกดเดือน: navigate view ไปที่เดือนนั้น แล้วกลับไป day view
                      // การ commit วันที่จริงยังต้องทำใน day view
                      setView(new Date(year, i, 1));
                      setPickerView('day');
                    }}
                    style={{
                      padding:'8px 2px', borderRadius:8, cursor:'pointer', textAlign:'center',
                      // selected: พื้นหลังฟ้าเข้มแบบจาง + border ฟ้า
                      border: isSelectedM
                        ? '1px solid rgba(37,99,235,0.25)'
                        : '1px solid transparent',
                      background: isSelectedM
                        ? 'rgba(37,99,235,0.12)'
                        : 'transparent',
                      color: isSelectedM ? '#2563EB' : 'var(--text)',
                      fontWeight: isSelectedM ? 700 : 500,
                      fontSize:12.5,
                      transition:'background .12s, border-color .12s, color .12s',
                    }}
                    onMouseEnter={e=>{
                      if (!isSelectedM) {
                        e.currentTarget.style.background = 'var(--row-head-bg)';
                        e.currentTarget.style.borderColor = 'var(--border-soft)';
                      }
                    }}
                    onMouseLeave={e=>{
                      if (!isSelectedM) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >{m}</button>
                );
              })}
            </div>
          </>)}

          {/* ── YEAR VIEW ── */}
          {pickerView === 'year' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={navBtn()} onClick={()=>setView(new Date(year-12,month,1))}>‹</button>
              <span style={{ fontWeight:700, fontSize:13.5, color:'var(--text)' }}>
                {yearsBE[0]}–{yearsBE[yearsBE.length-1]}
              </span>
              <button style={navBtn()} onClick={()=>setView(new Date(year+12,month,1))}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {yearsBE.map(by=>{
                // isViewY: ปีที่ view กำลัง navigate อยู่
                const isViewY = (by - 543) === year;
                // isSelectedY: ปีของวันที่ที่ user เลือกจริงๆ (จาก prop value)
                const isSelectedY = selected && (by - 543) === selected.getFullYear();
                return (
                  <button key={by} onClick={()=>{ setView(new Date(by-543,month,1)); setPickerView('month'); }}
                    style={{
                      padding:'10px 4px', borderRadius:8, cursor:'pointer', fontSize:12.5,
                      transition:'background .12s',
                      // ปีที่ selected ใช้สีฟ้าเข้มแบบจาง; ปี view ปัจจุบัน outline เบาๆ; อื่นๆ transparent
                      border: isSelectedY
                        ? '1px solid rgba(37,99,235,0.25)'
                        : isViewY
                          ? '1px solid var(--border-soft)'
                          : '1px solid transparent',
                      background: isSelectedY ? 'rgba(37,99,235,0.12)' : 'transparent',
                      color: isSelectedY ? '#2563EB' : 'var(--text)',
                      fontWeight: isSelectedY ? 700 : isViewY ? 600 : 500,
                    }}
                    onMouseEnter={e=>{
                      if (!isSelectedY) e.currentTarget.style.background = 'var(--row-head-bg)';
                    }}
                    onMouseLeave={e=>{
                      if (!isSelectedY) e.currentTarget.style.background = 'transparent';
                    }}
                  >{by}</button>
                );
              })}
            </div>
          </>)}

        </div>
      )}
    </div>
  );
}

// ── ฟังก์ชันช่วย (Helpers) ─────────────────────────────────────────────────────
/**
 * timeAgo — แปลง timestamp เป็นข้อความ relative ภาษาไทย
 * ตัวอย่าง: "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว", "1 วันที่แล้ว"
 * @param {string} ts - ISO timestamp string
 * @returns {string} ข้อความเวลาแบบ relative ภาษาไทย
 */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000); // diff = จำนวนนาทีที่ผ่านมา
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 1440)} วันที่แล้ว`;
}

/**
 * formatTH — แปลง timestamp เป็นข้อความภาษาไทย (th-TH locale)
 * แสดง: "19 พ.ค. 2568 14:32:11" (24 ชม. ไม่ใช้ AM/PM)
 * @param {string} ts - ISO timestamp string
 * @returns {string} เวลาไทย หรือ ts เดิมถ้าแปลงไม่ได้
 */
function formatTH(ts) {
  try {
    return new Date(ts).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ts; }
}

// ── Component หลัก (Incidents) ────────────────────────────────────────────────────
export default function Incidents() {
  const { t, isGeneralView, conn } = useApp();
  const liveEnabled = conn.status !== CONN_STATUS.DISCONNECTED; // ปุ่มซิงค์ disabled ถ้าไม่เชื่อมต่อ

  // incidents: รายการทั้งหมด — เริ่มจาก MOCK แล้วเขียนทับด้วยข้อมูลจาก API
  const [incidents,      setIncidents]      = useState(MOCK_INCIDENTS);
  const [loading,        setLoading]        = useState(false);

  // selectedEvent: event ที่คลิกเปิด ThreatInspectModal (null = ไม่มี modal เปิดอยู่)
  const [selectedEvent,  setSelectedEvent]  = useState(null);

  // ── Filter & Pagination State ──
  const [filterStatus,   setFilterStatus]   = useState('ALL');       // กรองตามสถานะ Triage
  const [statusMap,      setStatusMap]      = useState({});          // { id: 'OPEN'|'INVESTIGATING'|'MITIGATED' }
  const [auditLogs,      setAuditLogs]      = useState(MOCK_AUDIT);  // บันทึกการดำเนินการ
  const [severityFilter, setSeverityFilter] = useState('ALL');       // กรองระดับความรุนแรง
  const [typeFilter,     setTypeFilter]     = useState('ALL');       // กรองประเภทการโจมตี
  const [dateFilter,     setDateFilter]     = useState('');          // ISO prefix filter ('YYYY-MM-DD')
  const [page,           setPage]           = useState(1);           // หน้าปัจจุบัน
  const [updatingId,     setUpdatingId]     = useState(null);        // ID ที่กำลัง update (loading)

  const PAGE_SIZE = 10; // ❗ เปลี่ยนตรงนี้เพื่อปรับจำนวนรายการต่อหน้า

  useEffect(() => {
    fetchAlerts();
    fetchStatuses();
    fetchAuditLogs();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/logs?limit=200&alerts_only=true');
      const data = await res.json();
      if (data.ok && data.data.length > 0) setIncidents(data.data);
    } catch { /* keep mock */ }
    finally { setLoading(false); }
  }

  async function fetchStatuses() {
    try {
      const res = await fetch('/api/incidents/statuses');
      const data = await res.json();
      if (data.ok) setStatusMap(data.data);
    } catch { }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/audit-log?limit=50');
      const data = await res.json();
      if (data.ok && data.data.length > 0) setAuditLogs(data.data);
    } catch { }
  }

  /**
   * updateIncidentStatus — อัปเดต triage status ของ event ผ่าน API PATCH /api/incidents/:id
   * Flow: OPEN → INVESTIGATING → MITIGATED (เมื่อ MITIGATED: block IP และเล่นเสียง success)
   * General User ไม่สามารถทำได้ (isGeneralView guard)
   * @param {number} eventId    - ID ของ event
   * @param {string} sourceIp   - Source IP สำหรับ block เมื่อ MITIGATED
   * @param {string} newStatus  - สถานะใหม่ ('INVESTIGATING' | 'MITIGATED')
   * @param {string} actionName - ชื่อการดำเนินการ สำหรับบันทึกใน audit log
   */
  async function updateIncidentStatus(eventId, sourceIp, newStatus, actionName) {
    if (isGeneralView) return; // guard: ห้าม General User
    playSound('click');
    setUpdatingId(eventId); // แสดง loading indicator บนปุ่มของ event นั้น
    try {
      const res = await fetch(`/api/incidents/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, source_ip: sourceIp, action_name: actionName }),
      });
      const data = await res.json();
      if (!data.ok) return;
      setStatusMap((prev) => ({ ...prev, [eventId]: newStatus })); // อัปเดต local state ทันที
      if (newStatus === 'MITIGATED') playSound('success');          // เปิดเสียงเมื่อ block สำเร็จ
      fetchAuditLogs();  // reload audit log เพื่อเห็นบันทึกใหม่
    } catch { }
    finally { setUpdatingId(null); } // ซ่อน loading indicator
  }

  /**
   * getStatus — ดึง triage status ของ event จาก statusMap (API)
   * fallback: item.status (field ใน data) → 'OPEN' (ค่า default)
   */
  function getStatus(item) {
    return statusMap[item.id] || item.status || 'OPEN';
  }

  /**
   * getSev — ดึง Severity key ของ event
   * - ถ้ามี sevKey ใน data (จาก MOCK) ใช้อันนั้นเลย
   * - ถ้าไม่มี คำนวณจาก confidence (threshold เดียวกับ Dashboard)
   */
  function getSev(item) {
    return item.sevKey || (item.confidence >= 0.95 ? 'CRITICAL' : item.confidence >= 0.9 ? 'HIGH' : item.confidence >= 0.8 ? 'MEDIUM' : 'LOW');
  }

  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  incidents.forEach(item => { const k = getSev(item); if (sevCounts[k] !== undefined) sevCounts[k]++; });
  const total = incidents.length || 50;
  const openCount = incidents.filter(i => getStatus(i) === 'OPEN').length || 8;
  const invCount = incidents.filter(i => getStatus(i) === 'INVESTIGATING').length || 15;
  const mitCount = incidents.filter(i => getStatus(i) === 'MITIGATED').length || 27;

  const filterTabs = ['ทั้งหมด', 'เปิดอยู่', 'กำลังตรวจสอบ', 'แก้ไขแล้ว'];
  const filterKeys = ['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED'];

  const ATTACK_TYPES = [...new Set(incidents.map(i => i.attack_class))].sort();

  const filtered = incidents.filter(item => {
    const stMatch = filterStatus === 'ALL' || getStatus(item) === filterStatus;
    const sevMatch = severityFilter === 'ALL' || getSev(item) === severityFilter;
    const typeMatch = typeFilter === 'ALL' || item.attack_class === typeFilter;
    const dateMatch = !dateFilter || item.timestamp.startsWith(dateFilter);
    return stMatch && sevMatch && typeMatch && dateMatch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── ส่วนหัวหน้า ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>ศูนย์เหตุการณ์และการดำเนินการ</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 4, fontSize: 13.5 }}>จัดลำดับความสำคัญ ยืนยันการแจ้งเตือน ติดตามการเชื่อมต่อเครือข่าย และบันทึกการดำเนินการ</p>
        </div>
        {/* ซิงค์แจ้งเตือน: User เห็นแต่ disabled + tooltip; ต้องเปิดเชื่อมต่อสดด้วยเพราะพึ่งข้อมูลสด */}
        <button
          className="btn btn-outline"
          onClick={() => { if (!isGeneralView && liveEnabled) { playSound('click'); fetchAlerts(); } }}
          disabled={isGeneralView || !liveEnabled}
          title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : !liveEnabled ? 'ขาดการเชื่อมต่ออยู่ — เชื่อมต่อสดก่อนจึงจะซิงค์ได้' : undefined}
          style={{ opacity: (isGeneralView || !liveEnabled) ? 0.45 : 1, cursor: (isGeneralView || !liveEnabled) ? 'not-allowed' : 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ marginLeft: 8 }}>ซิงค์ตัวแจ้งเตือน</span>
        </button>
      </div>

      {/* ── การ์ดสถิติ 3 ใบด้านบน ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#f87171', lineHeight: 1.1 }}>{openCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>แจ้งเตือนวิกฤตที่เปิดอยู่</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>ต้องดำเนินการทันที</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </div>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fbbf24', lineHeight: 1.1 }}>{invCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>อยู่ระหว่างตรวจสอบ</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>รอการวิเคราะห์เพิ่มเติม</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(234,179,8,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>{mitCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>แก้ไข/กักกันแล้ว</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>ใน 24 ชั่วโมงที่ผ่านมา</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
          </div>
        </div>
      </div>

      {/* ── ส่วนกลาง: Donut Chart + Audit Log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* การ์ด Donut Chart */}
        <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ fontSize: 14.5 }}>ภัยคุกคามตามระดับความรุนแรง</div>
            <div className="text-muted" style={{ fontSize: 11.5 }}>คัดกรองเหตุการณ์ที่ต้องดำเนินการ แยกตามระดับความรุนแรง</div>
          </div>

          {/* ปุ่มเลือก Filter สถานะ */}
          <div style={{ display: 'flex', gap: 8 }}>
            {filterTabs.map((tab, i) => (
              <button key={tab} onClick={() => { setFilterStatus(filterKeys[i]); setPage(1); }}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  background: filterStatus === filterKeys[i] ? 'var(--accent)' : 'var(--gray-chip-bg)',
                  color: filterStatus === filterKeys[i] ? '#fff' : 'var(--text-secondary)',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Donut Chart + คำอธิบายสี */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DonutChart counts={sevCounts} total={total} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {Object.entries(SEV_CONFIG).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: v.color, display: 'inline-block' }} />
                    {v.label}
                  </span>
                  <span style={{ fontWeight: 700 }}>{sevCounts[k]} <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>({((sevCounts[k]/total)*100).toFixed(0)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* การ์ด Audit Log */}
        <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ fontSize: 14.5 }}>บันทึกการดำเนินการของผู้ปฏิบัติงาน</div>
            <a href="#" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>ดูทั้งหมด</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {auditLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: log.bg || 'var(--row-head-bg)', color: log.color || 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AuditIcon type={log.icon} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{log.action}</div>
                  <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>โดย {log.username}</div>
                </div>
                <div className="text-muted" style={{ fontSize: 11, flexShrink: 0, marginTop: 2 }}>{timeAgo(log.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ตารางรายการเหตุการณ์ ── */}
      <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ส่วนควบคุมด้านบนของตาราง */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-title" style={{ fontSize: 14.5, margin: 0 }}>รายการเหตุการณ์ล่าสุด</div>
            <span style={{ background: 'var(--gray-chip-bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{filtered.length} รายการ</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <ThaiDatePicker value={dateFilter} onChange={v => { setDateFilter(v); setPage(1); }} />
            <select style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="ALL">ทุกประเภท</option>
              {ATTACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--row-head-bg)', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input placeholder="ค้นหา IP, เหตุการณ์, Sig..." style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', fontSize: 12, width: 170 }} />
            </div>
            <button style={{ background: 'var(--row-head-bg)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          </div>
        </div>

        {/* เนื้อหาตาราง */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                {['เวลา','ระดับความรุนแรง','ประเภทเหตุการณ์','รายละเอียด','แหล่งที่มา','เป้าหมาย','สถานะ','การดำเนินการ'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {h}{h === 'การดำเนินการ' ? ' ' : ''}{h === 'การดำเนินการ' && <InfoHelp id="incActions" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, i) => {
                const st = getStatus(item);
                const sevKey = getSev(item);
                const sev = SEV_CONFIG[sevKey] || SEV_CONFIG.LOW;
                const statusCfg = STATUS_CONFIG[st] || STATUS_CONFIG.OPEN;
                return (
                  <tr key={item.id}
                    style={{ borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { playSound('click'); setSelectedEvent(item); }}>
                    <td style={{ padding: '14px 14px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatTH(item.timestamp).split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 1, color: 'var(--text)' }}>{formatTH(item.timestamp).split(' ')[2]}</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{timeAgo(item.timestamp)}</div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span style={{ background: sev.bg, color: sev.color, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{sev.label}</span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13 }}>{item.attack_class}</td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'top', maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.description}</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{item.detail}</div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{item.source_flag || '🌐'}</span>
                        <span className="mono" style={{ fontSize: 12.5 }}>{item.source_ip}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span className="mono" style={{ fontSize: 12.5 }}>{item.target}</span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, background: statusCfg.dotBg, padding: '5px 10px', borderRadius: 999, width: 'fit-content' }}>
                        {statusCfg.check
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusCfg.dot} strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          : <span style={{ width: 8, height: 8, borderRadius: 999, background: statusCfg.dot, display: 'inline-block' }} />
                        }
                        <span style={{ color: statusCfg.dot }}>{statusCfg.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      {/* ผู้ใช้ทั่วไปเห็นปุ่มแต่ถูกปิดการใช้งาน (disabled); Admin ทำงานได้ปกติ */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {STATUS_FLOW[st] && (
                          <button
                            style={{
                              fontSize: 12, padding: '6px 14px', borderRadius: 8,
                              border: '1px solid var(--border-soft)',
                              background: st === 'OPEN' ? 'rgba(234,179,8,.12)' : 'rgba(34,197,94,.12)',
                              color: isGeneralView ? 'var(--text-tertiary)' : (st === 'OPEN' ? '#fbbf24' : '#4ade80'),
                              cursor: (isGeneralView || updatingId === item.id) ? 'not-allowed' : 'pointer',
                              opacity: (isGeneralView || updatingId === item.id) ? 0.5 : 1,
                              fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                            disabled={isGeneralView || updatingId === item.id}
                            title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
                            onClick={() => updateIncidentStatus(item.id, item.source_ip, STATUS_FLOW[st].next, STATUS_FLOW[st].action)}
                          >
                            {updatingId === item.id ? '...' : STATUS_FLOW[st].label}
                          </button>
                        )}
                        <button
                          style={{
                            fontSize: 12, padding: '6px 14px', borderRadius: 8,
                            border: '1px solid var(--border-soft)',
                            background: 'var(--row-head-bg)',
                            color: isGeneralView ? 'var(--text-tertiary)' : 'var(--text)',
                            cursor: isGeneralView ? 'not-allowed' : 'pointer',
                            opacity: isGeneralView ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                          disabled={isGeneralView}
                          title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
                          onClick={isGeneralView ? undefined : () => { playSound('click'); setSelectedEvent(item); }}
                        >
                          รายละเอียด
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* การเลื่อนหน้า (Pagination) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .4 : 1, color: 'var(--text)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: page === n ? 'var(--accent)' : 'transparent', color: page === n ? '#fff' : 'var(--text)' }}>
              {n}
            </button>
          ))}
          {totalPages > 10 && <span style={{ color: 'var(--text-tertiary)' }}>...</span>}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .4 : 1, color: 'var(--text)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

```

---

<a id="srcpageslogsjsx"></a>

## [src/pages/Logs.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Logs.jsx)

**Path:** `src/pages/Logs.jsx` | **Lines:** 654 | **Size:** 47.0 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Logs.jsx — หน้าดูเอกสารเหตุการณ์ทั้งหมด (Security Event Logs)
//
// ประกอบด้วย:
//   - ตาราง log พร้อม filter (attack type, severity, status, model, date range) + search
//   - คลิกแถวเปิด ThreatInspectModal เพื่อดูรายละเอียด
//   - Pagination แบบ 10 รายการต่อหน้า
//   - Export CSV: ส่งออก log เป็นไฟล์ CSV สำหรับการวิเคราะห์ต่อ
//   - ดึงข้อมูลจาก API (/api/logs) ใช้ MOCK_LOGS เป็น fallback
//   - เพิ่มเข้า Incidents เมื่อกด "Triage Event" บน alert row
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import ThreatInspectModal from '../components/ThreatInspectModal'
import InfoHelp from '../components/InfoHelp'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

// ── Mock Data: ข้อมูลตัวอย่างสำรอง ──────────────────────────────────────────
// แสดงเมื่อ API /api/logs ยังไม่มี data หรือเชื่อมต่อไม่ได้
// แต่ละ object = 1 security event
// ⚡ แก้ข้อมูลที่นี่ → เห็นผลทันทีในตาราง Log
const MOCK_LOGS = [
  { id: 1042, timestamp: '2025-05-26T09:41:07', ref: 'EVT-2025-1042', attack_class: 'SQL Injection', source_ip: '192.168.1.45', target: 'srv-db-01', severity: 'วิกฤต', sevKey: 'CRITICAL', status: 'บล็อกแล้ว', statusKey: 'BLOCKED', model_name: 'Injection LSTM', confidence: 0.97, is_alert: true },
  { id: 1041, timestamp: '2025-05-25T22:18:53', ref: 'EVT-2025-1041', attack_class: 'Brute Force',   source_ip: '45.33.22.11',  target: 'srv-web-02', severity: 'สูง',   sevKey: 'HIGH',     status: 'กำลังตรวจสอบ', statusKey: 'INVESTIGATING', model_name: 'Intrusion LSTM', confidence: 0.91, is_alert: true },
  { id: 1040, timestamp: '2025-05-25T18:02:31', ref: 'EVT-2025-1040', attack_class: 'Port Scan',     source_ip: '112.54.33.2',  target: 'dmz-fw-01',  severity: 'ปานกลาง', sevKey: 'MEDIUM', status: 'บล็อกแล้ว',       statusKey: 'BLOCKED',       model_name: 'Intrusion LSTM', confidence: 0.83, is_alert: true },
  { id: 1039, timestamp: '2025-05-24T11:47:19', ref: 'EVT-2025-1039', attack_class: 'DDoS',          source_ip: '203.0.113.9',  target: 'lb-edge-01', severity: 'วิกฤต', sevKey: 'CRITICAL', status: 'แก้ไขแล้ว',    statusKey: 'MITIGATED',    model_name: 'Flow LSTM',      confidence: 0.96, is_alert: true },
  { id: 1038, timestamp: '2025-05-23T08:15:02', ref: 'EVT-2025-1038', attack_class: 'Suspicious Activity', source_ip: '198.51.100.4', target: 'srv-auth-01', severity: 'ปานกลาง', sevKey: 'MEDIUM', status: 'แก้ไขแล้ว', statusKey: 'MITIGATED', model_name: 'Intrusion LSTM', confidence: 0.79, is_alert: false },
  { id: 1037, timestamp: '2025-05-22T20:33:44', ref: 'EVT-2025-1037', attack_class: 'Brute Force',   source_ip: '77.68.45.12',  target: 'srv-web-01', severity: 'สูง',   sevKey: 'HIGH',     status: 'บล็อกแล้ว',    statusKey: 'BLOCKED',       model_name: 'Intrusion LSTM', confidence: 0.92, is_alert: true },
]

// ── สี badge ของระดับความรุนแรง (Severity) ──────────────────────────────────
// ⚡ แก้สีที่นี่ → badge ในตาราง Log เปลี่ยนทันที
// bg = สีพื้นหลัง badge (rgba), color = สีตัวอักษร
const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต',    bg: 'rgba(239,68,68,.15)',  color: '#f87171' }, // แดง
  HIGH:     { label: 'สูง',      bg: 'rgba(249,115,22,.15)', color: '#fb923c' }, // ส้ม
  MEDIUM:   { label: 'ปานกลาง', bg: 'rgba(234,179,8,.15)',  color: '#fbbf24' }, // เหลือง
  LOW:      { label: 'ต่ำ',      bg: 'rgba(34,197,94,.12)',  color: '#4ade80' }, // เขียว
}

// ── สี badge ของสถานะ (Status) ───────────────────────────────────────────────
// ⚡ แก้ label ภาษาไทยที่นี่ → เห็นผลทันทีในตาราง
const STATUS_CONFIG = {
  BLOCKED:       { label: 'บล็อกแล้ว',    bg: 'rgba(239,68,68,.08)',  color: '#f87171' }, // แดง
  INVESTIGATING: { label: 'กำลังตรวจสอบ', bg: 'rgba(251,191,36,.1)',  color: '#fbbf24' }, // เหลือง
  MITIGATED:     { label: 'แก้ไขแล้ว',    bg: 'rgba(74,222,128,.1)',  color: '#4ade80' }, // เขียว
  OPEN:          { label: 'เปิดอยู่',      bg: 'rgba(239,68,68,.1)',   color: '#f87171' }, // แดง
}

// ── สี badge ของประเภทการโจมตี (Attack Type) ─────────────────────────────────
// ⚡ เพิ่ม attack type ใหม่ที่นี่ → badge จะมีสีแทนสี default
const ATTACK_PILL = {
  'SQL Injection':       { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
  'Brute Force':         { bg: 'rgba(249,115,22,.15)',  color: '#fb923c' }, // ส้ม
  'DDoS':                { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
  'Port Scan':           { bg: 'rgba(234,179,8,.15)',   color: '#fbbf24' }, // เหลือง
  'Suspicious Activity': { bg: 'rgba(148,163,184,.12)', color: '#94a3b8' }, // เทา
  'R2L':                 { bg: 'rgba(234,179,8,.15)',   color: '#fbbf24' }, // เหลือง
  'U2R':                 { bg: 'rgba(249,115,22,.15)',  color: '#fb923c' }, // ส้ม
  'DoS':                 { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
}

// ── Thai Date Picker (Date Range) ───────────────────────────────────────
const TH_MONTHS_L = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_S = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_DOW = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];

/**
 * ThaiDP — Thai Date Picker (compact version สำหรับ Logs.jsx)
 * คล้ายกับ ThaiDatePicker ใน Incidents.jsx แต่ compact กว่า เพราะใช้ใน filter date range
 * @param {string} value     - ISO string 'YYYY-MM-DD' (วันที่เลือก)
 * @param {function} onChange - callback ส่ง ISO string กลับ
 * @param {string} placeholder - ข้อความในปุ่มเมื่อยังไม่มีค่า
 * @param {string} [minDate]   - ISO string เพื่อจำกัดวันที่เริ่มต้น (disabled วันที่ก่อนนั้น)
 */
function ThaiDP({ value, onChange, placeholder = 'วันที่…', minDate }) {
  const [open, setOpen] = React.useState(false);
  const [pv, setPv] = React.useState('day'); // 'day'|'month'|'year'
  const [view, setView] = React.useState(() => value ? new Date(value + 'T00:00:00') : new Date());
  const [input, setInput] = React.useState(() => {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`;
  });
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  React.useEffect(() => {
    if (!value) { setInput(''); return; }
    const d = new Date(value + 'T00:00:00');
    setInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`);
  }, [value]);

  const yr = view.getFullYear(), mo = view.getMonth(), byr = yr + 543;
  const startOff = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const dim = new Date(yr, mo + 1, 0).getDate();
  const sel = value ? new Date(value + 'T00:00:00') : null;
  const isSel = (d) => sel && d === sel.getDate() && mo === sel.getMonth() && yr === sel.getFullYear();
  const isMin = (d) => { if (!minDate) return false; return new Date(yr, mo, d) < new Date(minDate + 'T00:00:00'); };
  const isToday2 = (d) => { const t = new Date(); return d===t.getDate()&&mo===t.getMonth()&&yr===t.getFullYear(); };
  const yrStart = Math.floor((yr-543)/12)*12;
  const yrs = Array.from({length:12},(_,i)=>yrStart+i+543);

  function commit(day) {
    const d = new Date(yr, mo, day);
    if (minDate && d < new Date(minDate + 'T00:00:00')) return;
    onChange(d.toISOString().slice(0,10));
    setInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`);
    setOpen(false); setPv('day');
  }
  function parseIn(raw) {
    const p = raw.replace(/-/g,'/').trim().split('/');
    if (p.length!==3) return null;
    const [dd,mm,yy] = p.map(Number);
    if ([dd,mm,yy].some(isNaN)) return null;
    const cy = yy>2500?yy-543:yy;
    if (mm<1||mm>12||dd<1||dd>31||cy<1900||cy>2200) return null;
    const d = new Date(cy,mm-1,dd);
    return d.getMonth()===mm-1?d:null;
  }
  function onInputChange(e) {
    let r = e.target.value.replace(/[^0-9/]/g,'');
    if (r.length===2&&!r.includes('/')) r+='/';
    if (r.length===5&&r.split('/').length===2) r+='/';
    if (r.length>10) r=r.slice(0,10);
    setInput(r);
    const d = parseIn(r);
    if (d) { onChange(d.toISOString().slice(0,10)); setView(d); }
  }
  function onKD(e) {
    if (e.key==='Enter') { const d=parseIn(input); if(d){onChange(d.toISOString().slice(0,10));setView(d);setOpen(false);} }
    if (e.key==='Escape') setOpen(false);
  }
  const nb = { background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',padding:'3px 7px',borderRadius:6,fontSize:17,lineHeight:1 };
  const hb = (cur) => ({ background:'none',border:'none',cursor:'pointer',fontWeight:700,fontSize:13,color:'var(--text)',padding:'2px 8px',borderRadius:6,transition:'background .12s' });

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <button onClick={()=>{
        // sync view → selected date on open so highlight is always visible
        if (value) setView(new Date(value + 'T00:00:00'));
        setOpen(o=>!o); setPv('day');
      }}
        style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,width:'100%',
          border:`1.5px solid ${open?'var(--accent)':'var(--border-soft)'}`,
          background:'var(--row-head-bg)',color:value?'var(--text)':'var(--text-secondary)',
          cursor:'pointer',fontSize:13,fontWeight:value?600:400,transition:'border-color .15s',textAlign:'left'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{flex:1}}>{value ? input : placeholder}</span>
        {value && <span onClick={e=>{e.stopPropagation();onChange('');setInput('');}} style={{opacity:.5,fontSize:14}}>✕</span>}
      </button>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:300,
          background:'var(--card-bg)',border:'1px solid var(--border-soft)',
          borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.2)',padding:14,minWidth:276}}>
          {/* text input */}
          <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8,
            background:'var(--row-head-bg)',border:'1px solid var(--border-soft)',
            borderRadius:7,padding:'6px 10px'}}>
            <input value={input} onChange={onInputChange} onKeyDown={onKD}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              style={{border:'none',background:'transparent',outline:'none',fontSize:12.5,color:'var(--text)',flex:1,fontFamily:'inherit'}} />
          </div>
          {pv==='day'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <button style={nb} onClick={()=>setView(new Date(yr,mo-1,1))}>&#8249;</button>
              <div style={{display:'flex',gap:4}}>
                <button style={hb()} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('month')}>{TH_MONTHS_L[mo]}</button>
                <button style={{...hb(),color:'var(--text-secondary)',fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('year')}>{byr}</button>
              </div>
              <button style={nb} onClick={()=>setView(new Date(yr,mo+1,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
              {TH_DOW.map(d=><div key={d} style={{textAlign:'center',fontSize:9.5,fontWeight:600,color:'var(--text-tertiary)',padding:'1px 0'}}>{d}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
              {Array(startOff).fill(null).map((_,i)=><div key={'e'+i}/>)}
              {Array(dim).fill(null).map((_,i)=>{
                // s = isSelected: วันที่ user เลือกจริงๆ จาก prop value เท่านั้น
                // t = isToday: วันนี้ของระบบ — เป็นคนละ state กับ s อย่างเด็ดขาด
                const day=i+1, s=isSel(day), t=isToday2(day), dis=isMin(day);
                return <button key={day} onClick={()=>commit(day)} disabled={dis}
                  style={{
                    position:'relative',
                    width:'100%', aspectRatio:'1', borderRadius:7, cursor:dis?'not-allowed':'pointer',
                    fontSize:12, fontWeight:s?700:400, opacity:dis?.3:1,
                    transition:'background .12s, border-color .12s',
                    // selected: สีฟ้าจาง — ไม่มีส่วนเกี่ยวกับ isToday เลย
                    border: s ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    background: s ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: s ? '#2563EB' : 'var(--text)',
                  }}
                  onMouseEnter={e=>{if(!s&&!dis)e.currentTarget.style.background='var(--row-head-bg)';}}
                  onMouseLeave={e=>{if(!s&&!dis)e.currentTarget.style.background='transparent';}}
                >
                  {day}
                  {/* วันนี้: แสดงเพียง dot เล็ก ๆ ข้างล่าง — ไม่ใช้ background เด็ดขาด */}
                  {t && !s && (
                    <span style={{
                      position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                      width:3, height:3, borderRadius:'50%',
                      background:'var(--text-tertiary)', display:'block',
                    }}/>
                  )}
                </button>;
              })}
            </div>
          </>)}
          {pv==='month'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button style={nb} onClick={()=>setView(new Date(yr-1,mo,1))}>&#8249;</button>
              <button style={hb()} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('year')}>{byr}</button>
              <button style={nb} onClick={()=>setView(new Date(yr+1,mo,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
              {TH_MONTHS_S.map((m,i)=>{
                // isSelM: เดือนที่ user เลือกจริงๆ จาก prop value เท่านั้น
                // ต้องเช็คทั้ง month index และ year กับ view ปัจจุบัน
                const isSelM = sel && sel.getMonth()===i && sel.getFullYear()===yr;
                // ห้ามใช้ mo (viewMonth) เป็น selected state
                return <button key={i}
                  onClick={()=>{setView(new Date(yr,i,1));setPv('day');}}
                  style={{
                    padding:'9px 4px',borderRadius:7,cursor:'pointer',
                    fontSize:12.5,fontWeight:isSelM?700:500,
                    transition:'background .12s,border-color .12s,color .12s',
                    border: isSelM ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    background: isSelM ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: isSelM ? '#2563EB' : 'var(--text)',
                  }}
                  onMouseEnter={e=>{
                    if(!isSelM){e.currentTarget.style.background='var(--row-head-bg)';e.currentTarget.style.borderColor='var(--border-soft)';}
                  }}
                  onMouseLeave={e=>{
                    if(!isSelM){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}
                  }}>{m}</button>;
              })}
            </div>
          </>)}
          {pv==='year'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button style={nb} onClick={()=>setView(new Date(yr-12,mo,1))}>&#8249;</button>
              <span style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{yrs[0]}–{yrs[yrs.length-1]}</span>
              <button style={nb} onClick={()=>setView(new Date(yr+12,mo,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
              {yrs.map(by=>{
                // isViewY: ปีที่ view กำลัง navigate อยู่ (subtle outline เพื่อ UX)
                const isViewY = (by-543)===yr;
                // isSelY: ปีของวันที่ที่ user เลือกจริงๆ จาก prop value
                const isSelY = sel && (by-543)===sel.getFullYear();
                return <button key={by} onClick={()=>{setView(new Date(by-543,mo,1));setPv('month');}}
                  style={{
                    padding:'9px 4px',borderRadius:7,cursor:'pointer',
                    fontSize:12.5,transition:'background .12s',
                    border: isSelY
                      ? '1px solid rgba(37,99,235,0.20)'
                      : isViewY ? '1px solid var(--border-soft)' : '1px solid transparent',
                    background: isSelY ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: isSelY ? '#2563EB' : 'var(--text)',
                    fontWeight: isSelY ? 700 : isViewY ? 600 : 500,
                  }}
                  onMouseEnter={e=>{if(!isSelY)e.currentTarget.style.background='var(--row-head-bg)';}}
                  onMouseLeave={e=>{if(!isSelY)e.currentTarget.style.background='transparent';}}>{by}</button>;
              })}
            </div>
          </>)}
        </div>
      )}
    </div>
  );
}

/**
 * formatTH — แปลง timestamp เป็นข้อความภาษาไทย (th-TH)
 * แสดงวัน/เดือน/ปี เวลาแบบ 24 ชม. (ไม่ใช้ AM/PM)
 * @param {string} ts - ISO timestamp string
 * @returns {string} ข้อความวันที่ภาษาไทย เช่น "19 พ.ค. 2568 14:32:11"
 */
function formatTH(ts) {
  try { return new Date(ts).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
  catch { return ts }
}

/**
 * Logs — หน้าดู Security Event Logs ทั้งหมด (Search, Filter, Paginate, Export)
 */
export default function Logs() {
  const { t } = useApp()
  const navigate = useNavigate()

  // สมมติเริ่มต้นจาก MOCK_LOGS — ใน production ให้ดึงจาก API /api/logs แทน
  const [logs] = useState(MOCK_LOGS)
  const [loading] = useState(false)    // ใช้แสดง spinner เมื่อดึงข้อมูลจาก API

  // ── Pagination ──
  const [page, setPage] = useState(1) // หน้าปัจจุบัน (เริ่มที่ 1)

  // ── Modal ──
  const [selectedEvent, setSelectedEvent] = useState(null) // event ที่คลิกเปิด ThreatInspectModal

  // ── Filter State — ตัวกรองทั้งหมดใช้ตรวจ logic ใน filtered array ───────────────
  const [searchQuery,    setSearchQuery]    = useState('')  // ค้นหา: source_ip, attack_class, model, ref
  const [modelFilter,    setModelFilter]    = useState('')  // โมเดล (Intrusion/Flow/Injection LSTM)
  const [attackFilter,   setAttackFilter]   = useState('')  // ประเภทการโจมตี
  const [severityFilter, setSeverityFilter] = useState('')  // ระดับความรุนแรง (CRITICAL/HIGH/MEDIUM/LOW)
  const [statusFilter,   setStatusFilter]   = useState('')  // สถานะ (BLOCKED/INVESTIGATING/MITIGATED)
  const [sourceIpFilter, setSourceIpFilter] = useState('')  // กรอง Source IP
  const [targetFilter,   setTargetFilter]   = useState('')  // กรอง Target
  const [dateFrom,       setDateFrom]       = useState('')  // วันที่เริ่มต้น (ISO string)
  const [dateTo,         setDateTo]         = useState('')  // วันที่สิ้นสุด (ISO string)

  const PAGE_SIZE = 10 // ❗ เปลี่ยนตรงนี้เพื่อปรับจำนวนรายการต่อหน้า

  /**
   * handleExportCSV — ส่งออก log ที่ filter แล้วเป็นไฟล์ .csv
   * สร้าง Blob แล้ว trigger download ผ่าน anchor element ชั่วคราว
   */
  function handleExportCSV() {
    playSound('click')
    const headers = ['id', 'ref', 'attack_class', 'source_ip', 'target', 'severity', 'status', 'model_name', 'confidence', 'timestamp']
    const rows = [headers.join(','), ...filtered.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cybershield_logs.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    playSound('success')
  }

  /**
   * handleExportJSON — ส่งออก log ที่ filter แล้วเป็นไฟล์ .json
   * สร้าง data URI แล้ว trigger download ผ่าน anchor element
   */
  function handleExportJSON() {
    playSound('click')
    const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filtered, null, 2))
    const a = document.createElement('a'); a.href = url; a.download = 'cybershield_logs.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    playSound('success')
  }

  /**
   * clearFilters — รีเซ็ต filter ทั้งหมดและกลับไปหน้า 1
   */
  function clearFilters() {
    playSound('click')
    setSearchQuery(''); setModelFilter(''); setAttackFilter('')
    setSeverityFilter(''); setStatusFilter(''); setSourceIpFilter(''); setTargetFilter('')
    setDateFrom(''); setDateTo('')
    setPage(1) // reset pagination
  }

  // ── Logic กรองข้อมูล ───────────────────────────────────────────────────────────────
  // filtered: logs ที่ผ่าน filter ทั้งหมด — ใช้ทำ pagination และ export
  const filtered = logs.filter(l => {
    const q = searchQuery.toLowerCase()
    // matchQ: ตรงกับ search query ใน source_ip, attack_class, model_name หรือ ref
    const matchQ      = !q || [l.source_ip, l.attack_class, l.model_name, l.ref].some(v => v?.toLowerCase().includes(q))
    const matchModel  = !modelFilter   || l.model_name?.toLowerCase().includes(modelFilter)
    const matchAttack = !attackFilter  || l.attack_class === attackFilter
    const matchSev    = !severityFilter|| l.sevKey === severityFilter
    const matchStatus = !statusFilter  || l.statusKey === statusFilter
    const matchSrc    = !sourceIpFilter|| l.source_ip?.includes(sourceIpFilter)
    const matchTgt    = !targetFilter  || l.target?.includes(targetFilter)
    // matchFrom/matchTo: ตรวจการเปรียบเทียบสตริง ISO โดยตรง (ใช้ได้เพราะ ISO format เรียง lexicographically)
    const matchFrom   = !dateFrom      || l.timestamp >= dateFrom
    const matchTo     = !dateTo        || l.timestamp.slice(0,10) <= dateTo
    return matchQ && matchModel && matchAttack && matchSev && matchStatus && matchSrc && matchTgt && matchFrom && matchTo
  })

  // คำนวณ pagination: จำนวนหน้าทั้งหมด และ logs ในหน้าปัจจุบัน
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div>
            <h2 style={{ margin: 0 }}>บันทึกเหตุการณ์</h2>
            <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>ค้นหา ดู และส่งออกบันทึกเหตุการณ์ทั้งหมด</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleExportCSV} disabled={filtered.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ส่งออก CSV
          </button>
          <button className="btn btn-outline" onClick={handleExportJSON} disabled={filtered.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            ส่งออก JSON
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            รีเฟรช
          </button>
        </div>
      </div>

      {/* ── Filters Card ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหา IP, ประเภทการโจมตี หรือรหัสอ้างอิง..."
            style={{ width: '100%', padding: '11px 16px 11px 42px', border: '1px solid var(--border-soft)', borderRadius: 10, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>โหมดทั้งหมด</label>
            <select value={modelFilter} onChange={e => { setModelFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">โหมดทั้งหมด</option>
              <option value="intrusion">Intrusion LSTM (NSL-KDD)</option>
              <option value="flow">Flow LSTM (CSE-CIC-IDS2018)</option>
              <option value="injection">Injection LSTM (SQLi)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>ประเภทการโจมตีทั้งหมด <InfoHelp id="attackType" /></label>
            <select value={attackFilter} onChange={e => { setAttackFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ประเภทการโจมตีทั้งหมด</option>
              <option value="SQL Injection">SQL Injection</option>
              <option value="Brute Force">Brute Force</option>
              <option value="DDoS">DDoS</option>
              <option value="DoS">DoS</option>
              <option value="Port Scan">Port Scan</option>
              <option value="R2L">R2L</option>
              <option value="U2R">U2R</option>
              <option value="Suspicious Activity">Suspicious Activity</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>ช่วงเวลา</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThaiDP value={dateFrom} onChange={v => {
                setDateFrom(v);
                if (v && !dateTo) {
                  const today = new Date().toISOString().slice(0, 10);
                  setDateTo(today);
                }
                setPage(1);
              }} placeholder="วันเริ่มต้น…" />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 13, flexShrink: 0 }}>–</span>
              <ThaiDP value={dateTo} onChange={v => { setDateTo(v); setPage(1); }} placeholder="วันสิ้นสุด…" minDate={dateFrom} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>ความรุนแรง</label>
            <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ทั้งหมด</option>
              <option value="CRITICAL">วิกฤต</option>
              <option value="HIGH">สูง</option>
              <option value="MEDIUM">ปานกลาง</option>
              <option value="LOW">ต่ำ</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>สถานะ</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ทั้งหมด</option>
              <option value="BLOCKED">บล็อกแล้ว</option>
              <option value="INVESTIGATING">กำลังตรวจสอบ</option>
              <option value="MITIGATED">แก้ไขแล้ว</option>
              <option value="OPEN">เปิดอยู่</option>
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>แหล่งที่มา</label>
            <input value={sourceIpFilter} onChange={e => { setSourceIpFilter(e.target.value); setPage(1) }} placeholder="ระบุ IP Address"
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>เป้าหมาย</label>
            <input value={targetFilter} onChange={e => { setTargetFilter(e.target.value); setPage(1) }} placeholder="ระบุ IP Address"
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={clearFilters} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            ล้างตัวกรอง
          </button>
          <button className="btn btn-primary" onClick={() => setPage(1)} style={{ padding: '9px 24px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            ค้นหา
          </button>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          ผลการค้นหา
          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>{filtered.length} รายการ</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner"></div></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: .4 }}><rect x="5" y="3" width="14" height="18" rx="1"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="11" y2="16"></line></svg>
            <div>ไม่พบข้อมูล</div>
            <button onClick={clearFilters} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>ล้างตัวกรอง</button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                    {['เวลา', 'รหัสอ้างอิง', 'ประเภทการโจมตี', 'แหล่งที่มา', 'เป้าหมาย', 'ความรุนแรง', 'สถานะ'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => {
                    const sev = SEV_CONFIG[log.sevKey] || SEV_CONFIG.LOW
                    const st = STATUS_CONFIG[log.statusKey] || STATUS_CONFIG.OPEN
                    const atk = ATTACK_PILL[log.attack_class] || { bg: 'var(--row-head-bg)', color: 'var(--text-secondary)' }
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => { playSound('click'); setSelectedEvent(log) }}>
                        <td style={{ padding: '14px 14px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{formatTH(log.timestamp).split(' ').slice(0,2).join(' ')}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{formatTH(log.timestamp).split(' ')[2]}</div>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{log.ref}</span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: atk.bg, color: atk.color, fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{log.attack_class}</span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span className="mono" style={{ fontSize: 12.5 }}>{log.source_ip}</span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 12.5 }}>{log.target}</span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: sev.bg, color: sev.color, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, background: sev.color, display: 'inline-block', flexShrink: 0 }} />
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999 }}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>แสดง</span>
                <select value={PAGE_SIZE} style={{ padding: '5px 10px', border: '1px solid var(--border-soft)', borderRadius: 6, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13 }}>
                  <option>10</option><option>25</option><option>50</option>
                </select>
                <span>รายการต่อหน้า</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* ← Prev */}
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .35 : 1, color: 'var(--text)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>

                {/* Page numbers — windowed: first, ...left-gap..., cur±2, ...right-gap..., last */}
                {(() => {
                  const delta = 2;
                  const range = [];
                  const rangeWithDots = [];
                  let l;
                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                      range.push(i);
                    }
                  }
                  for (const i of range) {
                    if (l) {
                      if (i - l === 2) rangeWithDots.push(l + 1);
                      else if (i - l > 2) rangeWithDots.push('…');
                    }
                    rangeWithDots.push(i);
                    l = i;
                  }
                  return rangeWithDots.map((item, idx) =>
                    item === '…'
                      ? <span key={'dot' + idx} style={{ padding: '0 4px', color: 'var(--text-tertiary)', fontSize: 13 }}>…</span>
                      : <button key={item} onClick={() => setPage(item)}
                          style={{ minWidth: 34, padding: '6px 8px', borderRadius: 8,
                            border: `1px solid ${page === item ? 'var(--accent)' : 'var(--border-soft)'}`,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: page === item ? 'var(--accent)' : 'transparent',
                            color: page === item ? '#fff' : 'var(--text)',
                            transition: 'background .12s, border-color .12s',
                          }}>
                          {item}
                        </button>
                  );
                })()}

                {/* → Next */}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .35 : 1, color: 'var(--text)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}

```

---

<a id="srcpagessettingsjsx"></a>

## [src/pages/Settings.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Settings.jsx)

**Path:** `src/pages/Settings.jsx` | **Lines:** 522 | **Size:** 37.2 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Settings.jsx — หน้าตั้งค่าระบบ (System Settings)
//
// Tab ที่มี:
//   - profile:   สามารถแก้ไขชื่อ, อีเมล, เบอร์โทร, เปลี่ยนรหัสผ่าน
//   - display:   ธีมสี (dark/light), ภาษา (th/en), compact mode, refresh interval
//   - audio:     เปิด/ปิดเสียง, ปรับระดับเสียง
//   - firewall:  จัดการ IP ที่ถูกบล็อค/quarantine (Admin เท่านั้น)
//   - connection: ทดสอบสถานะ WebSocket และ Admin preview mode
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { isSoundEnabled, setSoundEnabled as saveSoundEnabled, getVolume, setVolume as saveVolume, playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';
import { CONN_STATUS } from '../hooks/useConnectionStatus';
import { relativeTimeTh } from '../utils/time';

const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border-soft)',
  background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .15s',
};

const SECTION_TITLE = { fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' };
const SECTION_SUB = { fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 20px' };

export default function Settings() {
  const { t, lang, setLang, theme, setTheme, auth, updateProfile, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView, setAccessDeniedOpen, conn } = useApp();

  // category: tab/หมวดหมู่ที่กำลังแสดงอยู่ — เริ่มที่ 'profile'
  const [category, setCategory] = useState('profile');

  // ป้องกัน General User เข้าถึง tab firewall (ผ่าน URL หรือ admin preview mode)
  // เมื่อ isGeneralView เปลี่ยน หรือ category เปลี่ยนไปที่ firewall ให้ redirect กลับ
  useEffect(() => {
    if (isGeneralView && category === 'firewall') {
      setCategory('profile');          // บังคับกลับมาที่ profile
      setAccessDeniedOpen(true);       // เปิด modal แจ้ง "ไม่มีสิทธิ์"
    }
  }, [isGeneralView, category, setAccessDeniedOpen]);

  // ── Profile Tab State ──────────────────────────────────────────────────────────
  // โหลดข้อมูล profile จาก auth (context) เป็นค่าเริ่มต้น
  // ถ้าไม่มีข้อมูล ใช้ค่า fallback ('Admin', 'User', etc.)
  const [firstName, setFirstName] = useState(auth?.profile?.name || 'Admin');
  const [lastName, setLastName] = useState(auth?.profile?.lastname || 'User');
  const [email, setEmail] = useState(auth?.email || 'admin@cybershield.local');
  const [phone, setPhone] = useState(auth?.profile?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false); // แสดงเครื่องหมาย ✓ หลังบันทึกสำเร็จ

  /**
   * saveProfile — บันทึก profile ใหม่ผ่าน updateProfile (จาก AppContext)
   * General User ไม่สามารถทำได้ (isGeneralView guard)
   */
  function saveProfile() {
    if (isGeneralView) return;              // guard: ห้าม General User แก้ไข
    playSound('click');
    updateProfile({ name: firstName, lastname: lastName, phone });
    setProfileSaved(true);                  // แสดงข้อความ "บันทึกแล้ว"
  }

  // ── Password State (UI เท่านั้น — การเปลี่ยนรหัสผ่านจริงต้องทำผ่าน backend) ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Audio Tab State ─────────────────────────────────────────────────────────────
  // โหลดค่าจาก localStorage ผ่าน utils/sound.js (isSoundEnabled, getVolume)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [volume, setVolume] = useState(() => getVolume());

  /**
   * handleSoundToggle — เปิด/ปิดเสียงแจ้งเตือนทั้งหมด
   * - บันทึกลง localStorage ผ่าน saveSoundEnabled
   * - ถ้าเปิดเสียง จะเล่นเสียง success ให้ผู้ใช้รับรู้ทันที
   * @param {boolean} checked - true = เปิดเสียง
   */
  function handleSoundToggle(checked) {
    if (isGeneralView) return; // General User เปลี่ยนไม่ได้
    playSound('click');
    setSoundOn(checked);
    saveSoundEnabled(checked);
    if (checked) setTimeout(() => playSound('success'), 100); // เล่นเสียงตัวอย่างหลังเปิด
  }

  /**
   * handleVolumeChange — ปรับระดับเสียง (0.0 – 1.0)
   * บันทึกลง localStorage ผ่าน saveVolume ทันทีที่ slider เปลี่ยน
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleVolumeChange(e) {
    if (isGeneralView) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    saveVolume(val);
  }

  // ── Display Tab State ────────────────────────────────────────────────────────
  // compact mode: ลดระยะห่างและขนาด font ทั่วแอป (CSS class 'compact-theme' บน <html>)
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('cybershield_compact_mode') === 'true');

  // refreshInterval: ความถี่ดึงข้อมูลจากเซิร์ฟเวอร์ (วินาที) — '5'|'10'|'30'|'60'
  const [refreshInterval, setRefreshInterval] = useState(() => localStorage.getItem('cybershield_refresh_interval') || '10');

  /**
   * handleCompactToggle — เปิด/ปิด compact mode
   * toggle CSS class 'compact-theme' บน <html> ให้ CSS variables ทำงานทันที
   * @param {boolean} checked - true = เปิด compact mode
   */
  function handleCompactToggle(checked) {
    if (isGeneralView) return;
    playSound('click');
    setCompactMode(checked);
    localStorage.setItem('cybershield_compact_mode', checked ? 'true' : 'false');
    document.documentElement.classList.toggle('compact-theme', checked); // ปรับ CSS ทั้งแอปทันที
  }

  /**
   * handleRefreshChange — เปลี่ยนช่วงเวลา refresh ข้อมูล
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   */
  function handleRefreshChange(e) {
    if (isGeneralView) return;
    playSound('click');
    setRefreshInterval(e.target.value);
    localStorage.setItem('cybershield_refresh_interval', e.target.value);
  }

  // ── Firewall Tab State ─────────────────────────────────────────────────────
  const [blockedIps, setBlockedIps] = useState([]); // รายการ IP ที่ถูกบล็อก (ดึงจาก API)

  // โหลด blocked IPs จาก API ตอน component mount
  useEffect(() => { fetchBlockedIps(); }, []);

  /**
   * fetchBlockedIps — ดึงรายการ IP ที่ถูกบล็อกจาก API /api/blocked-ips
   * อัปเดต state blockedIps เพื่อแสดงในตาราง Firewall
   */
  async function fetchBlockedIps() {
    try {
      const res = await fetch('/api/blocked-ips');
      const data = await res.json();
      if (data.ok) setBlockedIps(data.data.map(row => row.ip));
    } catch { /* ถ้า API ไม่ตอบ ให้แสดงตารางว่าง */ }
  }

  /**
   * unblockIp — ปลดบล็อก IP ที่เลือกผ่าน API DELETE /api/blocked-ips/:ip
   * General User ทำไม่ได้ (isGeneralView guard)
   * @param {string} ip - IP Address ที่ต้องการปลดบล็อก
   */
  async function unblockIp(ip) {
    if (isGeneralView) return;
    playSound('click');
    try {
      const res = await fetch(`/api/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { setBlockedIps(prev => prev.filter(item => item !== ip)); playSound('success'); }
    } catch { }
  }

  /**
   * addDemoBlockedIp — เพิ่ม IP ทดสอบแบบสุ่มไปยัง blocked list (สำหรับ demo/ทดสอบ UI)
   * สร้าง IP แบบสุ่มในช่วง 172.16.X.X แล้วส่ง POST /api/blocked-ips
   */
  async function addDemoBlockedIp() {
    if (isGeneralView) return;
    playSound('click');
    const demoIp = `172.16.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(Math.random() * 254 + 1)}`;
    if (blockedIps.includes(demoIp)) return; // ไม่เพิ่ม IP ซ้ำ
    try {
      const res = await fetch('/api/blocked-ips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: demoIp }),
      });
      const data = await res.json();
      if (data.ok) { setBlockedIps(prev => [...prev, demoIp]); playSound('success'); }
    } catch { }
  }

  // ── รายการเมนูซ้าย (Sidebar Navigation ของ Settings) ─────────────────────────
  // แสดง role/firewall tab เฉพาะเมื่อ user มีสิทธิ์ (isAdminActual / !isGeneralView)
  const navItems = [
    { key: 'profile',    label: 'โปรไฟล์',        icon: 'M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12Zm0 2c-4 0-7.5 2-7.5 5v1h15v-1c0-3-3.5-5-7.5-5Z' },
    { key: 'general',   label: 'ทั่วไป',           icon: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2' },
    { key: 'audio',     label: 'เสียงแจ้งเตือน',   icon: 'M4 9v6h4l5 5V4L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z' },
    { key: 'display',   label: 'การแสดงผล',        icon: 'M3 4h18v12H3zM8 20h8M12 16v4' },
    { key: 'connection',label: 'การเชื่อมต่อ',     icon: 'M12 3l9 16H3L12 3zM12 10v4M12 17h.01' },
    ...(isAdminActual ? [{ key: 'role',     label: 'บทบาท',      icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM6 21v-2a6 6 0 0 1 12 0v2' }] : []),     // เฉพาะ admin จริง
    ...(!isGeneralView ? [{ key: 'firewall', label: 'ไฟร์วอลล์', icon: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z' }] : []),               // ซ่อนจาก General User
  ];

  /**
   * SegControl — Segmented Control (radio group แบบปุ่ม pill)
   * ใช้แทน <select> เพื่อ UX ที่ดีกว่า (ธีม/ภาษา/เสียง ฯลฯ)
   * @param {string} name - ชื่อ radio group (HTML name attribute)
   * @param {string} value - ค่าที่เลือกอยู่
   * @param {Array<{value, label}>} options - ตัวเลือกทั้งหมด
   * @param {function} onChange - callback เมื่อเลือกค่าใหม่ รับ value string
   * @param {boolean} [disabled] - ถ้า true ปิดการใช้งานทุกตัวเลือก
   */
  const SegControl = ({ name, value, options, onChange, disabled }) => (
    <div style={{ display: 'flex', background: 'var(--gray-chip-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(opt => (
        <label key={opt.value} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input type="radio" name={name} checked={value === opt.value} onChange={() => !disabled && onChange(opt.value)} style={{ display: 'none' }} />
          <span style={{
            display: 'block', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all .15s',
            background: value === opt.value ? 'var(--card-bg)' : 'transparent',
            boxShadow: value === opt.value ? 'var(--shadow)' : 'none',
            color: value === opt.value ? 'var(--text)' : 'var(--text-secondary)',
          }}>
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );

  /**
   * SettingRow — แถวแสดงรายการตั้งค่า 1 รายการ
   * ประกอบด้วย: label (หัวข้อ) + desc (คำอธิบาย) + children (control ทางขวา)
   * @param {string|ReactNode} label - หัวข้อรายการ (ข้อความหรือ JSX)
   * @param {string} [desc] - คำอธิบายสั้นๆ ด้านล่าง label
   * @param {ReactNode} children - control ฝั่งขวา (SegControl, select, slider ฯลฯ)
   */
  const SettingRow = ({ label, desc, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-soft)', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>การตั้งค่า</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>จัดการโปรไฟล์ ภาษาและธีม เสียงแจ้งเตือน การแสดงผล และการกักกันของไฟร์วอลล์</p>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── Sidebar Nav ── */}
        <div className="card elev-sm" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { playSound('click'); setCategory(item.key); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13.5, fontWeight: 600, transition: 'all .15s',
                background: category === item.key ? 'rgba(99,102,241,.12)' : 'transparent',
                color: category === item.key ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile */}
          {category === 'profile' && (
            <>
              <div className="card elev-sm" style={{ padding: '24px 28px' }}>
                <h3 style={SECTION_TITLE}>ข้อมูลส่วนตัว</h3>
                <p style={SECTION_SUB}>แก้ไขชื่อ นามสกุล อีเมล และเบอร์โทรศัพท์ของคุณ</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>ชื่อจริง</label>
                    <input style={INPUT_STYLE} value={firstName} disabled={isGeneralView}
                      onChange={e => { setFirstName(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>นามสกุล</label>
                    <input style={INPUT_STYLE} value={lastName} disabled={isGeneralView}
                      onChange={e => { setLastName(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>อีเมล</label>
                    <input style={INPUT_STYLE} value={email} disabled={isGeneralView}
                      onChange={e => { setEmail(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>เบอร์โทรศัพท์</label>
                    <input style={INPUT_STYLE} placeholder="ระบุเบอร์โทรศัพท์" value={phone} disabled={isGeneralView}
                      onChange={e => { setPhone(e.target.value); setProfileSaved(false); }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                  <button className="btn btn-primary" onClick={saveProfile} disabled={isGeneralView}
                    style={{ padding: '10px 22px' }}>
                    บันทึกการเปลี่ยนแปลง
                  </button>
                  {profileSaved && (
                    <span style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      บันทึกแล้ว
                    </span>
                  )}
                </div>
              </div>

              <div className="card elev-sm" style={{ padding: '24px 28px' }}>
                <h3 style={SECTION_TITLE}>รีเซ็ตรหัสผ่าน</h3>
                <p style={SECTION_SUB}>เปลี่ยนรหัสผ่านของบัญชีผู้ใช้งาน (ต้องใช้งานผ่านระบบหลังบ้าน)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รหัสผ่านปัจจุบัน</label>
                    <input style={INPUT_STYLE} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} disabled />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
                      <input style={INPUT_STYLE} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} disabled />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>ยืนยันรหัสผ่าน</label>
                      <input style={INPUT_STYLE} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} disabled />
                    </div>
                  </div>
                </div>
                <button style={{ marginTop: 18, padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'not-allowed', fontSize: 13 }} disabled>
                  รีเซ็ตรหัสผ่าน
                </button>
              </div>
            </>
          )}

          {/* General */}
          {category === 'general' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>ทั่วไป</h3>
              <p style={SECTION_SUB}>ตั้งค่าภาษาและธีมของแอปพลิเคชัน</p>
              <SettingRow label="ภาษา" desc="เลือกภาษาที่แสดงในหน้าเว็บ">
                <SegControl name="lang" value={lang} options={[{ value: 'th', label: 'ไทย' }, { value: 'en', label: 'English' }]} onChange={v => setLang(v)} />
              </SettingRow>
              <SettingRow label="ธีม" desc="เลือกธีมสีสว่างหรือมืด">
                <SegControl name="theme" value={theme} options={[{ value: 'light', label: '☀️ สว่าง' }, { value: 'dark', label: '🌙 มืด' }]} onChange={v => setTheme(v)} />
              </SettingRow>
            </div>
          )}

          {/* Audio */}
          {category === 'audio' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>เสียงแจ้งเตือน</h3>
              <p style={SECTION_SUB}>ปรับแต่งเสียงการแจ้งเตือนภัยคุกคามและระดับเสียง</p>
              <SettingRow label="เปิดใช้งานเสียง" desc="เปิด/ปิดเสียงแจ้งเตือนทั้งหมด">
                <SegControl name="siren" value={soundOn ? 'on' : 'off'} options={[{ value: 'on', label: 'เปิด' }, { value: 'off', label: 'ปิด' }]} onChange={v => handleSoundToggle(v === 'on')} disabled={isGeneralView} />
              </SettingRow>
              <SettingRow label={`ระดับเสียง (${Math.round(volume * 100)}%)`} desc="ปรับระดับเสียงของการแจ้งเตือน">
                <input type="range" min="0.05" max="1.0" step="0.05" value={volume} onChange={handleVolumeChange}
                  disabled={!soundOn || isGeneralView}
                  style={{ width: 180, accentColor: 'var(--accent)' }} />
              </SettingRow>
              <div style={{ paddingTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', alignSelf: 'center' }}>ทดสอบเสียง:</span>
                {[['alert', '🚨 เสียงเตือน'], ['critical', '⚡ วิกฤต'], ['click', '🖱 คลิก'], ['success', '✓ สำเร็จ']].map(([key, label]) => (
                  <button key={key} onClick={() => playSound(key)} disabled={!soundOn}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: soundOn ? 'pointer' : 'not-allowed', fontSize: 12.5, opacity: soundOn ? 1 : .5 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display */}
          {category === 'display' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>การแสดงผล</h3>
              <p style={SECTION_SUB}>ตั้งค่าความหนาแน่นของการแสดงผลและช่วงเวลารีเฟรช</p>
              <SettingRow label={<>โหมดกะทัดรัด <InfoHelp id="compactModeHelp" /></>} desc="ลดระยะห่างและขนาดองค์ประกอบต่างๆ">
                <SegControl name="density" value={compactMode ? 'on' : 'off'} options={[{ value: 'on', label: 'เปิด' }, { value: 'off', label: 'ปิด' }]} onChange={v => handleCompactToggle(v === 'on')} disabled={isGeneralView} />
              </SettingRow>
              <SettingRow label={<>ช่วงเวลารีเฟรช <InfoHelp id="refreshIntervalHelp" /></>} desc="ความถี่ในการดึงข้อมูลใหม่จากเซิร์ฟเวอร์">
                <select value={refreshInterval} onChange={handleRefreshChange} disabled={isGeneralView}
                  style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                  <option value="5">ทุก 5 วินาที</option>
                  <option value="10">ทุก 10 วินาที</option>
                  <option value="30">ทุก 30 วินาที</option>
                  <option value="60">ทุก 60 วินาที</option>
                </select>
              </SettingRow>
            </div>
          )}

          {/* Connection */}
          {category === 'connection' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>สถานะการเชื่อมต่อ</h3>
              <p style={SECTION_SUB}>สถานะปัจจุบันของฟีดข้อมูลสด และแผงจำลองสถานะสำหรับสาธิต/ทดสอบ</p>

              <SettingRow label="สถานะปัจจุบัน" desc="คลิกที่ badge มุมซ้ายบนของแถบด้านข้างเพื่อสลับเชื่อมต่อสด/ขาดการเชื่อมต่อโดยตรง">
                <span className={`conn-badge ${conn.status}`} style={{ width: 'auto', cursor: 'default' }}>
                  <span className="conn-dot"></span>
                  {conn.status === CONN_STATUS.CONNECTED ? 'เชื่อมต่อสด (Real-time)' :
                    conn.status === CONN_STATUS.RECONNECTING ? 'กำลังเชื่อมต่อใหม่...' :
                    conn.status === CONN_STATUS.DEGRADED ? 'การเชื่อมต่อไม่เสถียร' : 'ขาดการเชื่อมต่อ'}
                </span>
              </SettingRow>
              {conn.status === CONN_STATUS.CONNECTED && (
                <SettingRow label="อัปเดตล่าสุดเมื่อ" desc="เวลาที่ข้อมูลสดเข้ามาล่าสุด">
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{relativeTimeTh(conn.lastUpdate)}</span>
                </SettingRow>
              )}

              <div style={{ marginTop: 20, padding: '18px 20px', borderRadius: 12, background: 'var(--row-head-bg)', border: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>จำลองสถานะ (Demo)</div>
                <p style={{ ...SECTION_SUB, margin: '0 0 14px' }}>
                  สำหรับสาธิต/ทดสอบเพิ่มเติมเท่านั้น — เชื่อมต่อสด/ขาดการเชื่อมต่อสลับได้ตรงจาก badge หลักอยู่แล้ว ส่วนนี้ไว้ดูว่า UI แสดงผลอย่างไรตอน "กำลังเชื่อมต่อใหม่" หรือ "ไม่เสถียร" ซึ่งปกติระบบจะเปลี่ยนเองอัตโนมัติเมื่อเน็ตมีปัญหาจริง ไม่ใช่สิ่งที่ผู้ใช้กดเลือกเอง
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.connected(); }}>
                    <span className="conn-menu-mark conn-menu-mark-green">✓</span> เชื่อมต่อสด
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.reconnecting(); }}>
                    <span className="conn-menu-mark conn-menu-mark-orange">↻</span> กำลังเชื่อมต่อใหม่
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.degraded(); }}>
                    <span className="conn-menu-mark conn-menu-mark-yellow">!</span> การเชื่อมต่อไม่เสถียร
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.disconnected(); }}>
                    <span className="conn-menu-mark conn-menu-mark-red">×</span> ขาดการเชื่อมต่อ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Role */}
          {category === 'role' && isAdminActual && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>บทบาทผู้ใช้งาน</h3>
              <p style={SECTION_SUB}>สลับมุมมองเพื่อดูอินเทอร์เฟซในฐานะผู้ใช้งานทั่วไป</p>
              <SettingRow label={<>มุมมองปัจจุบัน <InfoHelp id="currentViewHelp" /></>} desc="เลือกประเภทการเข้าถึงที่ต้องการดูตอนนี้">
                <SegControl name="rolePreview" value={previewAsGeneral ? 'general' : 'admin'}
                  options={[{ value: 'admin', label: '🔑 ผู้ดูแลระบบ' }, { value: 'general', label: '👤 ผู้ใช้ทั่วไป' }]}
                  onChange={v => setPreviewAsGeneral(v === 'general')} />
              </SettingRow>
              {!previewAsGeneral && (
                <div style={{ marginTop: 20, padding: '18px 20px', borderRadius: 12, background: 'var(--row-head-bg)', border: '1px solid var(--border-soft)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>ข้อมูลการใช้งาน</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                    {[['18', 'ผู้ใช้ที่ใช้งานอยู่'], ['3', 'สมัครใหม่วันนี้'], ['47', 'เซสชันทั้งหมด'], ['6m 12s', 'เวลาเซสชันเฉลี่ย']].map(([val, label]) => (
                      <div key={label}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{val}</div>
                        <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Firewall */}
          {category === 'firewall' && !isGeneralView && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ ...SECTION_TITLE, margin: 0 }}>
                  รายการกักกัน IP <InfoHelp id="firewallHelp" /> <InfoHelp id="quarantineIp" />
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={addDemoBlockedIp} disabled={isGeneralView}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    เพิ่ม IP ทดสอบ
                  </button>
                  <InfoHelp id="simulateBlockHelp" />
                </div>
              </div>
              <p style={SECTION_SUB}>รายการ IP Address ที่ถูกบล็อกโดยระบบป้องกันภัย</p>
              {blockedIps.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10, opacity: .4 }}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"></path></svg>
                  <div>ไม่มี IP ที่ถูกบล็อกในขณะนี้</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {blockedIps.map((ip, i) => (
                    <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < blockedIps.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>
                        </div>
                        <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{ip}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => unblockIp(ip)} disabled={isGeneralView}
                          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                          ปลดบล็อก
                        </button>
                        <InfoHelp id="unblockHelp" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

```

---

<a id="srcpagestestjsx"></a>

## [src/pages/Test.jsx](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/pages/Test.jsx)

**Path:** `src/pages/Test.jsx` | **Lines:** 450 | **Size:** 28.8 KB

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// pages/Test.jsx — หน้าทดสอบโมเดล AI ด้วยตนเอง (Manual Model Testing)
//
// ให้ผู้ใช้ส่ง input ไปตรวจสอบกับโมเดล LSTM ผ่าน API /api/predict
// Tab ที่มี:
//   1. SQLi   — ทดสอบ SQL Injection จาก query string / payload
//   2. Intrusion — ทดสอบการบุกรุก (R2L/U2R) ด้วย feature 41 ค่า (UNSW-NB15)
//   3. Flow   — ทดสอบ DDoS/DoS/Brute Force ด้วย feature 78 ค่า (CIC-IDS2018)
// เพราะ General User ไม่สามารถทดสอบได้ ปุ่มส่งจะถูกปิด (isGeneralView guard)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'
import InfoHelp from '../components/InfoHelp'

export default function Test() {
  const { t, isGeneralView } = useApp()

  // activeTab: โมเดลที่กำลังทดสอบ ('sqli' | 'intrusion' | 'flow')
  const [activeTab, setActiveTab] = useState('sqli')

  // loading: กำลังรอผล prediction จาก API
  const [loading, setLoading] = useState(false)

  // result: ผลลัพธ์ prediction ที่ได้รับจาก API (null = ยังไม่ได้ทดสอบ)
  const [result, setResult] = useState(null)

  // error: ข้อความ error ถ้า prediction ล้มเหลว
  const [error, setError] = useState(null)

  // modelInfo: ข้อมูลโมเดล (features ที่ใช้ train) จาก API /api/model-info
  const [modelInfo, setModelInfo] = useState(null)

  // sqliPayload: ข้อความ SQL หรือ HTTP Request ที่ user พิมพ์ (สำหรับ Injection LSTM)
  const [sqliPayload, setSqliPayload] = useState('')

  // intrusionFeatures: array ค่า 41 feature สำหรับโมเดล Intrusion (UNSW-NB15/NSL-KDD)
  const [intrusionFeatures, setIntrusionFeatures] = useState(Array(41).fill('0'))

  // flowFeatures: array ค่า 78 feature สำหรับโมเดล Flow (CIC-IDS2018)
  const [flowFeatures, setFlowFeatures] = useState(Array(78).fill('0'))

  // ดึง model info จาก API ตอน component mount (ใช้แสดง feature names ที่โมเดล Flow ใช้จริง)
  useEffect(() => {
    fetch('/api/model-info').then(r => r.json()).then(d => { if (d.ok) setModelInfo(d) }).catch(() => {})
  }, [])

  /**
   * loadIntrusionPreset — โหลดค่า feature สำเร็จรูปสำหรับ Intrusion Model
   * เพื่อให้ผู้ใช้ทดสอบได้ง่ายโดยไม่ต้องกรอกค่าทีละช่อง
   * @param {'r2l' | 'u2r' | 'normal'} scenario
   *   - r2l:    จำลองการโจมตี Remote to Local (เข้าถึงผ่าน service ระยะไกล)
   *   - u2r:    จำลองการยกระดับสิทธิ์ User to Root (privilege escalation)
   *   - normal: ทราฟฟิกปกติ (ไม่ใช่การโจมตี)
   */
  function loadIntrusionPreset(scenario) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setResult(null); setError(null)

    const next = Array(41).fill('0') // เริ่มจาก  0 ทั้งหมด แล้วค่อยเปลี่ยนเฉพาะ feature สำคัญ

    if (scenario === 'r2l') {
      // duration=4.5, protocol=1 (TCP), service=20 (ftp), count=3, dst_host_count=5,
      // is_guest_login=1, confidence_indicator=0.85
      next[0]='4.5'; next[1]='1'; next[2]='20'; next[7]='3'; next[10]='5'; next[21]='1'; next[24]='0.85'
    } else if (scenario === 'u2r') {
      // duration=1.2, num_compromised=1, root_shell=1, su_attempted=4, num_root=6, num_file_creations=2
      next[0]='1.2'; next[13]='1'; next[14]='1'; next[15]='4'; next[16]='6'; next[17]='2'
    } else if (scenario === 'normal') {
      // duration=0.02, src_bytes=540, dst_bytes=3240, count=12
      next[0]='0.02'; next[4]='540'; next[5]='3240'; next[22]='12'
    }
    setIntrusionFeatures(next)
  }

  /**
   * loadFlowPreset — โหลดค่า feature สำเร็จรูปสำหรับ Flow Model
   * @param {'ddos' | 'dos' | 'benign'} scenario
   *   - ddos:   จำลอง Distributed Denial of Service attack
   *   - dos:    จำลอง Denial of Service attack
   *   - benign: ทราฟฟิกปกติ (HTTPS)
   */
  function loadFlowPreset(scenario) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setResult(null); setError(null)

    const next = Array(78).fill('0') // เริ่มจาก 0 ทั้งหมด แล้วปรับเฉพาะ feature สำคัญ

    if (scenario === 'ddos') {
      // dst_port=80, Fwd Packets/s=150, Fwd Pkt Len Mean=8500, Init_Win_bytes_bwd=145000
      // Flow Duration=1.2s, SYN Flag Count=1
      next[0]='80'; next[1]='150'; next[2]='8500'; next[14]='145000'; next[18]='1.2'; next[38]='1'
    } else if (scenario === 'dos') {
      // dst_port=443, Fwd Packets/s=115M, Fwd Pkt Len Mean=12, ลร.การแพคเก็ตเดินหน้า=0.12
      next[0]='443'; next[1]='115000000'; next[2]='12'; next[14]='0.12'; next[67]='1'
    } else if (scenario === 'benign') {
      // HTTPS traffic: dst_port=443, Fwd Pkt Len Mean=45K, 18 packets, 24 bytes, flow=840
      next[0]='443'; next[1]='45000'; next[2]='18'; next[3]='24'; next[14]='840'
    }
    setFlowFeatures(next)
  }

  /**
   * handlePredict — ส่งข้อมูลไปตรวจสอบกับโมเดล AI ผ่าน API /api/predict
   * เพลียเสียงตามผล: alert = ชนิดภัย, success = ปกติ
   * General User ไม่สามารถส่งได้ (isGeneralView guard)
   * @param {'sqli' | 'intrusion' | 'flow'} modelName - โมเดลที่ต้องการทดสอบ
   */
  async function handlePredict(modelName) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setLoading(true); setResult(null); setError(null)
    try {
      // สร้าง request body ตาม model type
      let body = { model_name: modelName }
      if (modelName === 'sqli')      body.payload  = sqliPayload
      else if (modelName === 'intrusion') body.features = intrusionFeatures.map(v => Number(v) || 0)
      else if (modelName === 'flow')      body.features = flowFeatures.map(v => Number(v) || 0)

      const res = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        setResult(data.result)
        // เล่นเสียงตามผล: ถ้า class ≠ Normal/BENIGN = ตรวจพบภัย → alert, ถ้าปกติ → success
        playSound(data.result.predicted_class !== 'Normal' && data.result.predicted_class !== 'BENIGN' ? 'alert' : 'success')
      } else {
        setError(data.error || 'Prediction failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * updateFeature — อัปเดตค่า feature ที่ตำแหน่งใดใน array
   * ใช้แบบ immutable update (สร้าง array ใหม่) เพื่อให้ React detect การเปลี่ยนแปลง
   * @param {string[]} features - array feature ปัจจุบัน
   * @param {function} setFeatures - setter function (จาก useState)
   * @param {number} index - ตำแหน่ง feature ที่ต้องการแก้
   * @param {string} value - ค่าใหม่
   */
  function updateFeature(features, setFeatures, index, value) {
    if (isGeneralView) return   // General User ไม่สามารถแก้ไขได้
    const updated = [...features]; updated[index] = value; setFeatures(updated)
  }

  const nslFeatureNames = [
    'duration','protocol_type','service','flag','src_bytes','dst_bytes','land','wrong_fragment','urgent','hot',
    'num_failed_logins','logged_in','num_compromised','root_shell','su_attempted','num_root','num_file_creations',
    'num_shells','num_access_files','num_outbound_cmds','is_host_login','is_guest_login','count','srv_count',
    'serror_rate','srv_serror_rate','rerror_rate','srv_rerror_rate','same_srv_rate','diff_srv_rate',
    'srv_diff_host_rate','dst_host_count','dst_host_srv_count','dst_host_same_srv_rate','dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate','dst_host_srv_diff_host_rate','dst_host_serror_rate','dst_host_srv_serror_rate',
    'dst_host_rerror_rate','dst_host_srv_rerror_rate',
  ]

  const isMalicious = !!result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'
  const flowIgnoredNames = modelInfo?.flow ? modelInfo.flow.raw_feature_names.filter(n => !modelInfo.flow.trained_feature_names.includes(n)) : []

  const MODEL_TABS = [
    {
      key: 'sqli',
      label: 'SQL / HTTP Query · Injection LSTM (SQLi)',
      sublabel: 'SQL Injection · HTTP Request',
      desc: 'ตรวจสอบ SQL Injection จาก Query String',
      features: 'Embedding LSTM',
      color: 'var(--green)',
      bg: 'rgba(34,197,94,.12)',
      icon: <path d="M12 3 4.5 12c0 5 3.5 8.5 7.5 9 4-1.5 7.5-4.5 7.5-9L19.5 3zm-4 9 3 3 5-5" />,
      help: 'sqliModelHelp'
    },
    {
      key: 'intrusion',
      label: 'Intrusion LSTM (UNSW-NB15)',
      sublabel: '49 features · R2L, U2R',
      desc: 'ตรวจจับการบุกรุก R2L และการยกระดับสิทธิ์ U2R',
      features: 'NSL-KDD · 41 features',
      color: 'var(--blue)',
      bg: 'rgba(99,102,241,.12)',
      icon: <path d="M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z" />,
      viewBox: '0 0 20 24',
      help: 'unswNb15'
    },
    {
      key: 'flow',
      label: 'Flow LSTM (CIC-IDS2018)',
      sublabel: 'Normal, DoS, DDoS, BruteForce',
      desc: 'วิเคราะห์ปริมาณการรับ-ส่ง DDoS, DoS, Brute Force',
      features: 'CSE-CIC-IDS2018 · 78 features',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.1)',
      icon: <path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4" />,
      help: 'cicIds2018'
    },
  ]

  const SQLI_PRESETS = [
    { label: 'Normal Query', payload: "SELECT name, price FROM products WHERE category = 'electronics'", safe: true },
    { label: 'SQL Injection', payload: "' OR 1=1 --" },
    { label: 'HTTP Request', payload: "GET /login.php?id=1 OR '1'='1'" },
  ]
  const [sqliPreset, setSqliPreset] = useState('Normal Query')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── ส่วนหัวหน้า ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,179,8,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 4h18v16H3V4zM7 9l3 3-3 3M12 15h4" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>แซนด์บ็อกซ์จำลองการโจมตีด้วยตนเอง</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>ป้อนข้อมูลตรงเข้าโมเดลเพื่อทดสอบพฤติกรรมอย่างละเอียด</p>
        </div>
      </div>

      {/* ── การ์ดเลือกโมเดล ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {MODEL_TABS.map(m => (
          <div key={m.key} onClick={() => { playSound('click'); setActiveTab(m.key); setResult(null); setError(null) }}
            style={{
              padding: '18px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all .2s',
              border: activeTab === m.key ? `2px solid ${m.color}` : '2px solid var(--border-soft)',
              background: activeTab === m.key ? m.bg : 'var(--card-bg)',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, flexShrink: 0 }}>
                <svg width="18" height="18" viewBox={m.viewBox || '0 0 24 24'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{m.icon}</svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: activeTab === m.key ? m.color : 'var(--text)', lineHeight: 1.3 }}>{m.label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <InfoHelp id={m.help} />
              <div className="text-muted" style={{ fontSize: 11.5 }}>{m.sublabel}</div>
            </div>
          </div>
        ))}
      </div>

      {isGeneralView && (
        <div style={{ fontSize: 12, padding: '10px 16px', background: 'rgba(234,179,8,.08)', borderRadius: 8, border: '1px solid rgba(234,179,8,.2)', color: '#fbbf24' }}>
          คุณกำลังดูในโหมดอ่านอย่างเดียว — การส่งข้อมูลถูกปิดการใช้งาน
        </div>
      )}

      {/* ── ฟอร์มกรอกข้อมูล ── */}
      <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* แท็บ SQL Injection */}
        {activeTab === 'sqli' && (
          <>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>คำสั่ง SQL หรือ HTTP Request ที่ต้องการทดสอบ</label>
              <textarea value={sqliPayload} onChange={e => !isGeneralView && setSqliPayload(e.target.value)} readOnly={isGeneralView}
                placeholder={`เช่น SELECT * FROM users WHERE id = 1 OR '1'='1';`} rows={5}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-soft)',
                  background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'monospace',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6
                }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รูปแบบสำเร็จรูป</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SQLI_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { playSound('click'); setSqliPayload(p.payload); setSqliPreset(p.label) }}
                    disabled={isGeneralView}
                    style={{
                      padding: '7px 16px', borderRadius: 999, border: '1.5px solid', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                      borderColor: sqliPreset === p.label ? 'var(--accent)' : 'var(--border-soft)',
                      background: sqliPreset === p.label ? 'rgba(99,102,241,.12)' : 'transparent',
                      color: sqliPreset === p.label ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('sqli')} disabled={loading || isGeneralView || !sqliPayload.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
              <button onClick={() => { playSound('click'); setSqliPayload(''); setResult(null); setError(null); setSqliPreset('') }}
                disabled={isGeneralView}
                style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                ล้างค่า
              </button>
            </div>
          </>
        )}

        {/* แท็บ Intrusion */}
        {activeTab === 'intrusion' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>41 packet features — ตรวจจับการบุกรุก R2L และยกระดับสิทธิ์ U2R</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['r2l', 'R2L Preset'], ['u2r', 'U2R Preset'], ['normal', 'Normal Preset']].map(([k, l]) => (
                  <button key={k} disabled={isGeneralView} onClick={() => loadIntrusionPreset(k)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {intrusionFeatures.map((val, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>[{i}] {nslFeatureNames[i] || `feat_${i}`}</label>
                  <input type="number" step="any" value={val} disabled={isGeneralView}
                    onChange={e => updateFeature(intrusionFeatures, setIntrusionFeatures, i, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12, outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('intrusion')} disabled={loading || isGeneralView}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
            </div>
          </>
        )}

        {/* แท็บ Flow */}
        {activeTab === 'flow' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>78 raw flow features — ตรวจจับ DDoS, DoS และ Brute Force</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['ddos', 'DDoS Preset'], ['dos', 'DoS Preset'], ['benign', 'Benign Preset']].map(([k, l]) => (
                  <button key={k} disabled={isGeneralView} onClick={() => loadFlowPreset(k)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {flowFeatures.map((val, i) => {
                const name = modelInfo?.flow?.raw_feature_names?.[i] || `flow_feat_${i}`
                const ignored = flowIgnoredNames.includes(name)
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: ignored ? .45 : 1 }}>
                    <label style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }} title={ignored ? 'Dropped server-side (fingerprint feature)' : undefined}>
                      [{i}] {name}{ignored ? ' (ignored)' : ''}
                    </label>
                    <input type="number" step="any" value={val} disabled={isGeneralView}
                      onChange={e => updateFeature(flowFeatures, setFlowFeatures, i, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12, outline: 'none' }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('flow')} disabled={loading || isGeneralView}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── ข้อความผิดพลาด ── */}
      {error && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
          <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 4 }}>Model Prediction Error</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      )}

      {/* ── การ์ดแสดงผลลัพธ์ ── */}
      {!result && !error && (
        <div className="card elev-sm" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, border: '2px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>ยังไม่มีผลลัพธ์</div>
          <div className="text-muted" style={{ fontSize: 13, textAlign: 'center', maxWidth: 360 }}>ป้อนข้อมูลด้านบนแล้วกด "ประมวลผลด้วยโมเดล" เพื่อดูผลการตรวจจับ (ค่าตัดสิน + ค่าความเชื่อมั่น) ที่นี่</div>
        </div>
      )}

      {result && (
        <div style={{
          padding: '24px 28px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 20,
          background: isMalicious ? 'rgba(239,68,68,.05)' : 'rgba(34,197,94,.05)',
          border: `1.5px solid ${isMalicious ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.25)'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: isMalicious ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)',
              color: isMalicious ? '#f87171' : '#4ade80'
            }}>
              {isMalicious ? '⚠ ตรวจพบภัยคุกคาม' : '✓ ปลอดภัย / ปกติ'}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>ความเชื่อมั่น: <strong style={{ color: 'var(--text)' }}>{(result.confidence * 100).toFixed(2)}%</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isMalicious ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)', color: isMalicious ? '#f87171' : '#4ade80' }}>
              {isMalicious
                ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m10.3 3.9 8.7 15A1.8 1.8 0 0 1 17.5 21h-15a1.8 1.8 0 0 1-1.6-2.7L9 3.9a1.8 1.8 0 0 1 3 0ZM12 9v4M12 16.5v.01" /></svg>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{result.predicted_class}</div>
          </div>

          {result.caveat && (
            <div className="text-muted" style={{ fontSize: 12 }}>⚠ {result.caveat}</div>
          )}

          {result.all_probabilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>ค่าความน่าจะเป็นทั้งหมด</div>
              {Object.entries(result.all_probabilities).sort(([, a], [, b]) => b - a).map(([cls, prob]) => (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mono" style={{ width: 160, fontSize: 13, flexShrink: 0 }}>{cls}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-soft)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: isMalicious ? '#f87171' : '#4ade80', width: `${prob * 100}%` }} />
                  </div>
                  <span className="mono" style={{ width: 56, textAlign: 'right', fontSize: 13 }}>{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

```

---

<a id="srci18nstringsjs"></a>

## [src/i18n/strings.js](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/i18n/strings.js)

**Path:** `src/i18n/strings.js` | **Lines:** 301 | **Size:** 45.4 KB

```javascript
// Bilingual copy deck. th/en ported from the CyberShield Claude Design mockup,
// extended with keys the mockup didn't cover but the real app needs
// (table columns, feature-grid presets, structured inputs).
export const STR = {
  th: {
    brand: "CyberShield",
    tagline: "ระบบพอร์ทัลความปลอดภัย & ข่าวกรองภัยคุกคามด้วย AI",
    defconSub: "ทุกภาคส่วนปลอดภัย",
    logout: "ออกจากระบบ",
    nav: { dashboard: "แดชบอร์ด", analytics: "การวิเคราะห์", incidents: "เหตุการณ์", logs: "บันทึกเหตุการณ์", manualTest: "ทดสอบด้วยตนเอง", settings: "ตั้งค่า" },
    access: { title: "ไม่มีสิทธิ์เข้าถึง", desc: "หน้านี้สงวนเฉพาะผู้ดูแลระบบเท่านั้น บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้", back: "กลับสู่แดชบอร์ด" },
    login: {
      tabSignin: "เข้าสู่ระบบ", tabSignup: "สมัครสมาชิก",
      usernameLabel: "ชื่อผู้ใช้หรืออีเมล", usernamePh: "กรอกชื่อผู้ใช้หรืออีเมล", passwordLabel: "รหัสผ่าน", passwordPh: "กรอกรหัสผ่าน",
      submitSignin: "เข้าสู่ระบบ CyberShield",
      firstName: "ชื่อจริง", firstNamePh: "ชื่อจริง", lastName: "นามสกุล", lastNamePh: "นามสกุล",
      usernamePh2: "ต้องไม่ซ้ำ (อย่างน้อย 3 ตัวอักษร)", phone: "เบอร์โทรศัพท์", phonePh: "เช่น 081-234-5678",
      showPw: "แสดง", hidePw: "ซ่อน",
      email: "อีเมล", emailPh: "user@example.com",
      passwordPh2: "อย่างน้อย 6 ตัวอักษร", confirmPassword: "ยืนยันรหัสผ่าน", confirmPh: "กรอกรหัสผ่านอีกครั้ง",
      submitSignup: "สมัครสมาชิก", noAccountText: "ยังไม่มีบัญชี?", haveAccountText: "มีบัญชีอยู่แล้ว?",
      consentText: "ข้าพเจ้ารับทราบและยินยอมให้ CyberShield เก็บรวบรวมและประมวลผลข้อมูลการใช้งานของข้าพเจ้าเพื่อวัตถุประสงค์ด้านความปลอดภัยไซเบอร์",
      signupSuccessNotice: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สมัครไว้",
      secureBadge: "พอร์ทัลเข้ารหัสปลอดภัย",
      footerNote: "สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตและผู้ใช้ทั่วไปที่ลงทะเบียนแล้วเท่านั้น",
      adminHint: "บัญชีผู้ดูแลกำหนดค่าไว้ที่เซิร์ฟเวอร์ (.env) หรือสมัครสมาชิกทั่วไป",
      welcomeBack: "ยินดีต้อนรับกลับ", signinSubtitle: "เข้าสู่ระบบเพื่อดูฟีดตรวจจับภัยคุกคามแบบสด",
      signupSubtitle: "สร้างบัญชีผู้ใช้ทั่วไปเพื่อเข้าถึงแดชบอร์ด",
      sideFooter: "เซ็นเซอร์ทั้งหมดออนไลน์และเฝ้าระวังอยู่",
      featIntrusionTitle: "Intrusion Model", featIntrusionDesc: "ตรวจจับ R2L และ U2R ด้วย NSL-KDD",
      featFlowTitle: "Flow Model", featFlowDesc: "ตรวจจับ DoS, DDoS และ BruteForce",
      featAlertTitle: "แจ้งเตือนแบบเรียลไทม์", featAlertDesc: "ระดับ DEFCON พร้อมเสียงแจ้งเตือนทันที",
    },
    dash: {
      title: "ฟีดตรวจจับ SOC แบบสด", subtitle: "เฝ้าระวังภัยคุกคามไซเบอร์แบบเรียลไทม์ด้วยโครงข่ายประสาทเทียม 3 ระบบ",
      live: "สด", lastUpdated: "อัปเดตล่าสุด", online: "ออนไลน์", reconnecting: "กำลังเชื่อมต่อใหม่...",
      previewingGeneral: "กำลังดูตัวอย่างมุมมองบุคคลทั่วไป", returnToAdmin: "กลับสู่มุมมองผู้ดูแล",
      packetSpeedTitle: "ความเร็วแพ็กเก็ตเครือข่ายแบบสด", packetChartDesc: "ปริมาณแพ็กเก็ตที่ระบบตรวจสอบแบบเรียลไทม์",
      xAxisLabel: "เวลา", yAxisLabel: "แพ็กเก็ต/วินาที (pps)",
      modelSummary: "สรุปผลตรวจจับของโมเดล", totalPackets: "แพ็กเก็ตทั้งหมด", highConfidence: "แจ้งเตือนความเชื่อมั่นสูง",
      r2lu2r: "การบุกรุก (R2L/U2R)", ddos: "กระแสข้อมูล (DDoS/DoS)", sqli: "SQL Injection",
      adminPanel: "แผงควบคุมผู้ดูแลระบบ", adminOnly: "เฉพาะผู้ดูแลระบบ", overview: "ภาพรวม",
      openIncidents: "เหตุการณ์ที่ยังเปิดอยู่", criticalAlerts: "แจ้งเตือนวิกฤต", resolvedIncidents: "เหตุการณ์ที่แก้ไขแล้ว",
      modelsOnline: "โมเดลที่ออนไลน์", systemStatus: "สถานะระบบ",
      platformMonitoring: "การเฝ้าระวังแพลตฟอร์ม", demoData: "ข้อมูลสาธิต", cpu: "การใช้งาน CPU", memory: "การใช้งานหน่วยความจำ", database: "ฐานข้อมูล",
      apiRequests: "คำขอ API วันนี้", storage: "การใช้พื้นที่จัดเก็บ", responseTime: "เวลาตอบสนอง",
      sensorStatus: "สถานะเซนเซอร์", networkSensor: "เซนเซอร์เครือข่าย", httpSensor: "เซนเซอร์ HTTP",
      lstmModels: "สถานะโมเดล LSTM",
      livePrediction: "การพยากรณ์แบบสด", clickRow: "คลิกแถวเพื่อดูรายละเอียด",
      noIncidentsNow: "ไม่มีเหตุการณ์ในขณะนี้", allSensorsNormal: "เซนเซอร์ทุกจุดรายงานว่าปกติ"
    },
    analytics: {
      title: "เมทริกซ์ข่าวกรองภัยคุกคาม & การวิเคราะห์", subtitle: "การกระจายประเภทภัยคุกคาม แผนที่ MITRE ATT&CK และค่าความหน่วงของโมเดล",
      range24h: "24 ชั่วโมง", range7d: "7 วัน", rangeAll: "ทั้งหมด", refresh: "รีเฟรชเมทริกซ์",
      spectrumTitle: "การกระจายประเภทการโจมตี", totalSampled: "รายการทั้งหมด",
      mitreTitle: "แผนที่ MITRE ATT&CK", colTactic: "กลยุทธ์", colTechnique: "เทคนิค", colDetected: "ประเภทที่ตรวจพบ", colSeverity: "ความรุนแรง",
      telemetryTitle: "ข้อมูลประสิทธิภาพโมเดล", online: "ออนไลน์", demoResult: "ผลลัพธ์สาธิต",
      inputShape: "รูปแบบข้อมูลนำเข้า", validationAcc: "ความแม่นยำ", f1: "F1-Score", latency: "เวลาประมวลผลเฉลี่ย",
      demoNotice: "กำลังแสดงข้อมูลพื้นฐานจากสถิติย้อนหลัง เหตุการณ์จริงจะผสมเข้ามาอัตโนมัติ"
    },
    incidents: {
      title: "ศูนย์เหตุการณ์และการดำเนินการ", subtitle: "จัดลำดับความสำคัญ กักกันที่ไฟร์วอลล์ขอบเครือข่าย และบันทึกการดำเนินการ",
      statOpen: "แจ้งเตือนวิกฤตที่เปิดอยู่", statInvestigating: "อยู่ระหว่างตรวจสอบ", statMitigated: "แก้ไข/กักกันแล้ว",
      queueTitle: "คิวภัยคุกคามความเชื่อมั่นสูง", filterAll: "ทั้งหมด", filterOpen: "เปิดอยู่", filterInvestigating: "กำลังตรวจสอบ", filterMitigated: "แก้ไขแล้ว",
      emptyTitle: "ไม่พบเหตุการณ์ที่เข้าเงื่อนไข", emptySub: "เซนเซอร์ขอบเครือข่ายรายงานว่าปกติทั้งหมด",
      auditTitle: "บันทึกการดำเนินการของผู้ปฏิบัติงาน", auditEmpty: "ยังไม่มีการบันทึกการดำเนินการวันนี้",
      colRef: "รหัสอ้างอิง", colAttack: "ประเภทการโจมตี", colModel: "โมเดล", colConfidence: "ความเชื่อมั่น", colSource: "ไอพีต้นทาง", colTimestamp: "เวลา", colStatus: "สถานะ", colActions: "การดำเนินการ",
      actionTriage: "ตรวจสอบ", actionQuarantine: "กักกัน", actionInspect: "ตรวจดู", syncBtn: "ซิงค์คิวแจ้งเตือน"
    },
    logs: {
      title: "บันทึกเหตุการณ์ย้อนหลัง", subtitle: "ฐานข้อมูลค้นหาพร้อมตัวกรองขั้นสูงและส่งออกข้อมูล",
      exportCsv: "ส่งออก CSV", exportJson: "ส่งออก JSON", refresh: "รีเฟรช",
      searchPh: "ค้นหา IP, ประเภทการโจมตี หรือรหัสอ้างอิง...", modelFilterAll: "โมเดลทั้งหมด", classFilterAll: "ประเภทการโจมตีทั้งหมด",
      emptyTitle: "ไม่พบเหตุการณ์ย้อนหลัง", emptySub: "ลองปรับเงื่อนไขการค้นหาหรือตัวกรอง",
      colRef: "รหัสอ้างอิง", colModel: "โมเดล", colAttack: "ประเภทการโจมตี", colConfidence: "ความเชื่อมั่น", colSeverity: "ความรุนแรง", colStatus: "สถานะ", colSource: "ไอพีต้นทาง", colTimestamp: "เวลา", colAlert: "แจ้งเตือน",
      prevPage: "← หน้าก่อน", nextPage: "หน้าถัดไป →", pageLabel: "หน้า", alertsOnlyLabel: "แจ้งเตือนความสำคัญสูงเท่านั้น",
      clearFilters: "ล้างตัวกรอง", goToManualTest: "ไปที่ทดสอบด้วยตนเอง"
    },
    manual: {
      title: "แซนด์บ็อกซ์จำลองการโจมตีด้วยตนเอง", subtitle: "ป้อนข้อมูลตรงเข้าโมเดล LSTM ทั้ง 3 เพื่อทดสอบพฤติกรรมอย่างละเอียด",
      tabSql: "โมเดล SQL Injection", tabIntrusion: "โมเดลการบุกรุก (NSL-KDD)", tabFlow: "โมเดลกระแสข้อมูล (CSE-CIC-IDS2018)",
      presetsLabel: "รูปแบบสำเร็จรูป:", presetBoolean: "Boolean Blind", presetStacked: "Stacked Query", presetUnion: "UNION Select", presetClean: "Clean Baseline",
      executeBtn: "ประมวลผลด้วยโมเดล", resultConfidence: "ความเชื่อมั่น", resultLatency: "เวลาประมวลผล",
      readOnlyNotice: "บัญชีทั่วไปดูผลได้อย่างเดียว ไม่สามารถแก้ไขหรือประมวลผลได้",
      presetR2l: "R2L Buffer Exploit", presetU2r: "U2R Root Escalation", presetNormal: "Normal Baseline",
      presetDdos: "SYN Flood DDoS", presetDos: "Slowloris DoS", presetBenign: "BENIGN",
      resultThreat: "ตรวจพบภัยคุกคาม", resultSafe: "ทราฟฟิกปกติ", probSpectrum: "การกระจายความน่าจะเป็น (Softmax)"
    },
    settings: {
      title: "การตั้งค่า", subtitle: "จัดการโปรไฟล์ ภาษาและธีม เสียงแจ้งเตือน การแสดงผล และการกักกันของไฟร์วอลล์",
      audioCardTitle: "เสียงแจ้งเตือน", audioToggleLabel: "เปิดใช้งานไซเรนและเสียงบี๊บ", audioToggleDesc: "เล่นเสียงเมื่อพบการแจ้งเตือนความเชื่อมั่นสูง",
      volumeLabel: "ระดับเสียงหลัก", volumeDesc: "ปรับระดับเสียงเอาต์พุต",
      testSiren: "ทดสอบไซเรน", testPulse: "ทดสอบสัญญาณ DEFCON 1", testClick: "ทดสอบเสียงคลิก", testChime: "ทดสอบเสียงสำเร็จ",
      displayCardTitle: "การแสดงผลและข้อมูล", densityLabel: "โหมดตารางแบบกระชับ", densityDesc: "ลดระยะห่างเพื่อแสดงข้อมูลได้มากขึ้นต่อหน้าจอ",
      refreshLabel: "ความถี่การรีเฟรชอัตโนมัติ", refreshDesc: "ความถี่ในการอัปเดตข้อมูลย้อนหลังและตารางสถิติ",
      every5: "ทุก 5 วินาที", every10: "ทุก 10 วินาที (มาตรฐาน)", every30: "ทุก 30 วินาที", every60: "ทุก 60 วินาที",
      on: "เปิด", off: "ปิด",
      firewallTitle: "รายการ IP ที่ถูกกักกันโดยไฟร์วอลล์ขอบเครือข่าย", addBlockBtn: "จำลองการบล็อก", unblockBtn: "ปลดบล็อก", firewallEmpty: "ไม่มี IP ที่ถูกกักกัน",
      languageLabel: "ภาษา", languageDesc: "เลือกภาษาที่ใช้แสดงผลทั้งระบบ",
      themeLabel: "ธีมการแสดงผล", themeDesc: "สลับระหว่างโหมดสว่างและโหมดมืด", themeLight: "โหมดสว่าง", themeDark: "โหมดมืด",
      roleCardTitle: "บทบาทและมุมมอง", roleLabel: "มุมมองปัจจุบัน", roleDesc: "สลับไปดูหน้าจอในมุมมองบุคคลทั่วไป (อ่านอย่างเดียว)",
      roleAdminOpt: "ผู้ดูแล", roleGeneralOpt: "บุคคลทั่วไป",
      catGeneral: "ทั่วไป", catAudio: "เสียงแจ้งเตือน", catDisplay: "การแสดงผล", catRole: "บทบาทและมุมมอง", catFirewall: "ไฟร์วอลล์", catProfile: "โปรไฟล์",
      previewBannerText: "กำลังดูในมุมมองบุคคลทั่วไป — ใช้งานได้ทุกส่วนแต่ปรับแก้ไม่ได้", previewBackBtn: "กลับสู่มุมมองผู้ดูแล",
      usageCardTitle: "ข้อมูลการใช้งานของบุคคลทั่วไป", usageActiveUsers: "ผู้ใช้ทั่วไปที่ใช้งานอยู่", usageSignups: "สมัครสมาชิกวันนี้", usageSessions: "เซสชันวันนี้", usageAvgSession: "เวลาเฉลี่ยต่อเซสชัน",
      profileCardTitle: "ข้อมูลส่วนตัว", profileSaveBtn: "บันทึกการเปลี่ยนแปลง", profileSavedTag: "บันทึกแล้ว",
      resetPwTitle: "รีเซ็ตรหัสผ่าน", currentPwLabel: "รหัสผ่านปัจจุบัน", newPwLabel: "รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)",
      pwMismatchError: "รหัสผ่านใหม่ไม่ตรงกัน หรือสั้นกว่า 8 ตัวอักษร", resetPwBtn: "รีเซ็ตรหัสผ่าน",
      pwNotConnected: "ฟีเจอร์นี้ยังไม่เชื่อมต่อกับเซิร์ฟเวอร์ — ยังไม่สามารถเปลี่ยนรหัสผ่านจริงได้ในขณะนี้"
    },
    help: {
      radar: { title: "เรดาร์ความปลอดภัย", desc: "แสดงสถานะการเฝ้าระวังภัยคุกคามแบบเรียลไทม์ เรดาร์จะสแกนอย่างต่อเนื่องขณะที่ระบบกำลังตรวจสอบเครือข่าย" },
      packetSpeed: { title: "กราฟทราฟฟิกเครือข่ายแบบสด", desc: "กราฟนี้แสดงปริมาณแพ็กเก็ตที่ระบบกำลังตรวจสอบแบบเรียลไทม์ แกนนอน (X) คือเวลา แกนตั้ง (Y) คือจำนวนแพ็กเก็ตต่อวินาที (pps) เส้นที่สูงขึ้นหมายถึงมีทราฟฟิกเครือข่ายมากขึ้นในช่วงเวลานั้น" },
      buffer: { title: "บัฟเฟอร์แพ็กเก็ต", desc: "จำนวนแพ็กเก็ตที่ระบบรวบรวมไว้ชั่วคราวเพื่อเตรียมส่งให้โมเดลตรวจสอบ" },
      lstm: { title: "โมเดล LSTM เชิงลึก", desc: "โมเดล AI ที่ใช้วิเคราะห์รูปแบบข้อมูลเครือข่ายเพื่อช่วยตรวจจับพฤติกรรมที่อาจเป็นภัยคุกคาม" },
      highConfidence: { title: "แจ้งเตือนความเชื่อมั่นสูง", desc: "จำนวนครั้งที่โมเดลตรวจพบพฤติกรรมผิดปกติด้วยความเชื่อมั่นสูงและควรได้รับความสนใจเป็นพิเศษ" },
      r2lu2r: { title: "การบุกรุก (R2L/U2R)", desc: "ประเภทการโจมตีที่เกี่ยวข้องกับการพยายามเข้าถึงหรือเพิ่มสิทธิ์ในระบบโดยไม่ได้รับอนุญาต" },
      ddos: { title: "กระแสข้อมูล (DDoS/DoS)", desc: "การโจมตีที่ส่งคำขอจำนวนมากเพื่อทำให้ระบบช้าลงหรือไม่สามารถให้บริการได้" },
      sqli: { title: "SQL Injection", desc: "การโจมตีที่พยายามแทรกคำสั่ง SQL ผ่านข้อมูลที่ส่งเข้าสู่ระบบ" },
      defcon: { title: "DEFCON", desc: "ระดับสถานะความปลอดภัยโดยรวมของระบบ ระดับ 5 หมายถึงสถานการณ์ปกติและยังไม่พบภัยคุกคามร้ายแรง" },
      platformPerf: { title: "ประสิทธิภาพแพลตฟอร์ม", desc: "แสดงสถานะการทำงานของเซิร์ฟเวอร์ เช่น CPU หน่วยความจำ พื้นที่จัดเก็บ ฐานข้อมูล และปริมาณคำขอ API" },
      score: { title: "คะแนนความปลอดภัย", desc: "คะแนนภาพรวมที่ใช้แสดงสถานะความปลอดภัยของระบบ ยิ่งคะแนนสูง ระบบยิ่งอยู่ในสถานะที่ปลอดภัย (ช่วงคะแนน 0-100)" },
      incidents: { title: "เหตุการณ์ที่ยังเปิดอยู่", desc: "จำนวนเหตุการณ์ด้านความปลอดภัยที่ยังต้องตรวจสอบหรือดำเนินการ" },
      critical: { title: "แจ้งเตือนวิกฤต", desc: "จำนวนการแจ้งเตือนที่มีความรุนแรงสูงและควรได้รับการตรวจสอบก่อน" },
      apiReq: { title: "จำนวนคำขอ API วันนี้", desc: "จำนวนคำขอที่ส่งเข้าสู่ API ของระบบในวันนี้" },
      storage: { title: "การใช้พื้นที่จัดเก็บ", desc: "เปอร์เซ็นต์พื้นที่จัดเก็บของระบบที่ถูกใช้ไปแล้ว" },
      respTime: { title: "เวลาตอบสนอง", desc: "เวลาเฉลี่ยที่ระบบใช้ในการตอบกลับคำขอ ยิ่งต่ำโดยทั่วไปหมายถึงระบบตอบสนองได้เร็ว" },
      attackDist: { title: "การกระจายประเภทการโจมตี", desc: "สัดส่วนของทราฟฟิกที่ตรวจพบ แบ่งตามประเภทภัยคุกคามในช่วงเวลาที่เลือก" },
      mitre: { title: "MITRE ATT&CK", desc: "กรอบมาตรฐานสำหรับจัดหมวดหมู่พฤติกรรมและเทคนิคที่ผู้โจมตีใช้ เพื่อช่วยให้วิเคราะห์ภัยคุกคามได้เป็นระบบ" },
      modelPerf: { title: "ข้อมูลประสิทธิภาพโมเดล", desc: "ค่าความแม่นยำและความเร็วของแต่ละโมเดล AI ที่ใช้ตรวจจับภัยคุกคาม" },
      severityCol: { title: "ความรุนแรง", desc: "ระดับความรุนแรงของเทคนิคการโจมตี ตั้งแต่ปานกลางไปจนถึงวิกฤต" },
      f1score: { title: "F1-SCORE", desc: "ค่าที่ใช้วัดสมดุลระหว่างความแม่นยำในการตรวจจับและความสามารถในการค้นหาเหตุการณ์ที่ควรตรวจพบ ค่ายิ่งใกล้ 1 ยิ่งดี" },
      incQueue: { title: "คิวภัยคุกคามความเชื่อมั่นสูง", desc: "รายการเหตุการณ์ที่โมเดลตรวจพบด้วยความเชื่อมั่นสูงและรอการตรวจสอบหรือดำเนินการ" },
      opLog: { title: "บันทึกกิจกรรมผู้ปฏิบัติงาน", desc: "ประวัติการดำเนินการของผู้ดูแลระบบต่อเหตุการณ์ต่าง ๆ ในระบบ" },
      refId: { title: "รหัสอ้างอิง", desc: "รหัสอ้างอิงเฉพาะของเหตุการณ์ ใช้สำหรับค้นหาและติดตามเหตุการณ์เดียวกันในระบบ" },
      sourceIp: { title: "Source IP", desc: "หมายเลข IP ของต้นทางที่ส่งทราฟฟิกหรือคำขอที่ระบบตรวจพบ" },
      unswNb15: { title: "UNSW-NB15", desc: "ชุดข้อมูลด้านความปลอดภัยเครือข่ายที่ใช้สำหรับฝึกและประเมินโมเดลตรวจจับการบุกรุก เช่น R2L และ U2R" },
      sqliModelHelp: { title: "SQL Injection", desc: "โมเดลสำหรับตรวจจับรูปแบบคำสั่ง SQL หรือ payload ที่อาจถูกใช้เพื่อโจมตีฐานข้อมูลผ่านช่องโหว่ SQL Injection" },
      cicIds2018: { title: "CIC-IDS2018", desc: "ชุดข้อมูลทราฟฟิกเครือข่ายที่มีทั้งพฤติกรรมปกติและรูปแบบการโจมตีหลายประเภท ใช้สำหรับงานตรวจจับการบุกรุก" },
      presetsHelp: { title: "รูปแบบสำเร็จรูป", desc: "ตัวอย่างข้อมูลสำเร็จรูปที่ใช้ทดสอบพฤติกรรมของโมเดลได้อย่างรวดเร็ว" },
      cleanBaseline: { title: "Clean Baseline", desc: "ตัวอย่างข้อมูลปกติที่ใช้เปรียบเทียบกับข้อมูลโจมตี เพื่อดูว่าโมเดลสามารถแยกพฤติกรรมปกติออกจากภัยคุกคามได้หรือไม่" },
      defcon1Sound: { title: "ทดสอบสัญญาณ DEFCON 1", desc: "เสียงแจ้งเตือนสำหรับสถานการณ์ความปลอดภัยระดับรุนแรงที่สุด" },
      compactModeHelp: { title: "โหมดตารางแบบกระชับ", desc: "ลดความสูงและระยะห่างของแถวตาราง เพื่อให้เห็นข้อมูลจำนวนมากขึ้นในหน้าจอเดียว" },
      refreshIntervalHelp: { title: "ความถี่การรีเฟรชอัตโนมัติ", desc: "กำหนดระยะเวลาที่ระบบจะอัปเดตข้อมูลที่รองรับการรีเฟรชอัตโนมัติ" },
      currentViewHelp: { title: "มุมมองปัจจุบัน", desc: "กำหนดรูปแบบข้อมูลที่แสดงบนหน้าจอ การเปลี่ยนมุมมองไม่ได้เพิ่มสิทธิ์การเข้าถึงของบัญชี" },
      firewallHelp: { title: "ไฟร์วอลล์", desc: "ระบบที่ตรวจสอบและกักกัน IP ที่มีพฤติกรรมน่าสงสัยไม่ให้เชื่อมต่อกับเครือข่าย" },
      quarantineIp: { title: "IP ที่ถูกกักกัน", desc: "IP ที่ถูกระบบไฟร์วอลล์กักกันไว้ เพื่อป้องกันไม่ให้เชื่อมต่อหรือส่งทราฟฟิกตามเงื่อนไขที่กำหนด" },
      unblockHelp: { title: "ปลดบล็อก", desc: "ยกเลิกการกักกัน IP นี้ และอนุญาตให้กลับมาเชื่อมต่อได้ตามกฎของระบบ" },
      simulateBlockHelp: { title: "จำลองการบล็อก", desc: "จำลองการบล็อก IP เพื่อทดสอบการทำงานของระบบ โดยใช้พฤติกรรมเดิมที่ระบบรองรับอยู่" }
    }
  },
  en: {
    brand: "CyberShield",
    tagline: "Security Portal & AI Threat Intelligence",
    defconSub: "All sectors secure",
    logout: "Log out",
    nav: { dashboard: "Dashboard", analytics: "Analytics", incidents: "Incidents", logs: "Logs", manualTest: "Manual Test", settings: "Settings" },
    access: { title: "Access Denied", desc: "This section is for administrators only. Your account does not have permission to access it.", back: "Back to Dashboard" },
    login: {
      tabSignin: "Sign In", tabSignup: "Sign Up",
      usernameLabel: "Username or Email", usernamePh: "Enter username or email", passwordLabel: "Password", passwordPh: "Enter your password",
      submitSignin: "Sign In to CyberShield",
      firstName: "First Name", firstNamePh: "First name", lastName: "Last Name", lastNamePh: "Last name",
      usernamePh2: "Must be unique (min 3 characters)", phone: "Phone Number", phonePh: "e.g. 081-234-5678",
      showPw: "Show", hidePw: "Hide",
      email: "Email Address", emailPh: "user@example.com",
      passwordPh2: "Min 6 characters", confirmPassword: "Confirm Password", confirmPh: "Re-enter password",
      submitSignup: "Sign Up", noAccountText: "Don't have an account?", haveAccountText: "Already have an account?",
      consentText: "I agree and consent to CyberShield collecting and processing my usage data for security operations purposes.",
      signupSuccessNotice: "Account created. Please sign in with your new username and password.",
      secureBadge: "Secure Encrypted Portal",
      footerNote: "Authorized security personnel and registered general users only.",
      adminHint: "Admin account is configured server-side (.env), or register a general account",
      welcomeBack: "Welcome back", signinSubtitle: "Sign in to view the live threat detection feed",
      signupSubtitle: "Create a general user account to access the dashboard",
      sideFooter: "All sensors online and monitoring",
      featIntrusionTitle: "Intrusion Model", featIntrusionDesc: "Detects R2L and U2R via NSL-KDD",
      featFlowTitle: "Flow Model", featFlowDesc: "Detects DoS, DDoS, and BruteForce",
      featAlertTitle: "Real-time Alerting", featAlertDesc: "DEFCON-level escalation with instant audio cues",
    },
    dash: {
      title: "Live SOC Detection Feed", subtitle: "Real-time cyber threat monitoring powered by 3 deep learning networks",
      live: "Live", lastUpdated: "Last updated", online: "Online", reconnecting: "Reconnecting...",
      previewingGeneral: "Previewing as a general user", returnToAdmin: "Return to admin view",
      packetSpeedTitle: "Live Network Packet Speed", packetChartDesc: "Real-time packet volume currently being inspected",
      xAxisLabel: "Time", yAxisLabel: "Packets per second (pps)",
      modelSummary: "Model Detection Summary", totalPackets: "Total Packets", highConfidence: "High-Confidence Alerts",
      r2lu2r: "Intrusion (R2L/U2R)", ddos: "Traffic Flood (DDoS/DoS)", sqli: "SQL Injection",
      adminPanel: "Admin Panel", adminOnly: "Admin Only", overview: "Overview",
      openIncidents: "Open Incidents", criticalAlerts: "Critical Alerts", resolvedIncidents: "Resolved Incidents",
      modelsOnline: "Models Online", systemStatus: "System Status",
      platformMonitoring: "Platform Monitoring", demoData: "Demo Data", cpu: "CPU Usage", memory: "Memory Usage", database: "Database",
      apiRequests: "API Requests Today", storage: "Storage Usage", responseTime: "Response Time",
      sensorStatus: "Sensor Status", networkSensor: "Network Sensor", httpSensor: "HTTP Sensor",
      lstmModels: "LSTM Model Status",
      livePrediction: "Live Prediction", clickRow: "Click a row to inspect",
      noIncidentsNow: "No incidents right now", allSensorsNormal: "All sensors reporting normal"
    },
    analytics: {
      title: "Threat Intelligence & Analytics Matrix", subtitle: "Attack classification distribution, MITRE ATT&CK mapping, and model latency telemetry",
      range24h: "24 Hours", range7d: "7 Days", rangeAll: "All Time", refresh: "Refresh Matrix",
      spectrumTitle: "Attack Spectrum Distribution", totalSampled: "total sampled",
      mitreTitle: "MITRE ATT&CK Framework Mapping", colTactic: "Tactic & ID", colTechnique: "Technique", colDetected: "Detected Class", colSeverity: "Severity",
      telemetryTitle: "Neural Engine Telemetry", online: "Online", demoResult: "Demo Result",
      inputShape: "Input Shape", validationAcc: "Validation Acc", f1: "F1-Score", latency: "Avg Inference Time",
      demoNotice: "Showing baseline historical distributions. Live events will blend in automatically as packets arrive."
    },
    incidents: {
      title: "Active Incidents & Action Center", subtitle: "Real-time triage, edge firewall containment, and audit trail for high-confidence alerts",
      statOpen: "Open Critical Alerts", statInvestigating: "Under Investigation", statMitigated: "Mitigated / Quarantined",
      queueTitle: "High-Confidence Threat Queue", filterAll: "All", filterOpen: "Open", filterInvestigating: "Investigating", filterMitigated: "Mitigated",
      emptyTitle: "No active incidents found", emptySub: "All edge sensors reporting clean traffic within thresholds",
      auditTitle: "Operator Action Audit Trail", auditEmpty: "No operator actions logged yet today.",
      colRef: "Ref ID", colAttack: "Attack Class", colModel: "Model", colConfidence: "Confidence", colSource: "Source IP", colTimestamp: "Timestamp", colStatus: "Status", colActions: "Containment Actions",
      actionTriage: "Triage", actionQuarantine: "Quarantine", actionInspect: "Inspect", syncBtn: "Sync Alert Queue"
    },
    logs: {
      title: "Historical Threat & Event Logs", subtitle: "Searchable prediction database with advanced filtering and exports",
      exportCsv: "Export CSV", exportJson: "Export JSON", refresh: "Refresh",
      searchPh: "Search IP, attack class, or ref ID...", modelFilterAll: "All Neural Models", classFilterAll: "All Attack Classes",
      emptyTitle: "No historical events found", emptySub: "Try adjusting your search criteria or filters",
      colRef: "Reference ID", colModel: "Model", colAttack: "Attack Type", colConfidence: "Confidence", colSeverity: "Severity", colStatus: "Status", colSource: "Source IP", colTimestamp: "Time", colAlert: "Alert",
      prevPage: "← Prev Page", nextPage: "Next Page →", pageLabel: "Page", alertsOnlyLabel: "High-priority alerts only",
      clearFilters: "Clear Filters", goToManualTest: "Go to Manual Test"
    },
    manual: {
      title: "Neural Sandbox & Manual Attack Simulation", subtitle: "Inject crafted payloads directly into the 3 deep LSTM models for precision testing",
      tabSql: "SQL Injection Model", tabIntrusion: "Intrusion LSTM (NSL-KDD)", tabFlow: "Flow LSTM (CSE-CIC-IDS2018)",
      presetsLabel: "Attack presets:", presetBoolean: "Boolean Blind", presetStacked: "Stacked Query", presetUnion: "UNION Select", presetClean: "Clean Baseline",
      executeBtn: "Execute Model Inference", resultConfidence: "Confidence", resultLatency: "Latency",
      readOnlyNotice: "General accounts can view results only — testing is admin-only.",
      presetR2l: "R2L Buffer Exploit", presetU2r: "U2R Root Escalation", presetNormal: "Normal Baseline",
      presetDdos: "SYN Flood DDoS", presetDos: "Slowloris DoS", presetBenign: "BENIGN",
      resultThreat: "Threat Detected", resultSafe: "Benign Traffic Confirmed", probSpectrum: "Softmax Class Probability Spectrum"
    },
    settings: {
      title: "Settings", subtitle: "Manage your profile, language and theme, alerts, display, and firewall quarantine",
      audioCardTitle: "Audio Alerts", audioToggleLabel: "Enable siren & HUD beeps", audioToggleDesc: "Plays a sound when a high-confidence alert occurs",
      volumeLabel: "Master Volume", volumeDesc: "Adjust output gain level",
      testSiren: "Test Alert Siren", testPulse: "Test DEFCON 1 Pulse", testClick: "Test HUD Click", testChime: "Test Success Chime",
      displayCardTitle: "Display & Data", densityLabel: "Compact Table Mode", densityDesc: "Condense padding to fit more rows per screen",
      refreshLabel: "Auto-Refresh Interval", refreshDesc: "Polling frequency for historical logs and stat tables",
      every5: "Every 5 seconds", every10: "Every 10 seconds (Standard)", every30: "Every 30 seconds", every60: "Every 60 seconds",
      on: "On", off: "Off",
      firewallTitle: "Edge Firewall Quarantined IP List", addBlockBtn: "Simulate Edge Block", unblockBtn: "Unblock", firewallEmpty: "No IPs currently quarantined",
      languageLabel: "Language", languageDesc: "Choose the display language for the whole app",
      themeLabel: "Display Theme", themeDesc: "Switch between light and dark mode", themeLight: "Light Mode", themeDark: "Dark Mode",
      roleCardTitle: "Role & Preview", roleLabel: "Current View", roleDesc: "Switch to a read-only preview of the general public view",
      roleAdminOpt: "Admin", roleGeneralOpt: "General",
      catGeneral: "General", catAudio: "Audio Alerts", catDisplay: "Display & Data", catRole: "Role & Preview", catFirewall: "Firewall", catProfile: "Profile",
      previewBannerText: "Previewing as a general user — everything is viewable but nothing can be changed", previewBackBtn: "Back to Admin View",
      usageCardTitle: "General User Activity", usageActiveUsers: "Active General Users", usageSignups: "Sign-ups Today", usageSessions: "Sessions Today", usageAvgSession: "Avg. Session Time",
      profileCardTitle: "Personal Information", profileSaveBtn: "Save Changes", profileSavedTag: "Saved",
      resetPwTitle: "Reset Password", currentPwLabel: "Current Password", newPwLabel: "New Password (min 8 characters)",
      pwMismatchError: "New passwords don't match, or are shorter than 8 characters", resetPwBtn: "Reset Password",
      pwNotConnected: "Not yet connected to the backend — real password changes aren't available here yet."
    },
    help: {
      radar: { title: "Security Radar", desc: "Shows real-time threat monitoring status. The radar sweeps continuously while the system inspects the network." },
      packetSpeed: { title: "Live Network Traffic", desc: "This graph shows the amount of network traffic currently being monitored. X-axis: Time. Y-axis: Packets per second (pps). A higher line indicates more network traffic during that period." },
      buffer: { title: "Packet Buffer", desc: "Number of packets temporarily collected before being sent to the models for inspection." },
      lstm: { title: "Deep LSTM Models", desc: "AI models that analyze network data patterns to help detect potentially malicious behavior." },
      highConfidence: { title: "High-Confidence Alerts", desc: "Number of times a model detected anomalous behavior with high confidence and deserves special attention." },
      r2lu2r: { title: "Intrusions (R2L/U2R)", desc: "Attack types involving unauthorized attempts to access or escalate privileges on the system." },
      ddos: { title: "Traffic Flood (DDoS/DoS)", desc: "Attacks that send a flood of requests to slow down or take down the system." },
      sqli: { title: "SQL Injection", desc: "Attacks that attempt to inject SQL commands through data submitted to the system." },
      defcon: { title: "DEFCON", desc: "The overall security status level of the system. Level 5 means normal conditions with no serious threats detected." },
      platformPerf: { title: "Platform Performance", desc: "Shows server health such as CPU, memory, storage, database, and API request volume." },
      score: { title: "Security Score", desc: "An overall score representing the current security condition of the system. A higher score generally indicates a safer state (range 0-100)." },
      incidents: { title: "Open Incidents", desc: "Number of security incidents that still need investigation or action." },
      critical: { title: "Critical Alerts", desc: "Number of high-severity alerts that should be reviewed first." },
      apiReq: { title: "API Requests Today", desc: "Number of requests sent to the system's API today." },
      storage: { title: "Storage Usage", desc: "Percentage of the system's storage capacity already used." },
      respTime: { title: "Response Time", desc: "Average time the system takes to respond to a request. Lower generally means faster response." },
      attackDist: { title: "Attack Type Distribution", desc: "Share of detected traffic broken down by threat type over the selected time range." },
      mitre: { title: "MITRE ATT&CK", desc: "A cybersecurity framework used to categorize attacker behaviors and techniques for structured threat analysis." },
      modelPerf: { title: "Model Performance Data", desc: "Accuracy and speed metrics for each AI model used to detect threats." },
      severityCol: { title: "Severity", desc: "How serious a given attack technique is, from medium up to critical." },
      f1score: { title: "F1 Score", desc: "A metric balancing precision and recall. Values closer to 1 generally indicate better model performance." },
      incQueue: { title: "High-Confidence Threat Queue", desc: "Events flagged by the models with high confidence, awaiting review or action." },
      opLog: { title: "Operator Activity Log", desc: "History of actions administrators have taken on incidents in the system." },
      refId: { title: "Reference ID", desc: "A unique identifier used to find and track a specific event in the system." },
      sourceIp: { title: "Source IP", desc: "The source IP address that generated the traffic or request detected by the system." },
      unswNb15: { title: "UNSW-NB15", desc: "A network security dataset used to train and evaluate intrusion detection models, including attack types such as R2L and U2R." },
      sqliModelHelp: { title: "SQL Injection", desc: "A model used to detect SQL query patterns or payloads that may indicate a SQL Injection attack." },
      cicIds2018: { title: "CIC-IDS2018", desc: "A network traffic dataset containing normal behavior and multiple attack types, used for intrusion detection research." },
      presetsHelp: { title: "Presets", desc: "Ready-made sample inputs used to quickly test how the model behaves." },
      cleanBaseline: { title: "Clean Baseline", desc: "A normal input sample used as a baseline to verify that the model can distinguish safe behavior from attacks." },
      defcon1Sound: { title: "Test DEFCON 1", desc: "Alert sound used for the highest security severity level." },
      compactModeHelp: { title: "Compact Table Mode", desc: "Reduces table row spacing so more information can be displayed at once." },
      refreshIntervalHelp: { title: "Auto-Refresh Interval", desc: "Controls how often supported data views refresh automatically." },
      currentViewHelp: { title: "Current View", desc: "Changes the information presentation mode. Switching views does not grant additional account permissions." },
      firewallHelp: { title: "Firewall", desc: "The system that inspects and quarantines suspicious IPs from connecting to the network." },
      quarantineIp: { title: "Quarantined IP", desc: "An IP address quarantined by the firewall to prevent traffic according to configured security rules." },
      unblockHelp: { title: "Unblock", desc: "Removes the IP from quarantine and allows traffic again according to firewall rules." },
      simulateBlockHelp: { title: "Simulate Block", desc: "Simulates an IP block using the system's existing test behavior." }
    }
  }
};

export default STR;

```

---

<a id="srcindexcss"></a>

## [src/index.css](file:///c:/Users/Chayanin/.gemini/antigravity-ide/scratch/Project_ict/frontend/src/index.css)

**Path:** `src/index.css` | **Lines:** 1423 | **Size:** 73.2 KB

```css
:root {
  --bg: #F6F8F9;
  --sidebar-bg: #FFFFFF;
  --sidebar-border: #E5E7EB;
  --card-bg: #FFFFFF;
  --border: #E5E7EB;
  --border-soft: #F1F1F1;
  --text: #111827;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --row-head-bg: #FAFAFA;

  --green: #16A34A;
  --green-bg: #DFF3E7;
  --green-bg-strong: #E7F7EE;
  --green-border: #BFE9D2;
  --green-dark: #14532D;
  --green-mid: #4B8067;
  --green-icon-bg: #D3F0DE;

  --blue: #2563EB;

  --red: #EF4444;
  --red-bg: #FEF2F2;
  --red-bg-strong: #FEE2E2;
  --red-border: #FCA5A5;
  --red-text: #B91C1C;
  --red-text-strong: #7F1D1D;
  --red-text-mid: #DC2626;

  --orange: #F59E0B;
  --orange-bg: #FFEDD5;
  --orange-bg-strong: #FEF3C7;
  --orange-text: #C2410C;
  --orange-text-mid: #B45309;

  --yellow: #FACC15;
  --yellow-text: #A16207;

  --gray-chip-bg: #F3F4F6;
  --gray-chip-text: #374151;

  --shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  --shadow-hover: 0 8px 20px rgba(16, 24, 40, 0.09);

  --color-accent: var(--green);
  --color-danger: var(--red);
  --color-success: var(--green);
  --color-success-100: var(--green-bg);
  --color-card: var(--card-bg);
  --color-divider: var(--border);
  --color-bg: var(--bg);
  --color-text: var(--text);
  --color-neutral-600: var(--text-secondary);
  --color-warning: var(--orange);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0E1416;
    --sidebar-bg: #101B16;
    --sidebar-border: #1B2C22;
    --card-bg: #161E21;
    --border: #263033;
    --border-soft: #212A2D;
    --text: #ECEFF1;
    --text-secondary: #9AA5A9;
    --text-tertiary: #6C787C;
    --row-head-bg: #131A1C;

    --green: #34D374;
    --green-bg: #163625;
    --green-bg-strong: #14301F;
    --green-border: #23543A;
    --green-dark: #8FE6B4;
    --green-mid: #7FBF9C;
    --green-icon-bg: #1D4430;

    --blue: #5B8DEF;

    --red: #F87171;
    --red-bg: #2E1616;
    --red-bg-strong: #3A1A1A;
    --red-border: #6B2A2A;
    --red-text: #F3A9A9;
    --red-text-strong: #FBC7C7;
    --red-text-mid: #F87171;

    --orange: #FBB454;
    --orange-bg: #3A2A12;
    --orange-bg-strong: #3A2A12;
    --orange-text: #FBB454;
    --orange-text-mid: #FBB454;

    --yellow: #FADB5F;
    --yellow-text: #FADB5F;

    --gray-chip-bg: #202A2D;
    --gray-chip-text: #C7D0D3;

    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.45);
  }
}

:root[data-theme="dark"] {
  --bg: #0E1416;
  --sidebar-bg: #101B16;
  --sidebar-border: #1B2C22;
  --card-bg: #161E21;
  --border: #263033;
  --border-soft: #212A2D;
  --text: #ECEFF1;
  --text-secondary: #9AA5A9;
  --text-tertiary: #6C787C;
  --row-head-bg: #131A1C;

  --green: #34D374;
  --green-bg: #163625;
  --green-bg-strong: #14301F;
  --green-border: #23543A;
  --green-dark: #8FE6B4;
  --green-mid: #7FBF9C;
  --green-icon-bg: #1D4430;

  --blue: #5B8DEF;

  --red: #F87171;
  --red-bg: #2E1616;
  --red-bg-strong: #3A1A1A;
  --red-border: #6B2A2A;
  --red-text: #F3A9A9;
  --red-text-strong: #FBC7C7;
  --red-text-mid: #F87171;

  --orange: #FBB454;
  --orange-bg: #3A2A12;
  --orange-bg-strong: #3A2A12;
  --orange-text: #FBB454;
  --orange-text-mid: #FBB454;

  --yellow: #FADB5F;
  --yellow-text: #FADB5F;

  --gray-chip-bg: #202A2D;
  --gray-chip-text: #C7D0D3;

  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.45);
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: "Noto Sans Thai", "Inter", system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  margin: 0;
}

/* ---------- CUSTOM THEMED SCROLLBAR ---------- */
* { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 999px;
  border: 2px solid var(--bg);
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-tertiary);
  background-clip: padding-box;
}
*::-webkit-scrollbar-corner { background: transparent; }

a { text-decoration: none; color: inherit; }
button { font: inherit; cursor: pointer; }

.app {
  display: flex;
  min-height: 100dvh;
}
.app[hidden] { display: none; }
.login-screen[hidden] { display: none; }

.skeleton-overlay {
  position: absolute; inset: 0; z-index: 50; background: var(--bg);
  padding: 26px 34px 48px; display: flex; flex-direction: column; gap: 22px;
  overflow: hidden; opacity: 1; transition: opacity .35s ease;
}
.skeleton-overlay.fade-out { opacity: 0; pointer-events: none; }
.skeleton-overlay[hidden] { display: none; }
.skeleton-block {
  border-radius: 10px; background: linear-gradient(90deg, var(--border-soft) 25%, var(--border) 37%, var(--border-soft) 63%);
  background-size: 400% 100%; animation: cs-shimmer 1.4s ease-in-out infinite;
}
.skeleton-row { display: flex; gap: 16px; flex-wrap: wrap; }
.skeleton-row > .skeleton-block { flex: 1; min-width: 200px; }
@keyframes cs-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* ---------- SIDEBAR ---------- */
.sidebar {
  width: 250px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  gap: 20px;
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
}

.logo-row { display: flex; align-items: center; gap: 10px; }
.logo-mark {
  width: 30px; height: 30px; border-radius: 8px; background: var(--blue);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.logo-name { font-size: 16px; font-weight: 700; }
.logo-version { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }

.defcon-card {
  background: var(--green-bg-strong);
  border: 1px solid var(--green-border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
}
.defcon-icon {
  width: 30px; height: 30px; border-radius: 8px; background: var(--green-icon-bg);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.defcon-title { font-size: 13px; font-weight: 700; color: var(--green-dark); }
.defcon-sub { font-size: 11px; color: var(--green-mid); }

.conn-badge {
  display: flex; align-items: center; gap: 8px; border: none; border-radius: 8px; padding: 7px 10px;
  font-size: 11.5px; font-weight: 600; background: none; cursor: pointer; width: 100%; text-align: left;
}
.conn-badge.connected { color: var(--green-dark); }
.conn-badge.disconnected { color: var(--red-text-mid); }
.conn-badge.reconnecting { color: var(--orange-text-mid); }
.conn-badge.degraded { color: var(--yellow-text); }
.conn-badge:hover { background: var(--border-soft); border-radius: 8px; }
.conn-badge-text { display: flex; flex-direction: column; min-width: 0; }
.conn-badge-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conn-badge-sub { font-size: 10.5px; font-weight: 400; color: var(--text-secondary); margin-top: 1px; }
.conn-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; transition: background .25s ease; }
.conn-badge.connected .conn-dot { background: var(--green); animation: cs-pulse-dot 2.2s ease-in-out infinite; }
.conn-badge.disconnected .conn-dot { background: var(--red); }
.conn-badge.degraded .conn-dot { background: var(--yellow); }
.conn-spinner {
  width: 11px; height: 11px; flex-shrink: 0; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--orange) 30%, transparent);
  border-top-color: var(--orange); animation: cs-spin .8s linear infinite;
}
@keyframes cs-pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
@keyframes cs-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .conn-badge.connected .conn-dot { animation: none; }
  .conn-spinner { animation-duration: 1.6s; }
}

.conn-menu-option {
  display: flex; align-items: center; gap: 9px; padding: 10px 12px;
  border: 1px solid var(--border-soft); background: none; border-radius: 8px; font-size: 12.5px; color: var(--text);
  cursor: pointer; text-align: left;
}
.conn-menu-option:hover { background: var(--border-soft); }
.conn-menu-mark {
  width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.conn-menu-mark-green { background: var(--green-bg); color: var(--green); }
.conn-menu-mark-orange { background: var(--orange-bg); color: var(--orange-text); }
.conn-menu-mark-yellow { background: color-mix(in srgb, var(--yellow) 20%, transparent); color: var(--yellow-text); }
.conn-menu-mark-red { background: var(--red-bg); color: var(--red-text-mid); }

.conn-banner {
  display: none; align-items: center; gap: 10px; background: var(--red-bg-strong, #FEF2F2);
  border: 1px solid var(--red-border, #FECACA); color: var(--red-text-mid); border-radius: 10px;
  padding: 10px 14px; font-size: 12.5px; font-weight: 600;
}
.conn-banner.show { display: flex; animation: cs-empty-in .35s cubic-bezier(.16,1,.3,1); }
.conn-banner-sub { font-weight: 400; color: var(--text-secondary); font-size: 12px; }
@media (prefers-reduced-motion: reduce) { .conn-banner.show { animation: none; } }

.events-table tbody tr.clickable-row { cursor: pointer; }

.modal-backdrop {
  position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.45); padding: 20px; opacity: 0; pointer-events: none; transition: opacity .18s ease;
}
.modal-backdrop.show { opacity: 1; pointer-events: auto; }
.modal-backdrop[hidden] { display: none; }
.modal-card {
  width: 100%; max-width: 460px; max-height: 88vh; overflow-y: auto; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,.2);
  padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 16px;
  transform: translateY(8px) scale(.98); transition: transform .18s ease;
}
.modal-backdrop.show .modal-card { transform: translateY(0) scale(1); }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.modal-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.modal-ref { font-size: 12px; color: var(--text-tertiary); font-weight: 600; }
.modal-close-btn {
  width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--border-soft);
  color: var(--text-secondary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.modal-close-btn:hover { background: var(--border); }
.modal-title { font-size: 15px; font-weight: 700; }
.modal-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-field-label { font-size: 11px; font-weight: 700; letter-spacing: .03em; color: var(--text-tertiary); text-transform: uppercase; }
.modal-field-value { font-size: 13.5px; color: var(--text); margin-top: 4px; font-weight: 600; }
.modal-field-value.desc { font-weight: 400; margin-top: 6px; line-height: 1.5; }
.modal-desc-block { background: var(--row-head-bg); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
@media (max-width: 480px) { .modal-field-grid { grid-template-columns: 1fr; } }

.nav { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px;
  color: var(--text-secondary); font-size: 14px; font-weight: 500;
  border: none; background: transparent; width: 100%; text-align: left;
  transition: background .15s ease, color .15s ease;
}
.nav-item svg { flex-shrink: 0; }
.nav-item:hover { background: var(--border-soft); }
.nav-item.active { background: var(--green-bg); color: var(--green); font-weight: 600; }
.nav-item.active svg { stroke: var(--green); }
.nav-item .badge-mini {
  margin-left: auto; font-size: 10.5px; font-weight: 700; color: #fff;
  background: var(--red); border-radius: 999px; padding: 1px 6px;
}

.sidebar-spacer { flex-grow: 1; }

.help-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  color: var(--text-secondary); font-size: 13.5px; font-weight: 500;
  border: none; background: transparent; width: 100%; text-align: left; border-radius: 10px;
}
.help-row:hover { background: var(--border-soft); }

.sidebar-divider { height: 1px; background: var(--sidebar-border); margin: 2px 0; }

.profile-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 6px;
  border: none; background: transparent; width: 100%; text-align: left; border-radius: 10px;
}
.profile-row:hover { background: var(--border-soft); }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; background: #1F2937; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.profile-name { font-size: 13.5px; font-weight: 700; }
.profile-role { font-size: 11.5px; color: var(--text-tertiary); }

/* ---------- MAIN ---------- */
.main {
  position: relative;
  flex-grow: 1;
  padding: 26px 34px 48px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.greeting { font-size: 24px; font-weight: 700; }
.greeting-sub { font-size: 13.5px; color: var(--text-secondary); margin-top: 4px; }

.topbar-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.search-box {
  display: flex; align-items: center; gap: 8px; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 10px; padding: 9px 14px; width: min(280px, 100%);
}
.search-box input {
  border: none; outline: none; background: transparent; font-size: 13px; color: var(--text);
  width: 100%; font-family: inherit;
}
.search-box input::placeholder { color: var(--text-tertiary); }

.pill-btn {
  display: flex; align-items: center; gap: 8px; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 10px; padding: 9px 14px;
  font-size: 13px; color: var(--text); font-weight: 500;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.pill-btn:hover { border-color: var(--text-tertiary); box-shadow: var(--shadow-hover); }

.icon-btn {
  position: relative; width: 38px; height: 38px; border-radius: 10px;
  background: var(--card-bg); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  transition: border-color .15s ease, background .15s ease;
}
.icon-btn:hover { border-color: var(--text-tertiary); background: var(--border-soft); }
.bell-badge {
  position: absolute; top: -5px; right: -5px; width: 17px; height: 17px; border-radius: 50%;
  background: var(--red); color: #fff; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.stat-grid {
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px;
}
@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: 1fr; } }

.stat-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px;
  padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow);
  transition: transform .18s ease, box-shadow .18s ease;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.stat-card.critical { background: var(--red-bg); border-color: var(--red-border); }
.stat-label-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); font-weight: 500; }
.stat-card.critical .stat-label-row { color: var(--red-text-strong); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stat-value { font-size: 21px; font-weight: 700; }
.stat-sub { font-size: 12px; color: var(--text-tertiary); }
.stat-card.critical .stat-sub { color: var(--red-text); }

.card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px;
  box-shadow: var(--shadow);
}
.card.elev-md { box-shadow: var(--shadow-hover); }
.text-muted { color: var(--text-tertiary); }

.chart-card { padding: 20px 24px 16px; }
.chart-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 12px; }
.chart-head .legend-row, .chart-head .demo-pill { margin-top: 1px; }
.chart-title-row { display: flex; align-items: center; gap: 6px; }
.chart-title { font-size: 15px; font-weight: 700; }
.chart-title-group { display: flex; flex-direction: column; gap: 2px; }
.chart-desc, .mini-desc { font-size: 11.5px; color: var(--text-tertiary); font-weight: 400; line-height: 1.4; }
.legend-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.unit-chip {
  display: flex; align-items: center; gap: 6px; background: var(--gray-chip-bg);
  border-radius: 8px; padding: 6px 10px; font-size: 12px; color: var(--gray-chip-text); font-weight: 500;
  border: none;
}

.chart-body { display: flex; gap: 8px; }
.y-axis {
  display: flex; flex-direction: column; justify-content: space-between;
  height: 240px; padding-bottom: 22px; font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
}
.chart-plot { flex-grow: 1; min-width: 0; }
.x-axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); padding: 0 2px; margin-top: 2px; }

.chart-tooltip {
  position: absolute; pointer-events: none; background: var(--text); color: var(--bg);
  font-size: 11.5px; padding: 5px 9px; border-radius: 7px; white-space: nowrap;
  transform: translate(-50%, -130%); opacity: 0; transition: opacity .1s ease; z-index: 5;
}
.chart-plot-wrap { position: relative; }

.section-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; row-gap: 10px; }
.section-title { font-size: 16px; font-weight: 700; }
.section-dropdown { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; border: none; background: transparent; }

.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .summary-grid { grid-template-columns: 1fr; } }

.mini-card { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.mini-title { font-size: 13.5px; font-weight: 700; }
.mini-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.mini-card-head .mini-card-peak { margin-top: 1px; flex-shrink: 0; }
.mini-card-peak {
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, var(--card-bg)); border-radius: 999px; padding: 3px 9px 3px 7px;
  white-space: nowrap;
}
.donut-wrap { align-self: center; }
.legend-list { display: flex; flex-direction: column; gap: 7px; }
.legend-list-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; flex-wrap: wrap; row-gap: 4px; }
.legend-list-row .left { display: flex; align-items: center; gap: 7px; color: var(--text-secondary); min-width: 0; }
.legend-list-row .val { font-weight: 600; }

.source-list { display: flex; flex-direction: column; gap: 20px; margin-top: 4px; }
.source-row { display: flex; align-items: center; gap: 10px; }
.source-label { font-size: 13px; color: var(--gray-chip-text); flex-grow: 1; }
.source-val { font-size: 13.5px; font-weight: 700; }

.bars {
  display: flex; align-items: flex-end; gap: 6px; height: 176px; flex-grow: 1;
}
.bar-col {
  position: relative; width: 100%; height: 100%;
  display: flex; align-items: flex-end; justify-content: center;
}
.bar {
  width: 100%; border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--blue) 55%, transparent), color-mix(in srgb, var(--blue) 30%, transparent));
  transition: height .9s cubic-bezier(.16,1,.3,1), filter .12s ease;
}
.bar-col:hover .bar { filter: brightness(1.1); }
.bar-tooltip {
  position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%) translateY(4px);
  background: var(--text); color: var(--card-bg); font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 6px; white-space: nowrap; z-index: 5;
  opacity: 0; pointer-events: none; transition: opacity .15s ease, transform .15s ease;
}
.bar-col:hover .bar-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
.bars-axis { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-tertiary); margin-top: -8px; }

.table-card { overflow-x: auto; }
.events-table { width: 100%; border-collapse: collapse; min-width: 880px; }
.events-table th {
  text-align: left; font-size: 11.5px; font-weight: 600; color: var(--text-secondary);
  padding: 13px 20px; background: var(--row-head-bg); border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.events-table td {
  padding: 14px 20px; border-bottom: 1px solid var(--border-soft); font-size: 13px;
  color: var(--gray-chip-text); vertical-align: middle; overflow-wrap: break-word;
}
.events-table tbody tr:last-child td { border-bottom: none; }
.events-table tbody tr:hover { background: var(--border-soft); }
.time-cell { color: var(--text-secondary); white-space: nowrap; }
.type-chip {
  display: inline-block; font-size: 11.5px; font-weight: 600; border-radius: 6px; padding: 4px 10px; white-space: nowrap;
}
.sev-cell { display: flex; align-items: center; gap: 6px; font-size: 12.5px; white-space: nowrap; }
.status-chip {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600;
  border-radius: 999px; padding: 4px 12px; white-space: nowrap;
}

/* ---------- PAGES ---------- */
.page { display: none; flex-direction: column; gap: 22px; }
.page.active { display: flex; animation: cs-page-in .32s ease; }
@keyframes cs-page-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .page.active { animation: none; }
}

/* ---------- CHART LOAD ANIMATION ---------- */
#lineChart polyline { transition: stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1); }
.donut-wrap circle, .big-donut-wrap circle {
  transition: filter .15s ease, opacity .15s ease;
  cursor: pointer;
}
.donut-wrap, .big-donut-wrap svg { filter: drop-shadow(0 2px 6px rgba(0,0,0,.06)); }
.donut-wrap circle:hover, .big-donut-wrap circle:hover {
  filter: brightness(1.18);
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .bars .bar, #lineChart polyline { transition: none; }
}

.page-title-row { display: flex; align-items: center; gap: 12px; }
.icon-round-btn {
  width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--card-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.icon-round-btn:hover { border-color: var(--text-tertiary); }
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}
.page-heading { font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.page-heading-icon {
  width: 34px; height: 34px; border-radius: 10px; background: var(--green-bg); color: var(--green);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.page-sub { font-size: 13.5px; color: var(--text-secondary); margin-top: 4px; }
.page-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.btn {
  display: flex; align-items: center; gap: 7px; border-radius: 10px; padding: 9px 16px;
  font-size: 13px; font-weight: 600; border: 1px solid transparent; white-space: nowrap;
  transition: filter .15s ease, border-color .15s ease, transform .1s ease, box-shadow .15s ease;
}
.btn:active { transform: scale(.97); }
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { filter: brightness(1.06); box-shadow: var(--shadow-hover); }
.btn-outline { background: var(--card-bg); border-color: var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--text-tertiary); box-shadow: var(--shadow-hover); }
.btn-sm { padding: 7px 12px; font-size: 12.5px; }

/* self-test type cards */
.type-select-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .type-select-grid { grid-template-columns: 1fr; } }
.type-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px;
  border: 1.5px solid var(--border); background: var(--card-bg); text-align: left;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
.type-card:hover { border-color: var(--text-tertiary); transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.type-card.selected { border-color: var(--blue); background: color-mix(in srgb, var(--blue) 7%, var(--card-bg)); }
.type-card-icon {
  width: 38px; height: 38px; border-radius: 10px; background: color-mix(in srgb, var(--blue) 14%, var(--card-bg));
  color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.type-card-title { font-size: 14px; font-weight: 700; }
.type-card-sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
.type-card-chev { margin-left: auto; color: var(--text-tertiary); flex-shrink: 0; }

.info-banner {
  display: flex; align-items: center; gap: 10px; background: color-mix(in srgb, var(--blue) 8%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--blue) 22%, var(--border)); border-radius: 10px;
  padding: 12px 16px; font-size: 12.5px; color: var(--text); line-height: 1.5;
}
.info-banner svg { flex-shrink: 0; color: var(--blue); }
.info-banner .close-x { margin-left: auto; background: none; border: none; color: var(--text-tertiary); flex-shrink: 0; }

.form-card { padding: 22px 24px; display: flex; flex-direction: column; gap: 18px; }
.form-card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
.field-row-head { display: flex; align-items: center; justify-content: space-between; }
.link-btn { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--blue); background: none; border: none; font-weight: 600; }

.pill-tab-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pill-tab {
  padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--border); background: var(--card-bg);
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  transition: border-color .15s ease, color .15s ease, background .15s ease;
}
.pill-tab:hover:not(.selected) { border-color: var(--text-tertiary); }
.pill-tab.selected { border-color: var(--blue); color: var(--blue); background: color-mix(in srgb, var(--blue) 7%, var(--card-bg)); }

.code-editor {
  display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  background: var(--row-head-bg); min-height: 220px;
}
.code-gutter { padding: 14px 12px; color: var(--text-tertiary); font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; background: var(--row-head-bg); border-right: 1px solid var(--border); }
.code-textarea {
  flex-grow: 1; border: none; outline: none; resize: none; background: var(--card-bg);
  font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; color: var(--text);
  padding: 14px 16px; min-height: 220px; line-height: 1.5;
}
.code-count { text-align: right; font-size: 11.5px; color: var(--text-tertiary); margin-top: -8px; }

/* filter row (logs / incidents) */
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-field { display: flex; flex-direction: column; gap: 6px; flex-grow: 1; min-width: 140px; }
.filter-field-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.input, .select {
  display: flex; align-items: center; gap: 8px; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 10px; padding: 9px 12px; font-size: 13px; color: var(--text); width: 100%;
}
.input input, .select { background: transparent; border: none; outline: none; color: inherit; font: inherit; width: 100%; }
.select { justify-content: space-between; cursor: pointer; }

.dropdown { position: relative; flex-grow: 1; min-width: 140px; }
.dropdown-toggle { cursor: pointer; }
.dropdown-menu {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 40;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.14); padding: 4px; max-height: 260px; overflow-y: auto;
}
.popup-notif-head { font-size: 12.5px; font-weight: 700; padding: 6px 8px 8px; color: var(--text-secondary); }
.popup-notif-item { padding: 9px 8px; border-radius: 8px; font-size: 12.5px; color: var(--text); }
.popup-notif-item:hover { background: var(--border-soft); }
.dropdown-opt {
  display: block; width: 100%; text-align: left; padding: 8px 10px; border: none; background: none;
  font-size: 13px; color: var(--text); border-radius: 7px;
}
.dropdown-opt:hover { background: var(--border-soft); }
.dropdown-opt.selected { background: color-mix(in srgb, var(--blue) 10%, var(--card-bg)); color: var(--blue); font-weight: 600; }

.date-popover {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 30; width: 380px; max-width: 90vw;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.14);
  padding: 18px; display: flex; flex-direction: column; gap: 16px;
}
.popover-label { font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--text-tertiary); }
.preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.preset-pill {
  padding: 8px 10px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--card-bg);
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary);
}
.preset-pill.selected { border-color: var(--blue); color: var(--blue); background: color-mix(in srgb, var(--blue) 7%, var(--card-bg)); }
.custom-range-row { display: flex; flex-direction: column; gap: 8px; }
.custom-range-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; }
.custom-range-inputs { display: flex; gap: 8px; }
.popover-actions { display: flex; justify-content: flex-end; gap: 8px; }
.date-popover[hidden] { display: none; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 60px 20px;
  animation: cs-empty-in .4s cubic-bezier(.16,1,.3,1);
}
.empty-state[hidden] { display: none; }
@keyframes cs-empty-in {
  from { opacity: 0; transform: translateY(6px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) { .empty-state { animation: none; } }
.empty-state-icon-wrap { position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
.empty-state-icon-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px dashed color-mix(in srgb, var(--blue) 35%, var(--border));
}
.empty-state-icon {
  position: relative; width: 52px; height: 52px; border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--blue) 16%, var(--card-bg)), var(--gray-chip-bg));
  display: flex; align-items: center; justify-content: center; color: var(--blue);
}
.empty-state-title { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px; }
.empty-state-sub { font-size: 12.5px; color: var(--text-tertiary); }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; flex-wrap: wrap; gap: 10px; }
.page-size-select { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); }
.page-nums { display: flex; align-items: center; gap: 4px; }
.page-num {
  width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; color: var(--text-secondary); border: 1px solid transparent; background: none;
}
.page-num.selected { background: var(--blue); color: #fff; font-weight: 700; }
.page-arrow { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--card-bg); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }

/* incident center */
.incident-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
@media (max-width: 900px) { .incident-stat-grid { grid-template-columns: 1fr; } }
.incident-stat-card { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; }
.incident-stat-value { font-size: 28px; font-weight: 700; }
.incident-stat-label { font-size: 13px; font-weight: 600; margin-top: 2px; }
.incident-stat-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.incident-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.two-col { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 1000px) { .two-col { grid-template-columns: 1fr; } }

.severity-panel { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.severity-panel-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.severity-panel-head .pill-tab-group { margin-top: 1px; }
.severity-body { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; justify-content: center; }
.big-donut-wrap { position: relative; flex-shrink: 0; }
.big-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.big-donut-total { font-size: 24px; font-weight: 700; }
.big-donut-total-label { font-size: 11.5px; color: var(--text-tertiary); text-align: center; line-height: 1.3; }

.activity-panel { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.activity-panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; row-gap: 8px; }
.activity-list { display: flex; flex-direction: column; gap: 4px; }
.activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-soft); }
.activity-item:last-child { border-bottom: none; }
.activity-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.activity-title { font-size: 13px; font-weight: 600; overflow-wrap: break-word; }
.activity-sub { font-size: 11.5px; color: var(--text-tertiary); margin-top: 1px; overflow-wrap: break-word; }
.activity-time { font-size: 11.5px; color: var(--text-tertiary); white-space: nowrap; margin-left: auto; }

.sev-pill { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
.detail-main { font-size: 13px; color: var(--text); overflow-wrap: break-word; }
.detail-sub { font-size: 11.5px; color: var(--text-tertiary); overflow-wrap: break-word; }
.flag-cell { display: flex; align-items: center; gap: 6px; }
.status-dot-cell { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; white-space: nowrap; }
.action-select { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 12px; color: var(--text-secondary); background: var(--card-bg); white-space: nowrap; }

/* analytics */
.segmented { display: flex; align-items: center; background: var(--gray-chip-bg); border-radius: 10px; padding: 3px; gap: 2px; }
.segmented button { padding: 7px 14px; border-radius: 8px; border: none; background: none; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
.segmented button.selected { background: var(--card-bg); color: var(--text); box-shadow: var(--shadow); }

.bar-list { display: flex; flex-direction: column; gap: 16px; }
.bar-list-row { display: flex; flex-direction: column; gap: 6px; }
.bar-list-head { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; }
.bar-list-track { height: 8px; border-radius: 999px; background: var(--border-soft); overflow: hidden; }
.bar-list-fill { height: 100%; border-radius: 999px; }
.bar-list-scale { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }

.mitre-table { display: flex; flex-direction: column; }
.mitre-head-row, .mitre-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-soft); }
.mitre-head-row, .mitre-row.mitre-head { font-size: 11.5px; font-weight: 600; color: var(--text-tertiary); padding-top: 0; }
.mitre-row:last-child { border-bottom: none; }
.mitre-cell-title { display: flex; align-items: center; gap: 10px; }
.mitre-cell-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--gray-chip-bg); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mitre-cell-main { font-size: 12.5px; font-weight: 700; overflow-wrap: break-word; }
.mitre-cell-sub { font-size: 11px; color: var(--text-tertiary); overflow-wrap: break-word; }

.model-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
@media (max-width: 1000px) { .model-grid { grid-template-columns: 1fr; } }
.model-card { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.model-card-top { display: flex; align-items: center; justify-content: space-between; }
.demo-pill { font-size: 11px; font-weight: 600; color: var(--text-secondary); background: var(--gray-chip-bg); border-radius: 999px; padding: 3px 10px; }
.status-pill { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--green); }
.model-id-row { display: flex; align-items: center; gap: 12px; }
.model-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--green-bg); color: var(--green); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.model-name { font-size: 14px; font-weight: 700; }
.model-desc { font-size: 11.5px; color: var(--text-tertiary); line-height: 1.4; margin-top: 2px; overflow-wrap: break-word; }
.model-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.model-stat-label { font-size: 11px; color: var(--text-tertiary); font-weight: 600; }
.model-stat-value { font-size: 15px; font-weight: 700; margin-top: 2px; }

/* sandbox self-test page */
.model-select-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .model-select-grid { grid-template-columns: 1fr; } }
.model-select-card {
  display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border-radius: 14px;
  border: 1.5px solid var(--border); background: var(--card-bg); text-align: left;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
.model-select-card:hover { border-color: var(--text-tertiary); transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.model-select-card.selected { border-color: var(--blue); background: color-mix(in srgb, var(--blue) 6%, var(--card-bg)); }
.model-select-title-row { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: var(--text); flex-wrap: wrap; }
.model-select-card.selected .model-select-title-row { color: var(--blue); }
.model-select-title-row svg { color: var(--text-tertiary); flex-shrink: 0; }
.model-select-sub { font-size: 12px; color: var(--text-tertiary); }

.warn-banner {
  display: flex; align-items: center; gap: 10px;
  background: color-mix(in srgb, var(--yellow) 16%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--yellow) 45%, var(--border));
  border-radius: 10px; padding: 12px 16px; font-size: 12.5px; color: var(--yellow-text); line-height: 1.5;
}
.warn-banner svg { flex-shrink: 0; }

.textarea-field {
  width: 100%; min-height: 110px; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;
  font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; background: var(--card-bg);
  color: var(--text); resize: vertical;
}
.textarea-field::placeholder { color: var(--text-tertiary); }

.chip-btn {
  padding: 8px 18px; border-radius: 9px; border: 1.5px solid var(--border); background: var(--card-bg);
  font-size: 13px; font-weight: 600; color: var(--text);
}
.chip-btn:hover { border-color: var(--text-tertiary); }
.chip-btn.selected { border-color: var(--blue); color: var(--blue); background: color-mix(in srgb, var(--blue) 7%, var(--card-bg)); }

/* settings page */
.settings-layout { display: grid; grid-template-columns: 250px 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .settings-layout { grid-template-columns: 1fr; } }
.settings-tabs { display: flex; flex-direction: column; gap: 2px; padding: 10px; }
.settings-tab {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
  border: none; background: none; font-size: 13.5px; font-weight: 500; color: var(--text-secondary); text-align: left;
}
.settings-tab:hover { background: var(--border-soft); }
.settings-tab.selected { background: color-mix(in srgb, var(--blue) 8%, var(--card-bg)); color: var(--blue); font-weight: 600; }
.settings-tab svg { flex-shrink: 0; }
.role-locked { opacity: .45; cursor: not-allowed; }

.settings-panel { padding: 26px 28px; display: none; flex-direction: column; gap: 22px; }
.settings-panel.active { display: flex; }
.settings-panel-title { font-size: 16px; font-weight: 700; }
.settings-panel-sub { font-size: 12.5px; color: var(--text-tertiary); line-height: 1.6; margin-top: 4px; }
.settings-divider { height: 1px; background: var(--border-soft); }
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.settings-row-label { font-size: 13.5px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.settings-row-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.info-dot { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid var(--text-tertiary); color: var(--text-tertiary); font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
.info-dot:hover, .info-dot.active { border-color: var(--blue); color: var(--blue); background: color-mix(in srgb, var(--blue) 10%, var(--card-bg)); }

.info-popover {
  position: fixed; z-index: 120; max-width: 260px; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,.18); padding: 10px 12px; font-size: 12.5px;
  line-height: 1.55; color: var(--text); opacity: 0; pointer-events: none; transition: opacity .12s ease;
}
.info-popover.show { opacity: 1; pointer-events: auto; }
.info-popover[hidden] { display: none; }

.field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .field-grid-2 { grid-template-columns: 1fr; } }
.field-block { display: flex; flex-direction: column; gap: 7px; }
.text-input { width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 13.5px; background: var(--card-bg); color: var(--text); font: inherit; }
.text-input::placeholder { color: var(--text-tertiary); }

.toggle-2 { display: inline-flex; border: 1px solid var(--border); border-radius: 9px; overflow: hidden; flex-shrink: 0; }
.toggle-2 button { padding: 8px 18px; font-size: 13px; font-weight: 600; background: var(--card-bg); color: var(--text-secondary); border: none; }
.toggle-2 button.selected { background: var(--blue); color: #fff; }

.switch { position: relative; width: 44px; height: 24px; border-radius: 999px; background: var(--border); transition: background .15s; border: none; flex-shrink: 0; }
.switch.on { background: var(--blue); }
.switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .15s; }
.switch.on .switch-knob { transform: translateX(20px); }

.range-input { width: 100%; accent-color: var(--blue); }

.test-btn-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 700px) { .test-btn-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.test-btn { padding: 14px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--card-bg); font-size: 12.5px; font-weight: 600; color: var(--text); text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
.test-btn:hover { border-color: var(--text-tertiary); }

.fw-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; flex-wrap: wrap; gap: 10px; }
.fw-ip-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fw-ip { font-family: "SFMono-Regular", Consolas, monospace; font-weight: 700; font-size: 13.5px; }
.fw-time { font-size: 11.5px; color: var(--text-tertiary); }
.unblock-link { color: var(--blue); font-size: 12.5px; font-weight: 700; background: none; border: none; display: flex; align-items: center; gap: 6px; }

.btn-danger-outline {
  width: 100%; justify-content: center; background: color-mix(in srgb, var(--red) 8%, var(--card-bg));
  border: 1px solid var(--red-border); color: var(--red-text-mid); font-weight: 700; padding: 12px; border-radius: 10px;
  display: flex; align-items: center; gap: 8px;
}
.btn-danger-outline:hover { background: color-mix(in srgb, var(--red) 13%, var(--card-bg)); }

.mobile-topbar { display: none; }
.sidebar-backdrop { display: none; }

@media (max-width: 900px) {
  .app { flex-direction: column; }
  .mobile-topbar {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid var(--border); background: var(--card-bg);
    position: sticky; top: 0; z-index: 70;
  }
  .mobile-menu-btn {
    display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
    border-radius: 9px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); flex-shrink: 0;
  }
  .mobile-topbar .logo-row { flex-grow: 1; }
  .sidebar {
    position: fixed; top: 0; left: 0; width: 270px; max-width: 82vw; height: 100dvh;
    transform: translateX(-100%); transition: transform .25s ease; z-index: 90;
    box-shadow: 10px 0 28px rgba(0,0,0,.16);
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-backdrop {
    display: block; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 85;
    opacity: 0; pointer-events: none; transition: opacity .2s ease;
  }
  .sidebar-backdrop.show { opacity: 1; pointer-events: auto; }
  .main { padding: 20px 16px 36px; }
  .conn-banner { flex-wrap: wrap; }
  .conn-banner #connRetryBtn { margin-left: 0 !important; }
}

/* ---------- toast / snackbar ---------- */
@keyframes cs-spin { to { transform: rotate(360deg); } }
.toast-container {
  position: fixed; top: 20px; right: 20px; z-index: 9999;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
  max-width: calc(100vw - 32px);
}
.toast {
  pointer-events: auto; min-width: 220px; max-width: 360px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.16); padding: 12px 14px;
  display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text);
  opacity: 0; transform: translateX(20px); transition: opacity .2s ease, transform .2s ease;
}
.toast.show { opacity: 1; transform: translateX(0); }
@media (max-width: 900px) {
  .toast-container { top: 64px; left: 12px; right: 12px; max-width: none; }
  .toast { max-width: none; }
}
.toast-icon {
  width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; margin-top: 1px;
}
.toast.success .toast-icon { background: var(--green-bg); color: var(--green); }
.toast.error .toast-icon { background: var(--red-bg); color: var(--red); }
.toast.info .toast-icon { background: var(--gray-chip-bg); color: var(--text-secondary); }
.toast-msg { flex-grow: 1; line-height: 1.4; overflow-wrap: break-word; min-width: 0; }
/* ---------- LOGIN (two-panel: brand/feature side + signin/signup form) ---------- */
.login-shell {
  min-height: 100dvh; display: flex; background: var(--bg);
}
.login-side-panel {
  flex: 1 1 46%; max-width: 560px; background: linear-gradient(160deg, #0E1416 0%, #101B16 100%);
  color: #F1F4FA; padding: 48px 44px; display: flex; flex-direction: column; justify-content: space-between; gap: 40px;
}
.login-side-content { display: flex; flex-direction: column; gap: 14px; }
.login-brand-row { display: flex; align-items: center; gap: 12px; }
.shield-icon {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: color-mix(in srgb, var(--green) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--green) 35%, transparent);
}
.login-side-tagline { font-size: 14px; color: rgba(241,244,250,.7); line-height: 1.6; max-width: 380px; }
.login-feature-list { display: flex; flex-direction: column; gap: 20px; }
.login-feature-item { display: flex; align-items: flex-start; gap: 14px; }
.login-feature-icon {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--green) 16%, transparent); color: var(--green);
}
.login-feature-text .ft-title { font-size: 13.5px; font-weight: 700; color: #F1F4FA; }
.login-feature-text .ft-desc { font-size: 12px; color: rgba(241,244,250,.6); margin-top: 2px; line-height: 1.5; }
.login-side-footer {
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(241,244,250,.65);
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-dot.dot-online { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 25%, transparent); }

.login-form-panel {
  flex: 1 1 54%; display: flex; align-items: center; justify-content: center; padding: 40px 24px;
}
.login-card {
  width: 100%; max-width: 420px; padding: 36px 34px; display: flex; flex-direction: column; gap: var(--space-5);
}
.login-card.shake { animation: cs-shake .5s ease; }
@keyframes cs-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
.login-brand { display: flex; flex-direction: column; gap: 4px; }
.login-tagline { font-size: 13px; color: var(--text-secondary); }
.login-notice { padding: 10px 14px; border: 1px solid var(--border); }

.auth-tabs {
  display: flex; gap: 4px; background: var(--gray-chip-bg); border-radius: 10px; padding: 3px;
}
.auth-tabs button {
  flex: 1; padding: 8px 12px; border-radius: 8px; border: none; background: none;
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
}
.auth-tabs button.active { background: var(--card-bg); color: var(--text); box-shadow: var(--shadow); }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
.auth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
@media (max-width: 480px) { .auth-grid { grid-template-columns: 1fr; } }

.pw-field { position: relative; display: flex; align-items: center; }
.pw-field .input { padding-right: 76px; }
.pw-toggle-btn {
  position: absolute; right: 6px; padding: 5px 8px !important; font-size: 11.5px !important;
}

.btn-ghost { background: none; border-color: transparent; color: var(--blue); }
.btn-ghost:hover { background: var(--border-soft); }
.btn-block { width: 100%; justify-content: center; }

.tag {
  display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; border-radius: 999px;
  padding: 4px 10px; white-space: nowrap;
}
.tag-outline { border: 1px solid var(--border); color: var(--text-secondary); background: none; }
.tag-accent { background: var(--green-bg); color: var(--green); }
.tag-danger { background: var(--red-bg); color: var(--red-text-mid); }
.tag-neutral { background: var(--gray-chip-bg); color: var(--gray-chip-text); }

.login-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }

@media (max-width: 900px) {
  .login-shell { flex-direction: column; }
  .login-side-panel { padding: 32px 28px; gap: 24px; }
  .login-feature-list { display: none; }
}

.mono { font-family: "SFMono-Regular", Consolas, monospace; }

/* ---------- DASHBOARD ---------- */
.card.elev-sm { box-shadow: var(--shadow); }
.card.elev-lg { box-shadow: 0 16px 40px rgba(0,0,0,.2); }

.dash-header-icon {
  width: 36px; height: 36px; border-radius: 10px; background: var(--green-bg);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.live-pill, .online-pill {
  display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 600;
  color: var(--text-secondary); background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 999px; padding: 5px 12px;
}

.preview-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; border-radius: 10px; padding: 10px 14px; flex-wrap: wrap;
}

.section-subhead {
  font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: var(--text-tertiary); margin: 22px 0 12px;
}

.chart-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.card-title { font-size: 14.5px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.chart-pps-badge {
  font-size: 12.5px; font-weight: 700; color: var(--green); background: var(--green-bg);
  border-radius: 999px; padding: 5px 12px; white-space: nowrap;
}
.chart-body-row { display: flex; gap: 10px; }
.chart-y-axis {
  display: flex; flex-direction: column; justify-content: space-between; height: 148px;
  font-size: 10.5px; color: var(--text-tertiary); flex-shrink: 0; text-align: right; min-width: 24px;
}
.chart-svg-col { flex-grow: 1; min-width: 0; }
.chart-x-axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
.chart-x-caption, .chart-y-caption { font-size: 11px; color: var(--text-tertiary); text-align: center; margin-top: 6px; }

.model-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1100px) { .model-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .model-summary-grid { grid-template-columns: 1fr; } }
.model-summary-card { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.stat-icon-box {
  width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.icon-box-blue { background: var(--gray-chip-bg); color: var(--blue); }
.icon-box-amber { background: var(--orange-bg); color: var(--orange); }
.icon-box-red { background: var(--red-bg); color: var(--red); }
.icon-box-green { background: var(--green-bg); color: var(--green); }
.stat-label { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.admin-section { display: flex; flex-direction: column; }
.overview-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1100px) { .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .overview-grid { grid-template-columns: 1fr; } }
.mini-stat-card { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.mini-stat-value { font-size: 20px; font-weight: 700; }
.mini-stat-label { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.platform-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .platform-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) { .platform-grid { grid-template-columns: 1fr; } }
.platform-card { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.platform-value { font-size: 19px; font-weight: 700; }
.platform-label { font-size: 12px; color: var(--text-secondary); }
.dist-bar-bg { height: 6px; border-radius: 999px; background: var(--border-soft); overflow: hidden; margin-top: 2px; }
.dist-bar-fill { height: 100%; border-radius: 999px; background: var(--blue); }

.status-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.status-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .status-grid-2, .status-grid-3 { grid-template-columns: 1fr; } }
.status-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.status-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.status-card-name { font-size: 13px; font-weight: 700; }
.status-card-meta { font-size: 11.5px; color: var(--text-tertiary); }
.status-badge-online {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--green);
}

.feed-card { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.feed-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.feed-list { display: flex; flex-direction: column; }
.event-item {
  display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 14px;
  padding: 12px 4px; border-bottom: 1px solid var(--border-soft); cursor: pointer; transition: background .12s ease;
}
.event-item:last-child { border-bottom: none; }
.event-item:hover { background: var(--border-soft); }
.event-item.alert { background: color-mix(in srgb, var(--red) 5%, transparent); }
.event-model-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 6px; padding: 4px 9px;
  background: var(--gray-chip-bg); color: var(--gray-chip-text); white-space: nowrap;
}
.event-model-badge.intrusion { background: var(--red-bg); color: var(--red-text-mid); }
.event-model-badge.flow { background: var(--orange-bg); color: var(--orange-text); }
.event-model-badge.sqli { background: color-mix(in srgb, var(--blue) 14%, var(--card-bg)); color: var(--blue); }
.event-details { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.event-attack { font-size: 13.5px; font-weight: 600; overflow-wrap: break-word; }
.event-meta { font-size: 11.5px; color: var(--text-tertiary); }
.event-confidence { font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.event-confidence.confidence-high { color: var(--red); }
.event-confidence.confidence-medium { color: var(--orange); }
.event-confidence.confidence-low { color: var(--green); }
.event-time { font-size: 11.5px; color: var(--text-tertiary); white-space: nowrap; }
@media (max-width: 640px) {
  .event-item { grid-template-columns: auto 1fr; row-gap: 6px; }
  .event-confidence, .event-time { grid-column: 2; justify-self: start; }
}

/* ---------- INFO HELP POPOVER ---------- */
.info-help { position: relative; display: inline-flex; }
.info-help-btn {
  width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid var(--text-tertiary);
  color: var(--text-tertiary); font-size: 10px; font-weight: 700; background: none;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0;
}
.info-help-btn:hover { border-color: var(--blue); color: var(--blue); background: color-mix(in srgb, var(--blue) 10%, var(--card-bg)); }
.info-help-pop {
  position: fixed; z-index: 120; width: 260px; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,.18); padding: 10px 12px; font-size: 12.5px; line-height: 1.55;
}
.info-help-title { font-weight: 700; margin-bottom: 3px; }
.info-help-desc { color: var(--text-secondary); }

/* ---------- THREAT INSPECT MODAL ---------- */
.dialog-backdrop {
  position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5); padding: 20px;
}
.dialog {
  position: relative; width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
  padding: 24px 24px 22px; display: flex; flex-direction: column; gap: 18px;
}
.dialog.blueprint .corner {
  position: absolute; width: 16px; height: 16px; border: 2px solid var(--color-accent); opacity: .6;
}
.corner.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.corner.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.corner.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
.corner.br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.modal-icon {
  width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.modal-icon.icon-alert { background: var(--red-bg); color: var(--red); }
.modal-icon.icon-safe { background: var(--green-bg); color: var(--green); }

.risk-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  border-radius: 12px; padding: 16px 18px;
}
.risk-banner.banner-alert { background: var(--red-bg); border: 1px solid var(--red-border); }
.risk-banner.banner-safe { background: var(--green-bg); border: 1px solid var(--green-border); }
.risk-value { font-size: 26px; font-weight: 700; display: block; }
.banner-alert .risk-value { color: var(--red-text-mid); }
.banner-safe .risk-value { color: var(--green); }
.risk-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .03em; }
.risk-attack-class { font-size: 15px; font-weight: 700; text-align: right; }

.modal-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 480px) { .modal-details-grid { grid-template-columns: 1fr; } }
.detail-box { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 11px; font-weight: 700; letter-spacing: .03em; color: var(--text-tertiary); text-transform: uppercase; }

.action-feedback {
  font-size: 12.5px; color: var(--green); background: var(--green-bg); border: 1px solid var(--green-border);
  border-radius: 8px; padding: 8px 12px; margin-bottom: 10px;
}
.action-buttons-group { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-secondary { background: var(--gray-chip-bg); color: var(--text); }
.btn-secondary:hover { filter: brightness(0.96); }
.btn-danger { background: var(--red); color: #fff; }
.btn-danger:hover { filter: brightness(1.06); }
.btn:disabled { opacity: .6; cursor: not-allowed; }

/* ---------- APP SHELL (sidebar + main) ---------- */
.app-layout { display: flex; min-height: 100dvh; }
.main-content {
  flex-grow: 1; min-width: 0; padding: 26px 34px 48px;
  display: flex; flex-direction: column; gap: 22px;
}

.sidebar-header { display: flex; flex-direction: column; gap: 16px; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.sidebar-logo h1 { font-size: 16px; font-weight: 700; margin: 0; }
.sidebar-logo .version { margin-left: auto; }
.sidebar-logo .shield-icon {
  width: 30px; height: 30px; border-radius: 8px; background: var(--green-bg); color: var(--green);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.defcon-status-bar {
  display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 12px 14px;
  background: var(--green-bg-strong); border: 1px solid var(--green-border);
}
.defcon-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
.defcon-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.defcon-level { font-size: 12.5px; font-weight: 700; color: var(--green-dark); display: flex; align-items: center; gap: 4px; }
.defcon-desc { font-size: 11px; color: var(--green-mid); overflow-wrap: break-word; }
.defcon-badge {
  margin-left: auto; font-size: 10.5px; font-weight: 700; color: #fff; background: var(--red);
  border-radius: 999px; padding: 2px 7px; flex-shrink: 0;
}
.defcon-status-bar.defcon-4, .defcon-status-bar.defcon-3 {
  background: var(--orange-bg-strong); border-color: color-mix(in srgb, var(--orange) 45%, var(--border));
}
.defcon-status-bar.defcon-4 .defcon-pulse-dot, .defcon-status-bar.defcon-3 .defcon-pulse-dot { background: var(--orange); }
.defcon-status-bar.defcon-4 .defcon-level, .defcon-status-bar.defcon-3 .defcon-level { color: var(--orange-text); }
.defcon-status-bar.defcon-4 .defcon-desc, .defcon-status-bar.defcon-3 .defcon-desc { color: var(--orange-text-mid); }
.defcon-status-bar.defcon-2, .defcon-status-bar.defcon-1 {
  background: var(--red-bg-strong); border-color: var(--red-border);
}
.defcon-status-bar.defcon-2 .defcon-pulse-dot, .defcon-status-bar.defcon-1 .defcon-pulse-dot {
  background: var(--red); animation: cs-pulse-dot 1.1s ease-in-out infinite;
}
.defcon-status-bar.defcon-2 .defcon-level, .defcon-status-bar.defcon-1 .defcon-level { color: var(--red-text-strong); }
.defcon-status-bar.defcon-2 .defcon-desc, .defcon-status-bar.defcon-1 .defcon-desc { color: var(--red-text); }

.sidebar-nav { display: flex; flex-direction: column; gap: 2px; flex-grow: 1; margin-top: 4px; }
.nav-link {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
  color: var(--text-secondary); font-size: 14px; font-weight: 500; transition: background .15s ease, color .15s ease;
}
.nav-link:hover { background: var(--border-soft); }
.nav-link.active { background: var(--green-bg); color: var(--green); font-weight: 600; }
.nav-icon { display: flex; flex-shrink: 0; }
.nav-alert-pill {
  margin-left: auto; font-size: 10.5px; font-weight: 700; color: #fff; background: var(--red);
  border-radius: 999px; padding: 1px 6px;
}

.view-switcher { position: relative; }
.view-switcher-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px;
  border: 1px solid var(--border); border-radius: 10px; font-size: 12.5px; color: var(--text-secondary); cursor: pointer;
}
.view-switcher-trigger:hover { border-color: var(--text-tertiary); }
.view-switcher-label { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.view-switcher-menu {
  position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 40;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.14); padding: 6px;
}
.view-switcher-heading { font-size: 11px; font-weight: 700; color: var(--text-tertiary); padding: 6px 8px; }
.view-switcher-option {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px;
  border-radius: 8px; font-size: 13px; color: var(--text); cursor: pointer;
}
.view-switcher-option:hover { background: var(--border-soft); }

.sidebar-footer { display: flex; flex-direction: column; gap: 10px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--sidebar-border); }
.sidebar-user { display: flex; }
.user-info { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: #1F2937; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.username-label { font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { font-size: 11.5px; }
.logout-btn { width: 100%; justify-content: center; }

.loading-spinner { display: flex; align-items: center; justify-content: center; }
.spinner {
  width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--border);
  border-top-color: var(--blue); animation: cs-spin .7s linear infinite;
}

@media (max-width: 900px) {
  .app-layout { flex-direction: column; }
  .main-content { padding: 20px 16px 36px; }
}

/* ---------- INCIDENTS ---------- */
.incidents-stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 700px) { .incidents-stats-grid { grid-template-columns: 1fr; } }
.incidents-stat-card { padding: 16px 18px; cursor: pointer; transition: border-color .15s ease, transform .15s ease; }
.incidents-stat-card:hover { border-color: var(--text-tertiary); transform: translateY(-2px); }
.incidents-stat-card.active-filter { border-color: var(--blue); background: color-mix(in srgb, var(--blue) 6%, var(--card-bg)); }

.incidents-main-layout { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 1050px) { .incidents-main-layout { grid-template-columns: 1fr; } }
.incidents-queue-card { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.audit-card { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }

.seg { display: flex; align-items: center; gap: 2px; background: var(--gray-chip-bg); border-radius: 9px; padding: 3px; flex-wrap: wrap; }
.seg-opt {
  position: relative; display: flex; align-items: center; padding: 6px 12px; border-radius: 7px;
  font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer;
}
.seg-opt input { position: absolute; opacity: 0; pointer-events: none; }
.seg-opt:has(input:checked) { background: var(--card-bg); color: var(--text); box-shadow: var(--shadow); }

.empty-icon { color: var(--text-tertiary); margin-bottom: 4px; }

.incident-row-list { display: flex; flex-direction: column; gap: 4px; }
.incident-row {
  position: relative; display: grid; grid-template-columns: auto 1.1fr 1fr 1fr auto auto auto;
  align-items: center; gap: 16px; padding: 12px 14px 12px 18px; border-radius: 10px; cursor: pointer;
  transition: background .12s ease;
}
.incident-row:hover { background: var(--border-soft); }
.incident-row-strip { position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; border-radius: 999px; }
.incident-view-link { font-size: 11.5px; font-weight: 600; color: var(--blue); cursor: pointer; white-space: nowrap; }
@media (max-width: 900px) {
  .incident-row { grid-template-columns: 1fr 1fr; row-gap: 8px; padding-left: 16px; }
}

.audit-list { display: flex; flex-direction: column; }
.audit-item { padding: 12px 0; border-bottom: 1px solid var(--border-soft); display: flex; flex-direction: column; gap: 3px; }
.audit-item:last-child { border-bottom: none; }
.audit-meta { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; color: var(--text-tertiary); }
.audit-action { font-size: 13px; font-weight: 600; }
.audit-target { font-size: 11.5px; color: var(--text-secondary); overflow-wrap: break-word; }

/* ---------- LOGS ---------- */
.alert-row { background: color-mix(in srgb, var(--red) 5%, transparent); }
.tag-warning { background: var(--orange-bg); color: var(--orange-text-mid); }
.logs-filters-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
@media (max-width: 800px) { .logs-filters-grid { grid-template-columns: 1fr; } }

/* ---------- SETTINGS ---------- */
.settings-nav {
  display: flex; flex-direction: column; gap: 2px; padding: 10px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow);
  align-self: start;
}
.settings-nav a {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
  font-size: 13.5px; font-weight: 500; color: var(--text-secondary);
}
.settings-nav a:hover { background: var(--border-soft); }
.settings-nav a[aria-current="page"] { background: color-mix(in srgb, var(--blue) 8%, var(--card-bg)); color: var(--blue); font-weight: 600; }
.settings-content {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow);
  padding: 26px 28px; display: flex; flex-direction: column; gap: 26px;
}
.settings-row-desc { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.fw-row + .fw-row { margin-top: 8px; }

/* ---------- MANUAL TEST / SANDBOX ---------- */
.preset-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.features-grid-scroll {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;
  max-height: 320px; overflow-y: auto; padding: 4px 2px;
}
.features-grid-scroll label { font-size: 11px; color: var(--text-tertiary); display: block; margin-bottom: 4px; overflow-wrap: break-word; }
.result-card { padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
.result-card.alert-result { border-color: var(--red-border); background: var(--red-bg); }
.result-card.safe-result { border-color: var(--green-border); background: var(--green-bg); }
.result-header-row { display: flex; align-items: center; gap: 14px; }
.prob-row { display: flex; align-items: center; gap: 12px; }
.prob-bar-bg { flex-grow: 1; height: 8px; border-radius: 999px; background: var(--border-soft); overflow: hidden; }
.prob-bar-fill { height: 100%; border-radius: 999px; background: var(--blue); }

```

---
