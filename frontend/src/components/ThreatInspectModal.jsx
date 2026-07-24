import React, { useState } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';

export default function ThreatInspectModal({ event, onClose }) {
  const { isGeneralView } = useApp();
  if (!event) return null;

  const [quarantined, setQuarantined] = useState(() => {
    const blocked = JSON.parse(localStorage.getItem('cybershield_blocked_ips') || '[]');
    return blocked.includes(event.source_ip);
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const isAlert = event.is_alert || event.confidence >= 0.8;

  function handleQuarantine() {
    if (isGeneralView) return;
    playSound('click');
    setActionLoading(true);
    setTimeout(() => {
      const blocked = JSON.parse(localStorage.getItem('cybershield_blocked_ips') || '[]');
      if (!blocked.includes(event.source_ip)) {
        blocked.push(event.source_ip);
        localStorage.setItem('cybershield_blocked_ips', JSON.stringify(blocked));
      }
      setQuarantined(true);
      setActionLoading(false);
      setActionMessage(`Source IP ${event.source_ip} quarantined across edge firewalls.`);
      playSound('success');
    }, 800);
  }

  function handleExportJson() {
    playSound('click');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(event, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `cybershield_event_${event.id || event.timestamp}.json`);
    document.body.appendChild(a); a.click(); a.remove();
    playSound('success');
  }

  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleString('th-TH', { hour12: false }) } catch { return timestamp || 'N/A' }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog card blueprint elev-lg" onClick={(e) => e.stopPropagation()}>
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`modal-icon ${isAlert ? 'icon-alert' : 'icon-safe'}`}>{isAlert ? '!' : 'OK'}</div>
            <div>
              <h3 style={{ margin: 0 }}>Threat Inspection</h3>
              <span className="text-muted" style={{ fontSize: 12 }}>Ref: #{event.id || event.event_id || 'LIVE'}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }}>×</button>
        </div>

        <div className={`risk-banner ${isAlert ? 'banner-alert' : 'banner-safe'}`}>
          <div>
            <span className="risk-value mono">{(event.confidence * 100).toFixed(1)}%</span>
            <span className="risk-label">Threat Confidence</span>
          </div>
          <div>
            <div className="risk-attack-class">{event.attack_class || 'Unknown'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Detected by <span className={`event-model-badge ${event.model_name}`}>{event.model_name}</span> model
            </div>
          </div>
        </div>

        <div className="modal-details-grid">
          <div className="detail-box"><span className="detail-label">Source IP</span><span className="mono">{event.source_ip}</span></div>
          <div className="detail-box"><span className="detail-label">Timestamp</span><span className="mono">{formatTime(event.timestamp)}</span></div>
          <div className="detail-box">
            <span className="detail-label">Alert Status</span>
            <span className={`tag ${isAlert ? 'tag-danger' : 'tag-accent'}`} style={{ width: 'fit-content' }}>{isAlert ? 'HIGH PRIORITY' : 'MONITORED'}</span>
          </div>
          <div className="detail-box">
            <span className="detail-label">Model Architecture</span>
            <span className="mono">
              {event.model_name === 'intrusion' ? 'UNSW-NB15 LSTM (49 feats)' :
               event.model_name === 'flow' ? 'CIC-IDS2018 LSTM (78 feats)' : 'Deep Embedding LSTM (SQLi)'}
            </span>
          </div>
        </div>

        <div>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Active Containment & Actions</div>
          {actionMessage && <div className="action-feedback">{actionMessage}</div>}
          <div className="action-buttons-group">
            <button className={`btn ${quarantined ? 'btn-secondary' : 'btn-danger'}`} onClick={handleQuarantine} disabled={quarantined || actionLoading || isGeneralView}>
              {actionLoading ? '...' : quarantined ? 'IP Quarantined' : `Block & Quarantine ${event.source_ip}`}
            </button>
            <button className="btn btn-secondary" onClick={handleExportJson}>Export JSON Evidence</button>
          </div>
        </div>
      </div>
    </div>
  );
}
