import { useEffect, useState, useRef } from 'react'
import { CyberRadar, ActivitySparkline } from '../components/LiveRadar'
import ThreatInspectModal from '../components/ThreatInspectModal'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

const STAT_ICONS = {
  packets: "M3 12h4l2-7 4 14 2-7h6",
  alerts: "M12 3l9 16H3L12 3zM12 10v4M12 16.5v.1",
  intrusion: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  flow: "M4 6h16M4 6l4 6-4 6M20 18l-4-6 4-6",
  sqli: "M4 6l6 6-6 6M14 18h6"
}

export default function Dashboard({ activeAlertsCount = 0 }) {
  const { t } = useApp()
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [stats, setStats] = useState({ total: 0, alerts: 0, intrusion: 0, flow: 0, sqli: 0 })
  const wsRef = useRef(null)

  useEffect(() => {
    connectWebSocket()
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/feed`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => { setConnected(false); setTimeout(connectWebSocket, 3000) }
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ping') return

        setEvents((prev) => [data, ...prev].slice(0, 100))
        setStats((prev) => ({
          total: prev.total + 1,
          alerts: prev.alerts + (data.is_alert ? 1 : 0),
          intrusion: prev.intrusion + (data.model_name === 'intrusion' ? 1 : 0),
          flow: prev.flow + (data.model_name === 'flow' ? 1 : 0),
          sqli: prev.sqli + (data.model_name === 'sqli' ? 1 : 0),
        }))
      } catch (err) {
        console.warn('WS error:', err)
      }
    }
  }

  function getConfidenceClass(confidence) {
    if (confidence >= 0.85) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleTimeString('th-TH', { hour12: false }) } catch { return timestamp }
  }

  const statCards = [
    { key: 'packets', icon: STAT_ICONS.packets, value: stats.total, label: t.dash.statPacketBuffer },
    { key: 'alerts', icon: STAT_ICONS.alerts, value: stats.alerts, label: t.incidents.statOpen },
    { key: 'intrusion', icon: STAT_ICONS.intrusion, value: stats.intrusion, label: 'Intrusion (R2L/U2R)' },
    { key: 'flow', icon: STAT_ICONS.flow, value: stats.flow, label: 'Flow (DDoS/DoS)' },
    { key: 'sqli', icon: STAT_ICONS.sqli, value: stats.sqli, label: 'SQL Injection' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>{t.dash.title}</h2>
          <p className="text-muted">{t.dash.subtitle}</p>
        </div>
        <div className="tag tag-outline">
          <span className={`status-dot ${connected ? 'dot-online' : 'dot-offline'}`}></span>
          &nbsp;{connected ? t.dash.online : t.dash.reconnecting}
        </div>
      </div>

      <div className="dashboard-hero-grid">
        <div className="card blueprint elev-sm radar-card">
          <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
          <CyberRadar activeAlertsCount={activeAlertsCount || stats.alerts} />
          <div className="tag tag-neutral" style={{ justifyContent: 'center' }}>{t.dash.radarStatus}</div>
        </div>

        <div className="card blueprint elev-sm velocity-card">
          <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">{t.dash.velocityTitle}</div>
            <div className="tag tag-accent">{events.length ? Math.min(events.length, 40) : 0} {t.dash.pktsUnit}</div>
          </div>
          <ActivitySparkline events={events} />
          <div className="velocity-stats">
            <div><span className="mini-label">{t.dash.statPacketBuffer}</span><span className="mini-val mono">{events.length} / 100</span></div>
            <div><span className="mini-label">{t.dash.statModels}</span><span className="mini-val mono">3 / 3 {t.dash.active}</span></div>
            <div><span className="mini-label">{t.dash.statSiren}</span><span className="mini-val mono">{connected ? t.settings.on : t.settings.off}</span></div>
          </div>
        </div>
      </div>

      <div className="dash-stats-grid">
        {statCards.map((c) => (
          <div key={c.key} className="card blueprint elev-sm dash-stat-card">
            <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={c.icon}></path></svg>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card blueprint elev-sm feed-card">
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
        <div className="feed-header-row">
          <div className="card-title">{t.dash.streamTitle}</div>
          <div className="tag tag-neutral">{t.dash.streamHint}</div>
        </div>

        <div className="feed-list">
          {events.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
              <div style={{ fontSize: 14 }}>{t.dash.emptyTitle}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{t.dash.emptySub}</div>
            </div>
          ) : (
            events.map((ev, i) => (
              <div
                key={`${ev.timestamp}-${i}`}
                className={`event-item ${ev.is_alert ? 'alert' : ''}`}
                onClick={() => { playSound('click'); setSelectedEvent(ev) }}
              >
                <span className={`event-model-badge ${ev.model_name}`}>{ev.model_name}</span>
                <div className="event-details">
                  <span className="event-attack">{ev.attack_class}</span>
                  <span className="event-meta mono">{ev.source_ip}</span>
                </div>
                <span className={`event-confidence ${getConfidenceClass(ev.confidence)}`}>{(ev.confidence * 100).toFixed(1)}%</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                  <span className="event-time">{formatTime(ev.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
