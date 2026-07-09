import { useEffect, useState, useRef } from 'react'

export default function Dashboard() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    alerts: 0,
    intrusion: 0,
    flow: 0,
    sqli: 0,
  })
  const wsRef = useRef(null)

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/feed`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Auto-reconnect หลัง 3 วินาที
      setTimeout(connectWebSocket, 3000)
    }
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'ping') return

      // เพิ่ม event ใหม่ (เก็บไว้สูงสุด 100 รายการ)
      setEvents((prev) => [data, ...prev].slice(0, 100))

      // อัปเดต stats
      setStats((prev) => ({
        total: prev.total + 1,
        alerts: prev.alerts + (data.is_alert ? 1 : 0),
        intrusion: prev.intrusion + (data.model_name === 'intrusion' ? 1 : 0),
        flow: prev.flow + (data.model_name === 'flow' ? 1 : 0),
        sqli: prev.sqli + (data.model_name === 'sqli' ? 1 : 0),
      }))
    }
  }

  function getConfidenceClass(confidence) {
    if (confidence >= 0.85) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  function formatTime(timestamp) {
    try {
      const d = new Date(timestamp)
      return d.toLocaleTimeString('th-TH', { hour12: false })
    } catch {
      return timestamp
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>🛡️ Live Detection Feed</h1>
        <p>Real-time cyber attack detection powered by 3 LSTM models</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card cyan">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{stats.alerts}</div>
          <div className="stat-label">Alerts</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🔐</div>
          <div className="stat-value">{stats.intrusion}</div>
          <div className="stat-label">Intrusion (R2L/U2R)</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">🌊</div>
          <div className="stat-value">{stats.flow}</div>
          <div className="stat-label">Flow (DDoS/DoS)</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">💉</div>
          <div className="stat-value">{stats.sqli}</div>
          <div className="stat-label">SQL Injection</div>
        </div>
      </div>

      {/* Event Feed */}
      <div className="feed-container">
        <div className="feed-header">
          <h2>
            <span>Detection Events</span>
          </h2>
          <div className="live-badge">
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
        </div>

        <div className="feed-list">
          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📡</div>
              <p>Waiting for detection events...</p>
              <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                {connected
                  ? 'Connected to WebSocket feed. Events will appear here in real-time.'
                  : 'Connecting to WebSocket feed...'}
              </p>
            </div>
          ) : (
            events.map((ev, i) => (
              <div
                key={`${ev.timestamp}-${i}`}
                className={`event-item ${ev.is_alert ? 'alert' : ''}`}
              >
                <span className={`event-model-badge ${ev.model_name}`}>
                  {ev.model_name}
                </span>

                <div className="event-details">
                  <span className="event-attack">{ev.attack_class}</span>
                  <span className="event-meta">
                    {ev.source_ip}
                  </span>
                </div>

                <span className={`event-confidence ${getConfidenceClass(ev.confidence)}`}>
                  {(ev.confidence * 100).toFixed(1)}%
                </span>

                <span className="event-time">
                  {formatTime(ev.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
