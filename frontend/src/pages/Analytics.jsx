import React, { useEffect, useState } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';

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

  const attackKeys = [
    { key: 'benign', th: 'ปกติ / ไม่เป็นภัย', en: 'Normal / Benign' },
    { key: 'ddos', th: 'DDoS / DoS', en: 'DDoS / DoS' },
    { key: 'sqli', th: 'SQL Injection', en: 'SQL Injection' },
    { key: 'r2l', th: 'R2L (Remote to Local)', en: 'R2L (Remote to Local)' },
    { key: 'u2r', th: 'U2R (User to Root)', en: 'U2R (User to Root)' },
    { key: 'portscan', th: 'PortScan / Recon', en: 'PortScan / Recon' },
    { key: 'bruteforce', th: 'BruteForce', en: 'BruteForce' },
  ];

  const attackCounts = { benign: 0, ddos: 0, sqli: 0, r2l: 0, u2r: 0, portscan: 0, bruteforce: 0 };
  logs.forEach((item) => {
    const cls = (item.attack_class || '').toLowerCase();
    if (cls === 'normal' || cls === 'benign') attackCounts.benign++;
    else if (cls.includes('ddos') || cls === 'dos') attackCounts.ddos++;
    else if (cls.includes('sql')) attackCounts.sqli++;
    else if (cls === 'r2l') attackCounts.r2l++;
    else if (cls === 'u2r') attackCounts.u2r++;
    else if (cls.includes('scan') || cls.includes('port')) attackCounts.portscan++;
    else if (cls.includes('brute')) attackCounts.bruteforce++;
    else attackCounts.benign++;
  });

  const hasData = logs.length > 0;
  const displayCounts = hasData ? attackCounts : { benign: 342, ddos: 84, sqli: 56, r2l: 23, u2r: 9, portscan: 67, bruteforce: 41 };
  const displayTotal = Object.values(displayCounts).reduce((a, b) => a + b, 0) || 1;
  const spectrumRows = attackKeys.map((k) => ({
    label: k[lang], count: displayCounts[k.key], pct: ((displayCounts[k.key] / displayTotal) * 100).toFixed(1), isNormal: k.key === 'benign'
  }));

  const mitreData = [
    { tactic: { th: 'การลาดตระเวน', en: 'Reconnaissance' }, id: 'T1046', technique: { th: 'สแกนบริการเครือข่าย', en: 'Network Service Scanning' }, severity: { th: 'ปานกลาง', en: 'Medium' }, cls: 'tag-neutral' },
    { tactic: { th: 'การเข้าถึงเบื้องต้น', en: 'Initial Access' }, id: 'T1190', technique: { th: 'โจมตีแอปที่เปิดสาธารณะ (SQLi)', en: 'Exploit Public-Facing App (SQLi)' }, severity: { th: 'วิกฤต', en: 'Critical' }, cls: 'tag-danger' },
    { tactic: { th: 'การเข้าถึงข้อมูลรับรอง', en: 'Credential Access' }, id: 'T1110', technique: { th: 'โจมตีแบบ Brute Force', en: 'Brute Force Attack' }, severity: { th: 'สูง', en: 'High' }, cls: 'tag-outline' },
    { tactic: { th: 'การเคลื่อนที่ในระบบ', en: 'Lateral Movement' }, id: 'T1210', technique: { th: 'Remote to Local (R2L)', en: 'Remote to Local (R2L)' }, severity: { th: 'วิกฤต', en: 'Critical' }, cls: 'tag-danger' },
    { tactic: { th: 'การยกระดับสิทธิ์', en: 'Privilege Escalation' }, id: 'T1068', technique: { th: 'User to Root (U2R)', en: 'Exploitation for Privilege Escalation (U2R)' }, severity: { th: 'วิกฤต', en: 'Critical' }, cls: 'tag-danger' },
    { tactic: { th: 'ผลกระทบ', en: 'Impact' }, id: 'T1498', technique: { th: 'Network DoS (DDoS/DoS)', en: 'Network Denial of Service (DDoS/DoS)' }, severity: { th: 'สูง', en: 'High' }, cls: 'tag-outline' },
  ];
  const mitreRows = mitreData.map((r) => ({ tactic: r.tactic[lang], id: r.id, technique: r.technique[lang], severity: r.severity[lang], cls: r.cls }));

  const telemetryData = [
    { tag: 'INTRUSION', name: 'Intrusion LSTM (UNSW-NB15)', desc: { th: 'ตรวจจับความผิดปกติแบบ zero-day และการยกระดับสิทธิ์ R2L/U2R', en: 'Detects zero-day anomalies and R2L/U2R privilege escalation.' }, inputShape: '49 features', acc: '98.4%', f1: '0.982', latency: '4.2 ms' },
    { tag: 'FLOW', name: 'Flow LSTM (CIC-IDS2018)', desc: { th: 'ตรวจสอบ DDoS, Slowloris และรูปแบบ PortScan', en: 'Monitors volumetric DDoS, Slowloris, and PortScan patterns.' }, inputShape: '78 features', acc: '99.1%', f1: '0.990', latency: '3.8 ms' },
    { tag: 'SQLI', name: 'Injection LSTM (SQLi)', desc: { th: 'ตรวจสอบ query string และ payload สำหรับ SQL injection', en: 'Inspects query strings and payloads for SQL injection.' }, inputShape: '200-token embedding', acc: '97.8%', f1: '0.975', latency: '2.1 ms' },
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
        <div className="card blueprint elev-sm" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="card-title">{t.analytics.spectrumTitle}</div>
            <div className="tag tag-neutral">{displayTotal} {t.analytics.totalSampled}</div>
          </div>
          {spectrumRows.map((row) => (
            <div key={row.label} className="dist-item">
              <div className="dist-header"><span>{row.label}</span><span className="text-muted mono">{row.count} ({row.pct}%)</span></div>
              <div className="dist-bar-bg"><div className={`dist-bar-fill ${row.isNormal ? '' : 'fill-alert'}`} style={{ width: `${row.pct}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card blueprint elev-sm" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
          <div className="card-title">{t.analytics.mitreTitle}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>{t.analytics.colTactic}</th><th>{t.analytics.colTechnique}</th><th>{t.analytics.colSeverity}</th></tr></thead>
              <tbody>
                {mitreRows.map((row) => (
                  <tr key={row.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{row.tactic}</div><div className="mono text-muted" style={{ fontSize: 11 }}>{row.id}</div></td>
                    <td style={{ fontSize: 13 }}>{row.technique}</td>
                    <td><span className={`tag ${row.cls}`}>{row.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>{t.analytics.telemetryTitle}</div>
        <div className="models-grid">
          {telemetryData.map((m) => (
            <div key={m.tag} className="card blueprint elev-sm model-card">
              <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag tag-outline">{m.tag}</span>
                <span className="tag tag-accent">{t.analytics.online}</span>
              </div>
              <div className="card-title">{m.name}</div>
              <div className="card-body">{m.desc[lang]}</div>
              <div className="model-metrics-grid">
                <div><span className="metric-label text-muted">{t.analytics.inputShape}</span><span className="metric-val">{m.inputShape}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.validationAcc}</span><span className="metric-val" style={{ color: 'var(--color-accent)' }}>{m.acc}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.f1}</span><span className="metric-val">{m.f1}</span></div>
                <div><span className="metric-label text-muted">{t.analytics.latency}</span><span className="metric-val" style={{ color: 'var(--color-accent)' }}>{m.latency}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
