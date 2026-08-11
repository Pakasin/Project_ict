import { useEffect, useState, useRef } from 'react'
import ThreatInspectModal from '../components/ThreatInspectModal'
import InfoHelp from '../components/InfoHelp'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

const MODEL_SUMMARY_ICONS = {
  total: { path: "M1 9h4l2-6 2 10 2-7 2 3h2", cls: 'icon-box-blue' },
  alerts: { path: "M8 1.3L15 13H1L8 1.3ZM8 5.5v3.5M8 11v.01", cls: 'icon-box-amber' },
  intrusion: { path: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", cls: 'icon-box-red', viewBox: '0 0 20 24' },
  flow: { path: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4", cls: 'icon-box-red' },
  sqli: { path: "M12 3 4.5 12c0 5 3.5 8.5 7.5 9 4-1.5 7.5-4.5 7.5-9L19.5 3zm-4 9 3 3 5-5", cls: 'icon-box-green' },
}

function StatIcon({ path, viewBox = '0 0 16 16' }) {
  return (
    <svg width="16" height="16" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function Dashboard({ activeAlertsCount = 0 }) {
  const { t, isGeneralView, previewAsGeneral, setPreviewAsGeneral } = useApp()
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [stats, setStats] = useState({ total: 0, alerts: 0, intrusion: 0, flow: 0, sqli: 0 })
  const [ppsHistory, setPpsHistory] = useState(() => Array(26).fill(0))
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const wsRef = useRef(null)
  // Running count of messages received, independent of the capped/rolling
  // `events` list — used to derive a real per-interval rate instead of a
  // monotonic (and thus visually flat) cumulative count.
  const msgCountRef = useRef(0)
  const lastPpsCountRef = useRef(0)

  useEffect(() => {
    connectWebSocket()
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.max(0, msgCountRef.current - lastPpsCountRef.current)
      lastPpsCountRef.current = msgCountRef.current
      setPpsHistory((prev) => [...prev.slice(1), delta])
    }, 2000)
    return () => clearInterval(interval)
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

        msgCountRef.current += 1
        setEvents((prev) => [data, ...prev].slice(0, 100))
        setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour12: false }))
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

  // Build the SVG line/area path for the packet-speed chart from ppsHistory.
  const chartW = 640
  const chartH = 148
  // Scale to the actual peak in view (with headroom) rather than a fixed
  // floor — a hardcoded minimum (e.g. 10) swamps small real fluctuations
  // and made the line render as a flat baseline when traffic was low.
  const peakPps = Math.max(...ppsHistory)
  const maxVal = Math.max(peakPps * 1.25, 4)
  const stepX = chartW / (ppsHistory.length - 1)
  const points = ppsHistory.map((v, i) => [i * stepX, chartH - (v / maxVal) * chartH])
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${chartW},${chartH} L0,${chartH} Z`
  const [lastX, lastY] = points[points.length - 1]
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: chartH * f, label: Math.round(maxVal * (1 - f)) }))
  const currentPps = ppsHistory[ppsHistory.length - 1]

  const modelSummary = [
    { key: 'total', value: stats.total, label: t.dash.totalPackets, help: null },
    { key: 'alerts', value: stats.alerts, label: t.dash.highConfidence, help: 'highConfidence' },
    { key: 'intrusion', value: stats.intrusion, label: t.dash.r2lu2r, help: 'r2lu2r' },
    { key: 'flow', value: stats.flow, label: t.dash.ddos, help: 'ddos' },
    { key: 'sqli', value: stats.sqli, label: t.dash.sqli, help: 'sqli' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div className="dash-header-icon">
            <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" /><circle cx="9" cy="9" r="2" fill="var(--color-accent)" /></svg>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{t.dash.title}</h2>
            <p className="text-muted" style={{ margin: 0 }}>{t.dash.subtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="live-pill"><span className="status-dot dot-online" style={{ background: 'var(--color-accent)' }}></span>{t.dash.live}</span>
          <span className="text-muted" style={{ fontSize: 11.5 }}>{t.dash.lastUpdated} {lastUpdated}</span>
          <span className="online-pill"><span className="status-dot dot-online"></span>{connected ? t.dash.online : t.dash.reconnecting}</span>
        </div>
      </div>

      {previewAsGeneral && (
        <div className="tag tag-outline preview-banner">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path></svg>
            {t.dash.previewingGeneral}
          </span>
          <button className="btn btn-ghost" onClick={() => setPreviewAsGeneral(false)}>{t.dash.returnToAdmin}</button>
        </div>
      )}

      <div className="card elev-sm chart-card">
        <div className="chart-card-head">
          <div>
            <div className="card-title">{t.dash.packetSpeedTitle} <InfoHelp id="packetSpeed" /></div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{t.dash.packetChartDesc}</div>
          </div>
          <div className="chart-pps-badge">{currentPps} pps</div>
        </div>
        <div className="chart-body-row">
          <div className="chart-y-axis">
            {gridLines.map((g, i) => <span key={i}>{g.label}</span>)}
          </div>
          <div className="chart-svg-col">
            <svg width="100%" height="148" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="pktGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {gridLines.map((g, i) => <line key={i} x1="0" y1={g.y} x2={chartW} y2={g.y} stroke="var(--color-divider)" strokeWidth="1" />)}
              <path d={areaPath} fill="url(#pktGrad)" stroke="none" style={{ transition: 'd 0.4s ease-out' }} />
              <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <circle cx={lastX} cy={lastY} r="6" fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth="2" />
              <circle cx={lastX} cy={lastY} r="3" fill="var(--color-accent)" />
            </svg>
            <div className="chart-x-axis"><span>-52s</span><span>-26s</span><span>{t.dash.online === 'Online' ? 'now' : 'ตอนนี้'}</span></div>
            <div className="chart-x-caption">{t.dash.xAxisLabel}</div>
          </div>
        </div>
        <div className="chart-y-caption">{t.dash.yAxisLabel}</div>
      </div>

      <div>
        <h3 className="section-subhead" style={{ marginBottom: 12, textTransform: 'none' }}>{t.dash.modelSummary}</h3>
        <div className="model-summary-grid">
          {modelSummary.map((c) => {
            const icon = MODEL_SUMMARY_ICONS[c.key]
            return (
              <div key={c.key} className="card elev-sm model-summary-card">
                <div className={`stat-icon-box ${icon.cls}`}><StatIcon path={icon.path} viewBox={icon.viewBox} /></div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label} {c.help && <InfoHelp id={c.help} />}</div>
              </div>
            )
          })}
        </div>
      </div>

      {!isGeneralView && (
        <div className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{t.dash.adminPanel}</h3>
            <span className="tag tag-accent">{t.dash.adminOnly}</span>
          </div>

          <h4 className="section-subhead">{t.dash.overview}</h4>
          <div className="overview-grid">
            <div className="card elev-sm mini-stat-card">
              <div className="stat-icon-box icon-box-amber"><StatIcon path="M2 8V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1M2 8h20l-2 11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" viewBox="0 0 24 24" /></div>
              <div className="mini-stat-value">7</div>
              <div className="mini-stat-label">{t.dash.openIncidents} <InfoHelp id="incidents" /></div>
            </div>
            <div className="card elev-sm mini-stat-card">
              <div className="stat-icon-box icon-box-red"><StatIcon path="m10.3 3.9 8.7 15A1.8 1.8 0 0 1 17.5 21h-15a1.8 1.8 0 0 1-1.6-2.7L9 3.9a1.8 1.8 0 0 1 3 0ZM12 9v4M12 16.5v.01" viewBox="0 0 24 24" /></div>
              <div className="mini-stat-value" style={{ color: 'var(--color-danger)' }}>3</div>
              <div className="mini-stat-label">{t.dash.criticalAlerts} <InfoHelp id="critical" /></div>
            </div>
            <div className="card elev-sm mini-stat-card">
              <div className="stat-icon-box icon-box-green"><StatIcon path="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" viewBox="0 0 24 24" /></div>
              <div className="mini-stat-value">12</div>
              <div className="mini-stat-label">{t.dash.resolvedIncidents}</div>
            </div>
            <div className="card elev-sm mini-stat-card">
              <div className="stat-icon-box icon-box-blue"><StatIcon path="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" viewBox="0 0 24 24" /></div>
              <div className="mini-stat-value">3/3</div>
              <div className="mini-stat-label">{t.dash.modelsOnline}</div>
            </div>
            <div className="card elev-sm mini-stat-card">
              <div className="stat-icon-box icon-box-green"><StatIcon path="M12 3l9 4v5c0 5-3.5 8.5-9 10-5.5-1.5-9-5-9-10V7l9-4Zm-3 9 2 2 4-4" viewBox="0 0 24 24" /></div>
              <div className="mini-stat-value" style={{ color: 'var(--color-success)', fontSize: 22 }}>{t.dash.online}</div>
              <div className="mini-stat-label">{t.dash.systemStatus}</div>
            </div>
          </div>

          <h4 className="section-subhead">{t.dash.platformMonitoring} <span className="tag tag-neutral">{t.dash.demoData}</span> <InfoHelp id="platformPerf" /></h4>
          <div className="platform-grid">
            <div className="card elev-sm platform-card">
              <div className="platform-value">34%</div>
              <div className="platform-label">{t.dash.cpu}</div>
              <div className="dist-bar-bg"><div className="dist-bar-fill" style={{ width: '34%' }} /></div>
            </div>
            <div className="card elev-sm platform-card">
              <div className="platform-value">58%</div>
              <div className="platform-label">{t.dash.memory}</div>
              <div className="dist-bar-bg"><div className="dist-bar-fill" style={{ width: '58%' }} /></div>
            </div>
            <div className="card elev-sm platform-card">
              <div className="platform-value" style={{ color: 'var(--color-success)' }}>{t.dash.online}</div>
              <div className="platform-label">{t.dash.database}</div>
            </div>
            <div className="card elev-sm platform-card">
              <div className="platform-value">14,502</div>
              <div className="platform-label">{t.dash.apiRequests}</div>
            </div>
            <div className="card elev-sm platform-card">
              <div className="platform-value">71%</div>
              <div className="platform-label">{t.dash.storage}</div>
              <div className="dist-bar-bg"><div className="dist-bar-fill" style={{ width: '71%' }} /></div>
            </div>
            <div className="card elev-sm platform-card">
              <div className="platform-value">128 ms</div>
              <div className="platform-label">{t.dash.responseTime} <InfoHelp id="respTime" /></div>
            </div>
          </div>

          <h4 className="section-subhead">{t.dash.sensorStatus}</h4>
          <div className="status-grid-2">
            <div className="card elev-sm status-card">
              <div className="status-card-head">
                <span className="status-card-name">{t.dash.networkSensor}</span>
                <span className="status-badge-online"><span className="status-dot dot-online"></span>{t.dash.online}</span>
              </div>
              <div className="status-card-meta">Last heartbeat: 2s ago · 14,802 flows today</div>
            </div>
            <div className="card elev-sm status-card">
              <div className="status-card-head">
                <span className="status-card-name">{t.dash.httpSensor}</span>
                <span className="status-badge-online"><span className="status-dot dot-online"></span>{t.dash.online}</span>
              </div>
              <div className="status-card-meta">Last heartbeat: 4s ago · 3,402 requests today</div>
            </div>
          </div>

          <h4 className="section-subhead">{t.dash.lstmModels}</h4>
          <div className="status-grid-3">
            <div className="card elev-sm status-card">
              <div className="status-card-head">
                <span className="status-card-name">Intrusion LSTM (NSL-KDD)</span>
                <span className="status-badge-online">{t.dash.online}</span>
              </div>
              <div className="status-card-meta">NSL-KDD · R2L, U2R</div>
            </div>
            <div className="card elev-sm status-card">
              <div className="status-card-head">
                <span className="status-card-name">Flow LSTM (CSE-CIC-IDS2018)</span>
                <span className="status-badge-online">{t.dash.online}</span>
              </div>
              <div className="status-card-meta">CSE-CIC-IDS2018 · DoS, DDoS, BruteForce</div>
            </div>
            <div className="card elev-sm status-card">
              <div className="status-card-head">
                <span className="status-card-name">Injection LSTM (SQLi)</span>
                <span className="status-badge-online">{t.dash.online}</span>
              </div>
              <div className="status-card-meta">SQLi Dataset · Normal, SQL Injection</div>
            </div>
          </div>
        </div>
      )}

      <div className="card elev-sm feed-card">
        <div className="feed-header-row">
          <div className="card-title">{t.dash.livePrediction}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{t.dash.clickRow}</div>
        </div>

        <div className="feed-list">
          {events.length === 0 ? (
            <div className="empty-state">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-success-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="22" height="26" viewBox="0 0 20 24"><path d="M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinejoin="round"></path></svg>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{t.dash.noIncidentsNow}</div>
              <div className="text-muted" style={{ fontSize: 12.5 }}>{t.dash.allSensorsNormal}</div>
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
