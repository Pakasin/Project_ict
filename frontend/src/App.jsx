import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Logs from './pages/Logs'
import Test from './pages/Test'
import Login from './pages/Login'
import Analytics from './pages/Analytics'
import Incidents from './pages/Incidents'
import Settings from './pages/Settings'
import { playSound } from './utils/sound'
import { AppProvider, useApp } from './context/AppContext'

const ICONS = {
  dashboard: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  analytics: "M5 20V10M12 20V4M19 20v-6",
  incidents: "M12 3l9 16H3L12 3zM12 10v4M12 17h.01",
  logs: "M5 3h14v18H5V3zM8 8h8M8 12h8M8 16h5",
  manualTest: "M3 4h18v16H3V4zM7 9l3 3-3 3M12 15h4",
  settings: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2",
}

function Icon({ d, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function AppShell({ auth, onLogout }) {
  const { t, previewAsGeneral, setPreviewAsGeneral, isAdminActual } = useApp()
  const [defcon, setDefcon] = useState(5)
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const wsRef = useRef(null)

  useEffect(() => {
    connectGlobalWebSocket()
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  function connectGlobalWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/feed`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ping') return

        if (data.is_alert || data.confidence >= 0.82) {
          setActiveAlertsCount((prev) => Math.min(prev + 1, 99))
          if (data.confidence >= 0.92) {
            setDefcon(2)
            playSound('critical')
          } else {
            setDefcon(3)
            playSound('alert')
          }
          setTimeout(() => {
            setActiveAlertsCount((prev) => Math.max(0, prev - 1))
            setDefcon((d) => (d === 2 ? 3 : d === 3 ? 4 : 5))
          }, 15000)
        }
      } catch (err) {
        console.warn('WS parse error:', err)
      }
    }

    ws.onclose = () => { setTimeout(connectGlobalWebSocket, 4000) }
  }

  const defconDesc = defcon === 5 ? t.dash.radarStatus.split(': ')[1] || t.defconSub
    : defcon === 4 ? t.defconSub
    : defcon === 3 ? t.incidents.statOpen
    : t.incidents.statOpen

  const roleColor = isAdminActual ? 'var(--color-danger)' : 'var(--color-accent)'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="shield-icon"><Icon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" size={22} /></span>
            <h1>{t.brand}</h1>
            <span className="tag tag-neutral version">v2.0</span>
          </div>

          <div className={`defcon-status-bar defcon-${defcon}`}>
            <span className="defcon-pulse-dot"></span>
            <div className="defcon-text">
              <span className="defcon-level mono">DEFCON {defcon}</span>
              <span className="defcon-desc">
                {defcon === 5 ? t.defconSub :
                 defcon === 4 ? t.defconSub :
                 defcon === 3 ? t.incidents.statOpen : t.incidents.statOpen}
              </span>
            </div>
            {activeAlertsCount > 0 && <span className="defcon-badge mono">{activeAlertsCount}</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')} end>
            <span className="nav-icon"><Icon d={ICONS.dashboard} /></span>{t.nav.dashboard}
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')}>
            <span className="nav-icon"><Icon d={ICONS.analytics} /></span>{t.nav.analytics}
          </NavLink>
          <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')}>
            <span className="nav-icon"><Icon d={ICONS.incidents} /></span>{t.nav.incidents}
            {activeAlertsCount > 0 && <span className="nav-alert-pill mono">{activeAlertsCount}</span>}
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')}>
            <span className="nav-icon"><Icon d={ICONS.logs} /></span>{t.nav.logs}
          </NavLink>
          <NavLink to="/test" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')}>
            <span className="nav-icon"><Icon d={ICONS.manualTest} /></span>{t.nav.manualTest}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => playSound('click')}>
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
          <div className="sidebar-status">
            <span className="status-dot dot-online"></span>
            AI Neural Engine Online
          </div>
        </div>
      </aside>

      <main className="main-content">
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

export default function App() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState({ checked: false, user: null, role: null, email: null })

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    try {
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

      const res = await fetch('/api/me')
      const data = await res.json()
      if (data.ok) {
        setAuth({
          checked: true,
          user: data.username,
          role: 'SOC Lead Operator',
          email: `${data.username}@cybershield.th`,
          profile: { name: 'System', lastname: 'Admin', phone: '-' }
        })
      } else {
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

function ThemedRoot({ children }) {
  const { theme } = useApp()
  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {children}
    </div>
  )
}
