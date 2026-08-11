import React, { useEffect, useState } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';

export default function Analytics() {
  const { t, lang } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => { fetchData(); }, [timeRange]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/logs?limit=500');
      const data = await res.json();
      if (data.ok) setLogs(data.data);
    } catch (err) {
      console.error('Failed fetching analytics logs:', err);
    } finally {
      setLoading(false);
    }
  }

  // Order and buckets mirror the design's attack spectrum exactly: Benign, DDoS,
  // DoS, R2L, U2R, BruteForce, SQL Injection. No PortScan bucket — the Flow
  // Model's 4 classes are BENIGN/DoS/DDoS/BruteForce only (see CLAUDE.md).
  const attackKeys = [
    { key: 'benign', th: 'ปกติ / ไม่เป็นภัย', en: 'Normal / Benign', color: 'var(--color-success)' },
    { key: 'ddos', th: 'DDoS', en: 'DDoS', color: 'var(--color-danger)' },
    { key: 'dos', th: 'DoS', en: 'DoS', color: 'var(--color-danger)' },
    { key: 'r2l', th: 'R2L (Remote to Local)', en: 'R2L (Remote to Local)', color: 'var(--color-warning)' },
    { key: 'u2r', th: 'U2R (User to Root)', en: 'U2R (User to Root)', color: 'var(--color-warning)' },
    { key: 'bruteforce', th: 'BruteForce', en: 'BruteForce', color: '#0EA5E9' },
    { key: 'sqli', th: 'SQL Injection', en: 'SQL Injection', color: '#0EA5E9' },
  ];

  const attackCounts = { benign: 0, ddos: 0, dos: 0, sqli: 0, r2l: 0, u2r: 0, bruteforce: 0 };
  logs.forEach((item) => {
    const cls = (item.attack_class || '').toLowerCase();
    if (cls === 'normal' || cls === 'benign') attackCounts.benign++;
    else if (cls.includes('ddos')) attackCounts.ddos++;
    else if (cls === 'dos') attackCounts.dos++;
    else if (cls.includes('sql')) attackCounts.sqli++;
    else if (cls === 'r2l') attackCounts.r2l++;
    else if (cls === 'u2r') attackCounts.u2r++;
    else if (cls.includes('brute')) attackCounts.bruteforce++;
    else attackCounts.benign++;
  });

  const hasData = logs.length > 0;
  const displayCounts = hasData ? attackCounts : { benign: 342, ddos: 84, dos: 56, r2l: 23, u2r: 9, bruteforce: 67, sqli: 41 };
  const displayTotal = Object.values(displayCounts).reduce((a, b) => a + b, 0) || 1;
  const spectrumRows = attackKeys.map((k) => ({
    label: k[lang], count: displayCounts[k.key], pct: ((displayCounts[k.key] / displayTotal) * 100).toFixed(1), color: k.color
  }));

  const mitreData = [
    { tactic: { th: 'การลาดตระเวน', en: 'Reconnaissance' }, id: 'T1046', technique: { th: 'สแกนบริการเครือข่าย', en: 'Network Service Scanning' }, severity: { th: 'ปานกลาง', en: 'Medium' } },
    { tactic: { th: 'การเข้าถึงเบื้องต้น', en: 'Initial Access' }, id: 'T1190', technique: { th: 'โจมตีแอปที่เปิดสาธารณะ (SQLi)', en: 'Exploit Public-Facing App (SQLi)' }, severity: { th: 'วิกฤต', en: 'Critical' } },
    { tactic: { th: 'การเข้าถึงข้อมูลรับรอง', en: 'Credential Access' }, id: 'T1110', technique: { th: 'โจมตีแบบ Brute Force', en: 'Brute Force Attack' }, severity: { th: 'สูง', en: 'High' } },
    { tactic: { th: 'การเคลื่อนที่ในระบบ', en: 'Lateral Movement' }, id: 'T1210', technique: { th: 'Remote to Local (R2L)', en: 'Remote to Local (R2L)' }, severity: { th: 'วิกฤต', en: 'Critical' } },
    { tactic: { th: 'การยกระดับสิทธิ์', en: 'Privilege Escalation' }, id: 'T1068', technique: { th: 'User to Root (U2R)', en: 'Exploitation for Privilege Escalation (U2R)' }, severity: { th: 'วิกฤต', en: 'Critical' } },
    { tactic: { th: 'ผลกระทบ', en: 'Impact' }, id: 'T1498', technique: { th: 'Network DoS (DDoS/DoS)', en: 'Network Denial of Service (DDoS/DoS)' }, severity: { th: 'สูง', en: 'High' } },
  ];
  const mitreRows = mitreData.map((r) => ({ tactic: r.tactic[lang], id: r.id, technique: r.technique[lang], severity: r.severity[lang] }));

  // Dataset names & feature counts follow CLAUDE.md (source of truth for
  // model facts): Intrusion Model = NSL-KDD (10,41); Flow Model serves 71
  // features after dropping the 7 fingerprint columns from the raw 78.
  const telemetryData = [
    { tag: 'INTRUSION', name: 'Intrusion LSTM (NSL-KDD)', desc: { th: 'ตรวจจับความผิดปกติแบบ zero-day และการยกระดับสิทธิ์ R2L/U2R', en: 'Detects zero-day anomalies and R2L/U2R privilege escalation.' }, inputShape: '41 features', acc: '82.3%', f1: '0.790', latency: '0.4 ms' },
    { tag: 'FLOW', name: 'Flow LSTM (CSE-CIC-IDS2018)', desc: { th: 'ตรวจสอบ DDoS, DoS และรูปแบบ Brute Force', en: 'Monitors volumetric DDoS, DoS, and Brute Force patterns.' }, inputShape: '71 features', acc: '95.3%', f1: '0.953', latency: '2.1 ms' },
    { tag: 'SQLI', name: 'Injection LSTM (SQLi)', desc: { th: 'ตรวจสอบ query string และ payload สำหรับ SQL injection', en: 'Inspects query strings and payloads for SQL injection.' }, inputShape: '200-token embedding', acc: '98.9%', f1: '0.987', latency: '2.6 ms' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>{t.analytics.title}</h2>
          <p className="text-muted">{t.analytics.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="seg">
            <label className="seg-opt"><input type="radio" name="range" checked={timeRange === '24h'} onChange={() => setTimeRange('24h')} />{t.analytics.range24h}</label>
            <label className="seg-opt"><input type="radio" name="range" checked={timeRange === '7d'} onChange={() => setTimeRange('7d')} />{t.analytics.range7d}</label>
            <label className="seg-opt"><input type="radio" name="range" checked={timeRange === 'all'} onChange={() => setTimeRange('all')} />{t.analytics.rangeAll}</label>
          </div>
          <button className="btn btn-secondary" onClick={() => { playSound('click'); fetchData(); }}>{t.analytics.refresh}</button>
        </div>
      </div>

      {!hasData && <div className="tag tag-outline" style={{ padding: '8px 14px' }}>{t.analytics.demoNotice}</div>}

      <div className="analytics-top-grid">
        <div className="card elev-sm" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="card-title">{t.analytics.spectrumTitle} <InfoHelp id="attackDist" /></div>
            <div className="tag tag-neutral">{displayTotal} {t.analytics.totalSampled}</div>
          </div>
          {spectrumRows.map((row) => (
            <div key={row.label} className="dist-item">
              <div className="dist-header"><span>{row.label}</span><span style={{ fontWeight: 600 }}>{row.count} ({row.pct}%)</span></div>
              <div className="dist-bar-bg"><div className="dist-bar-fill" style={{ width: `${row.pct}%`, background: row.color }} /></div>
            </div>
          ))}
        </div>

        <div className="card elev-sm" style={{ padding: 'var(--space-4)', gap: 0 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>{t.analytics.mitreTitle} <InfoHelp id="mitre" /></div>
          <div className="mitre-row mitre-head">
            <span>{t.analytics.colTactic}</span>
            <span style={{ textAlign: 'right' }}>{t.analytics.colSeverity} <InfoHelp id="severityCol" /></span>
          </div>
          {mitreRows.map((row) => (
            <div key={row.id} className="mitre-row">
              <span>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{row.tactic}</div>
                <div className="mono text-muted" style={{ fontSize: 11 }}>{row.technique}</div>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{row.severity}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>{t.analytics.telemetryTitle} <InfoHelp id="modelPerf" /></div>
        <div className="models-grid">
          {telemetryData.map((m) => (
            <div key={m.tag} className="card elev-sm model-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag tag-neutral">{t.analytics.demoResult}</span>
                <span className="status-badge-online"><span className="status-dot dot-online"></span>{t.analytics.online}</span>
              </div>
              <div className="card-title">{m.name}</div>
              <div className="card-body">{m.desc[lang]}</div>
              <div className="model-metrics-grid">
                <div><span className="metric-label text-muted">{t.analytics.inputShape}</span><span className="metric-val">{m.inputShape}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.validationAcc}</span><span className="metric-val" style={{ color: 'var(--color-accent)' }}>{m.acc}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.f1} <InfoHelp id="f1score" /></span><span className="metric-val">{m.f1}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.latency}</span><span className="metric-val" style={{ color: 'var(--color-accent)' }}>{m.latency}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
