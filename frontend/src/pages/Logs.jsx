import { useEffect, useState } from 'react'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({
    model_name: '',
    attack_class: '',
    alerts_only: false,
  })
  const [sortField, setSortField] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')

  const PAGE_SIZE = 50

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      })
      if (filters.model_name) params.set('model_name', filters.model_name)
      if (filters.attack_class) params.set('attack_class', filters.attack_class)
      if (filters.alerts_only) params.set('alerts_only', 'true')

      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      if (data.ok) {
        setLogs(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function getSortedLogs() {
    return [...logs].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  function getConfidenceClass(confidence) {
    if (confidence >= 0.85) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  function formatTime(timestamp) {
    try {
      return new Date(timestamp).toLocaleString('th-TH', { hour12: false })
    } catch {
      return timestamp
    }
  }

  const sortIndicator = (field) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div>
      <div className="page-header">
        <h1>📋 Event Logs</h1>
        <p>Historical prediction events with filtering and search</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          id="filter-model"
          className="filter-select"
          value={filters.model_name}
          onChange={(e) => {
            setFilters({ ...filters, model_name: e.target.value })
            setPage(0)
          }}
        >
          <option value="">All Models</option>
          <option value="intrusion">Intrusion Model</option>
          <option value="flow">Flow Model</option>
          <option value="sqli">Injection Model</option>
        </select>

        <select
          id="filter-attack"
          className="filter-select"
          value={filters.attack_class}
          onChange={(e) => {
            setFilters({ ...filters, attack_class: e.target.value })
            setPage(0)
          }}
        >
          <option value="">All Attack Classes</option>
          <option value="Normal">Normal</option>
          <option value="R2L">R2L</option>
          <option value="U2R">U2R</option>
          <option value="DDoS">DDoS</option>
          <option value="DoS">DoS</option>
          <option value="PortScan">PortScan</option>
          <option value="BruteForce">BruteForce</option>
          <option value="SQL Injection">SQL Injection</option>
        </select>

        <label className="filter-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <input
            id="filter-alerts-only"
            type="checkbox"
            checked={filters.alerts_only}
            onChange={(e) => {
              setFilters({ ...filters, alerts_only: e.target.checked })
              setPage(0)
            }}
          />
          Alerts Only
        </label>

        <button id="refresh-logs" className="btn btn-ghost" onClick={fetchLogs}>
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div className="data-table-container">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No events found</p>
            <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
              Try adjusting your filters or wait for new events
            </p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')}>
                    ID{sortIndicator('id')}
                  </th>
                  <th onClick={() => handleSort('model_name')}>
                    Model{sortIndicator('model_name')}
                  </th>
                  <th onClick={() => handleSort('attack_class')}>
                    Attack Class{sortIndicator('attack_class')}
                  </th>
                  <th onClick={() => handleSort('confidence')}>
                    Confidence{sortIndicator('confidence')}
                  </th>
                  <th onClick={() => handleSort('source_ip')}>
                    Source IP{sortIndicator('source_ip')}
                  </th>
                  <th onClick={() => handleSort('timestamp')}>
                    Timestamp{sortIndicator('timestamp')}
                  </th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {getSortedLogs().map((log) => (
                  <tr key={log.id} className={log.is_alert ? 'alert-row' : ''}>
                    <td>{log.id}</td>
                    <td>
                      <span className={`event-model-badge ${log.model_name}`}>
                        {log.model_name}
                      </span>
                    </td>
                    <td>{log.attack_class}</td>
                    <td>
                      <span className={getConfidenceClass(log.confidence)}>
                        {(log.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {log.source_ip}
                    </td>
                    <td>{formatTime(log.timestamp)}</td>
                    <td>
                      {log.is_alert ? (
                        <span style={{ color: 'var(--red)' }}>🚨</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                ← Prev
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                Page {page + 1}
              </span>
              <button
                className="page-btn"
                onClick={() => setPage(page + 1)}
                disabled={logs.length < PAGE_SIZE}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
