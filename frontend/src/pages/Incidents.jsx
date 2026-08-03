import React, { useEffect, useState } from 'react';
import { playSound } from '../utils/sound';
import ThreatInspectModal from '../components/ThreatInspectModal';
import InfoHelp from '../components/InfoHelp';
import { useApp } from '../context/AppContext';

export default function Incidents() {
  const { t, isGeneralView } = useApp();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [statusMap, setStatusMap] = useState(() => JSON.parse(localStorage.getItem('cybershield_incident_statuses') || '{}'));
  const [auditLogs, setAuditLogs] = useState(() => JSON.parse(localStorage.getItem('cybershield_audit_logs') || '[]'));

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/logs?limit=200&alerts_only=true');
      const data = await res.json();
      if (data.ok) setIncidents(data.data);
    } catch (err) {
      console.error('Failed to fetch high priority alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  function updateIncidentStatus(eventId, sourceIp, newStatus, actionName) {
    if (isGeneralView) return;
    playSound('click');
    const key = eventId ? `ID-${eventId}` : `IP-${sourceIp}`;
    const nextMap = { ...statusMap, [key]: newStatus };
    setStatusMap(nextMap);
    localStorage.setItem('cybershield_incident_statuses', JSON.stringify(nextMap));

    if (newStatus === 'MITIGATED') {
      const blocked = JSON.parse(localStorage.getItem('cybershield_blocked_ips') || '[]');
      if (!blocked.includes(sourceIp)) {
        blocked.push(sourceIp);
        localStorage.setItem('cybershield_blocked_ips', JSON.stringify(blocked));
      }
      playSound('success');
    }

    const entry = { id: Date.now(), time: new Date().toLocaleTimeString('th-TH', { hour12: false }), user: 'Operator Admin', action: actionName, target: `Ref #${eventId || 'N/A'} (${sourceIp})` };
    const nextAudit = [entry, ...auditLogs].slice(0, 50);
    setAuditLogs(nextAudit);
    localStorage.setItem('cybershield_audit_logs', JSON.stringify(nextAudit));
  }

  function getStatus(item) {
    const key = item.id ? `ID-${item.id}` : `IP-${item.source_ip}`;
    return statusMap[key] || 'OPEN';
  }

  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleString('th-TH', { hour12: false }) } catch { return timestamp }
  }

  const filteredIncidents = incidents.filter((item) => filterStatus === 'ALL' || getStatus(item) === filterStatus);
  const openCount = incidents.filter((item) => getStatus(item) === 'OPEN').length;
  const invCount = incidents.filter((item) => getStatus(item) === 'INVESTIGATING').length;
  const mitCount = incidents.filter((item) => getStatus(item) === 'MITIGATED').length;

  const statusTag = (st) => st === 'OPEN' ? 'tag-danger' : st === 'INVESTIGATING' ? 'tag-outline' : 'tag-accent';
  const statusLabel = (st) => st === 'OPEN' ? t.incidents.filterOpen : st === 'INVESTIGATING' ? t.incidents.filterInvestigating : t.incidents.filterMitigated;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>{t.incidents.title}</h2>
          <p className="text-muted">{t.incidents.subtitle}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { playSound('click'); fetchAlerts(); }}>{t.incidents.syncBtn}</button>
      </div>

      <div className="incidents-stats-grid">
        <div className={`card elev-sm incidents-stat-card ${filterStatus === 'OPEN' ? 'active-filter' : ''}`} onClick={() => { playSound('click'); setFilterStatus(filterStatus === 'OPEN' ? 'ALL' : 'OPEN'); }}>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{openCount}</div><div className="text-muted" style={{ fontSize: 12 }}>{t.incidents.statOpen}</div>
        </div>
        <div className={`card elev-sm incidents-stat-card ${filterStatus === 'INVESTIGATING' ? 'active-filter' : ''}`} onClick={() => { playSound('click'); setFilterStatus(filterStatus === 'INVESTIGATING' ? 'ALL' : 'INVESTIGATING'); }}>
          <div className="stat-value">{invCount}</div><div className="text-muted" style={{ fontSize: 12 }}>{t.incidents.statInvestigating}</div>
        </div>
        <div className={`card elev-sm incidents-stat-card ${filterStatus === 'MITIGATED' ? 'active-filter' : ''}`} onClick={() => { playSound('click'); setFilterStatus(filterStatus === 'MITIGATED' ? 'ALL' : 'MITIGATED'); }}>
          <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{mitCount}</div><div className="text-muted" style={{ fontSize: 12 }}>{t.incidents.statMitigated}</div>
        </div>
      </div>

      <div className="incidents-main-layout">
        <div className="card elev-sm incidents-queue-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title">{t.incidents.queueTitle} <InfoHelp id="incQueue" /> <span className="text-muted mono" style={{ fontSize: 12, fontWeight: 400 }}>({filteredIncidents.length})</span></div>
            <div className="seg">
              <label className="seg-opt"><input type="radio" name="incFilter" checked={filterStatus === 'ALL'} onChange={() => setFilterStatus('ALL')} />{t.incidents.filterAll}</label>
              <label className="seg-opt"><input type="radio" name="incFilter" checked={filterStatus === 'OPEN'} onChange={() => setFilterStatus('OPEN')} />{t.incidents.filterOpen}</label>
              <label className="seg-opt"><input type="radio" name="incFilter" checked={filterStatus === 'INVESTIGATING'} onChange={() => setFilterStatus('INVESTIGATING')} />{t.incidents.filterInvestigating}</label>
              <label className="seg-opt"><input type="radio" name="incFilter" checked={filterStatus === 'MITIGATED'} onChange={() => setFilterStatus('MITIGATED')} />{t.incidents.filterMitigated}</label>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
              <div style={{ fontSize: 14 }}>{t.incidents.emptyTitle}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{t.incidents.emptySub}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.incidents.colRef}</th><th>{t.incidents.colAttack}</th><th>{t.incidents.colModel}</th>
                    <th>{t.incidents.colConfidence}</th><th>{t.incidents.colSource}</th><th>{t.incidents.colTimestamp}</th>
                    <th>{t.incidents.colStatus}</th><th style={{ textAlign: 'right' }}>{t.incidents.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((item) => {
                    const st = getStatus(item);
                    return (
                      <tr key={item.id} className={st === 'OPEN' ? 'alert-row' : ''} style={{ cursor: 'pointer' }} onClick={() => { playSound('click'); setSelectedEvent(item); }}>
                        <td className="mono">#{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.attack_class}</td>
                        <td><span className={`event-model-badge ${item.model_name}`}>{item.model_name}</span></td>
                        <td className="mono confidence-high">{(item.confidence * 100).toFixed(1)}%</td>
                        <td className="mono">{item.source_ip}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{formatTime(item.timestamp)}</td>
                        <td><span className={`tag ${statusTag(st)}`}>{statusLabel(st)}</span></td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {st !== 'INVESTIGATING' && st !== 'MITIGATED' && (
                              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} disabled={isGeneralView}
                                onClick={() => updateIncidentStatus(item.id, item.source_ip, 'INVESTIGATING', `Started investigation on IP ${item.source_ip}`)}>
                                {t.incidents.actionTriage}
                              </button>
                            )}
                            {st !== 'MITIGATED' && (
                              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} disabled={isGeneralView}
                                onClick={() => updateIncidentStatus(item.id, item.source_ip, 'MITIGATED', `Quarantined & blocked IP ${item.source_ip}`)}>
                                {t.incidents.actionQuarantine}
                              </button>
                            )}
                            {st === 'MITIGATED' && (
                              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setSelectedEvent(item)}>{t.incidents.actionInspect}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card elev-sm audit-card">
          <div className="card-title">{t.incidents.auditTitle} <InfoHelp id="opLog" /></div>
          <div className="audit-list">
            {auditLogs.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 13, padding: '16px 0' }}>{t.incidents.auditEmpty}</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="audit-item">
                  <div className="audit-meta"><span>{log.user}</span><span className="mono">{log.time}</span></div>
                  <div className="audit-action">{log.action}</div>
                  <div className="audit-target mono">{log.target}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
