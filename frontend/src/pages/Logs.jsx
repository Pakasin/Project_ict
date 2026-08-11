import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThreatInspectModal from '../components/ThreatInspectModal'
import InfoHelp from '../components/InfoHelp'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

export default function Logs() {
  const { t } = useApp()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [filters, setFilters] = useState({ model_name: '', attack_class: '', alerts_only: false })
  const [sortField, setSortField] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')

  const PAGE_SIZE = 50

  useEffect(() => { fetchLogs() }, [page, filters])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE.toString(), offset: (page * PAGE_SIZE).toString() })
      if (filters.model_name) params.set('model_name', filters.model_name)
      if (filters.attack_class) params.set('attack_class', filters.attack_class)
      if (filters.alerts_only) params.set('alerts_only', 'true')

      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      if (data.ok) setLogs(data.data)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSort(field) {
    playSound('click')
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  function getFilteredAndSortedLogs() {
    let result = [...logs]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((item) =>
        (item.source_ip && item.source_ip.toLowerCase().includes(q)) ||
        (item.attack_class && item.attack_class.toLowerCase().includes(q)) ||
        (item.model_name && item.model_name.toLowerCase().includes(q)) ||
        (item.id && item.id.toString().includes(q))
      )
    }
    return result.sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  function handleExportCSV() {
    playSound('click')
    const sorted = getFilteredAndSortedLogs()
    if (sorted.length === 0) return
    const headers = ['id', 'model_name', 'attack_class', 'confidence', 'source_ip', 'timestamp', 'is_alert']
    const csvRows = [headers.join(','), ...sorted.map((row) => headers.map((f) => JSON.stringify(row[f] ?? '')).join(','))].join('\n')
    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `cybershield_logs_page_${page + 1}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    playSound('success')
  }

  function handleExportJSON() {
    playSound('click')
    const sorted = getFilteredAndSortedLogs()
    if (sorted.length === 0) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sorted, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `cybershield_logs_page_${page + 1}.json`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    playSound('success')
  }

  function getConfidenceClass(confidence) {
    if (confidence >= 0.85) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleString('th-TH', { hour12: false }) } catch { return timestamp }
  }

  function clearLogFilters() {
    playSound('click')
    setSearchQuery('')
    setFilters({ model_name: '', attack_class: '', alerts_only: false })
    setPage(0)
  }

  function severityClass(confidence) {
    if (confidence >= 0.85) return 'tag-danger'
    if (confidence >= 0.6) return 'tag-warning'
    return 'tag-neutral'
  }

  const sortIndicator = (field) => sortField !== field ? '' : (sortDir === 'asc' ? ' ↑' : ' ↓')
  const displayLogs = getFilteredAndSortedLogs()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>{t.logs.title}</h2>
          <p className="text-muted">{t.logs.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} disabled={displayLogs.length === 0}>{t.logs.exportCsv}</button>
          <button className="btn btn-secondary" onClick={handleExportJSON} disabled={displayLogs.length === 0}>{t.logs.exportJson}</button>
          <button className="btn btn-primary" onClick={() => { playSound('click'); fetchLogs(); }}>{t.logs.refresh}</button>
        </div>
      </div>

      <div className="logs-filters-grid">
        <input className="input" placeholder={t.logs.searchPh} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select className="input" value={filters.model_name} onChange={(e) => { playSound('click'); setFilters({ ...filters, model_name: e.target.value }); setPage(0) }}>
          <option value="">{t.logs.modelFilterAll}</option>
          <option value="intrusion">Intrusion (NSL-KDD)</option>
          <option value="flow">Flow (CSE-CIC-IDS2018)</option>
          <option value="sqli">Injection (SQLi)</option>
        </select>
        <select className="input" value={filters.attack_class} onChange={(e) => { playSound('click'); setFilters({ ...filters, attack_class: e.target.value }); setPage(0) }}>
          <option value="">{t.logs.classFilterAll}</option>
          <option value="Normal">Normal / BENIGN</option>
          <option value="R2L">R2L</option>
          <option value="U2R">U2R</option>
          <option value="DDoS">DDoS</option>
          <option value="DoS">DoS</option>
          <option value="BruteForce">BruteForce</option>
          <option value="SQL Injection">SQL Injection</option>
        </select>
      </div>

      <div className="card elev-sm" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : displayLogs.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <svg className="empty-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <div style={{ fontSize: 14 }}>{t.logs.emptyTitle}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{t.logs.emptySub}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={clearLogFilters}>{t.logs.clearFilters}</button>
              <button className="btn btn-secondary" onClick={() => { playSound('click'); fetchLogs() }}>{t.logs.refresh}</button>
              <button className="btn btn-primary" onClick={() => { playSound('click'); navigate('/test') }}>{t.logs.goToManualTest}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th data-sortable onClick={() => handleSort('timestamp')}>{t.logs.colTimestamp}{sortIndicator('timestamp')}</th>
                    <th data-sortable onClick={() => handleSort('id')}>{t.logs.colRef} <InfoHelp id="refId" />{sortIndicator('id')}</th>
                    <th data-sortable onClick={() => handleSort('source_ip')}>{t.logs.colSource} <InfoHelp id="sourceIp" />{sortIndicator('source_ip')}</th>
                    <th data-sortable onClick={() => handleSort('attack_class')}>{t.logs.colAttack}{sortIndicator('attack_class')}</th>
                    <th data-sortable onClick={() => handleSort('model_name')}>{t.logs.colModel}{sortIndicator('model_name')}</th>
                    <th data-sortable onClick={() => handleSort('confidence')}>{t.logs.colSeverity}{sortIndicator('confidence')}</th>
                    <th style={{ textAlign: 'center' }}>{t.logs.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map((log) => (
                    <tr key={log.id} className={log.is_alert ? 'alert-row' : ''} style={{ cursor: 'pointer' }} onClick={() => { playSound('click'); setSelectedEvent(log) }}>
                      <td className="mono" style={{ fontSize: 12 }}>{formatTime(log.timestamp)}</td>
                      <td className="mono">#{log.id}</td>
                      <td className="mono">{log.source_ip}</td>
                      <td style={{ fontWeight: 600 }}>{log.attack_class}</td>
                      <td><span className={`event-model-badge ${log.model_name}`}>{log.model_name}</span></td>
                      <td><span className={`tag ${severityClass(log.confidence)} mono`}>{(log.confidence * 100).toFixed(1)}%</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {log.is_alert ? <span className="tag tag-danger">!</span> : <span className="tag tag-accent">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="btn btn-secondary" onClick={() => { playSound('click'); setPage(Math.max(0, page - 1)) }} disabled={page === 0}>{t.logs.prevPage}</button>
              <span className="mono text-muted">{t.logs.pageLabel} {page + 1}</span>
              <button className="btn btn-secondary" onClick={() => { playSound('click'); setPage(page + 1) }} disabled={logs.length < PAGE_SIZE}>{t.logs.nextPage}</button>
            </div>
          </>
        )}
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
