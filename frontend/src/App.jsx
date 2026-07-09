import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Logs from './pages/Logs'
import Test from './pages/Test'

export default function App() {
  const location = useLocation()

  return (
    <div className="app-layout">
      {/* === Sidebar === */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="shield-icon">🛡️</div>
            <div>
              <h1>CyberShield</h1>
            </div>
            <span className="version">v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            <span className="nav-icon">📡</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/logs"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            Logs
          </NavLink>

          <NavLink
            to="/test"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">🧪</span>
            Manual Test
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot"></span>
            System Online
          </div>
        </div>
      </aside>

      {/* === Main Content === */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/test" element={<Test />} />
        </Routes>
      </main>
    </div>
  )
}
