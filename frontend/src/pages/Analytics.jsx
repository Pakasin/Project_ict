// ─────────────────────────────────────────────────────────────────────────────
// pages/Analytics.jsx — หน้าวิเคราะห์ภัยคุกคาม (Threat Analytics)
//
// ประกอบด้วย  3 ส่วนหลัก:
//   1. การกระจายประเภทภัยคุกคาม (Bar Spectrum Chart)
//   2. แผนที่ MITRE ATT&CK (Tactic → Technique → ความรุนแรง)
//   3. ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว (accuracy, F1-score, latency)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';
import { CONN_STATUS } from '../hooks/useConnectionStatus';
import { useLiveEvents } from '../hooks/useLiveEvents';

// ค่า <input type="datetime-local"> = 'YYYY-MM-DDTHH:mm' เวลาท้องถิ่น
const toInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Analytics — หน้าวิเคราะห์ภัยคุกคาม (Threat Analytics Dashboard)
 * แสดงกราฟ Bar Spectrum, แผนที่ MITRE ATT&CK และข้อมูลประสิทธิภาพโมเดล AI
 */
export default function Analytics() {
  const { t, lang, conn } = useApp();

  // liveEnabled: true เมื่อเชื่อมต่ออยู่ — ปุ่ม refresh จะถูก disabled ถ้าขาดการเชื่อมต่อ
  const liveEnabled = conn.status !== CONN_STATUS.DISCONNECTED;

  // timeRange: ช่วงเวลาที่เลือก ('24h' | '7d' | 'all') — ใช้สำหรับ filter กราฟในอนาคต
  const [timeRange, setTimeRange] = useState('24h');
  const [customFrom, setCustomFrom] = useState(() => toInput(new Date(Date.now() - 86400e3))); // ช่วงกำหนดเอง: เริ่ม
  const [customTo,   setCustomTo]   = useState(() => toInput(new Date()));                       // ช่วงกำหนดเอง: สิ้นสุด
  const customOk = timeRange === 'custom' && !!customFrom && !!customTo && new Date(customTo) > new Date(customFrom);
  const [mitre, setMitre] = useState([]); // /api/mitre: mapping class → technique

  // refreshKey: เพิ่มทุกครั้งที่กดรีเฟรช เพื่อ trigger re-fetch ข้อมูล
  const [refreshKey, setRefreshKey] = useState(0);

  // stats: ผลจาก /api/stats (null = ยังไม่โหลด), modelInfo: สถานะโหลดโมเดลจาก /api/model-info
  const [stats, setStats] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [apiError, setApiError] = useState(false);

  // sensors บันทึกเวลาแบบ local ISO ไม่มี timezone → ส่ง since/until ในรูปแบบเดียวกัน
  const localIso = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  async function loadStats(isCancelled = () => false) {
    if (timeRange === 'custom' && !customOk) return; // ช่วงเวลายังไม่ถูกต้อง (สิ้นสุดต้องหลังเริ่มต้น)
    const qs = new URLSearchParams({ bucket: '60' });
    if (timeRange === 'custom') {
      qs.set('since', localIso(new Date(customFrom))); qs.set('until', localIso(new Date(customTo)));
    } else {
      const spanMs = { '24h': 86400e3, '7d': 7 * 86400e3 }[timeRange];
      if (spanMs) qs.set('since', localIso(new Date(Date.now() - spanMs)));
    }
    try {
      const [sRes, mRes, tRes] = await Promise.all([fetch(`/api/stats?${qs}`), fetch('/api/model-info'), fetch('/api/mitre')]);
      const sData = await sRes.json();
      if (!sData.ok) throw new Error('stats');
      let mData = null;
      try { mData = await mRes.json(); } catch { /* model-info ไม่บังคับ */ }
      try { const t = await tRes.json(); if (t.ok) setMitre(t.data); } catch { /* ใช้ค่าเดิม */ }
      if (isCancelled()) return;
      setStats(sData.data); setModelInfo(mData); setApiError(false);
    } catch {
      if (!isCancelled()) setApiError(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadStats(() => cancelled);
    return () => { cancelled = true; };
  }, [timeRange, refreshKey, customFrom, customTo]);

  // event ใหม่จาก /ws/feed → รีเฟรชสถิติอัตโนมัติ (ช่วงกำหนดเองที่ผ่านมาแล้วไม่ต้อง)
  useLiveEvents(() => loadStats(), { enabled: timeRange !== 'custom' });

  /**
   * handleRefresh — รีเฟรชกราฟและข้อมูล (ทำงานเฉพาะเมื่อเชื่อมต่ออยู่)
   * ถ้าขาดการเชื่อมต่อ ปุ่มจะถูก disabled และฟังก์ชันนี้จะ return ทันที
   */
  const handleRefresh = () => {
    if (!liveEnabled) return;
    playSound('click');
    setRefreshKey(k => k + 1); // trigger re-render/re-fetch
  };

  // ── ข้อมูลการกระจายประเภทภัยคุกคาม (Spectrum Bar Chart) — จาก /api/stats ──
  const CLASS_COLOR = { DoS: 'var(--red)', DDoS: 'var(--red)', BruteForce: 'var(--orange-text-mid)', SQLi: 'var(--yellow)', R2L: 'var(--yellow)', U2R: 'var(--blue)' };
  const displayTotal = stats?.totals.events ?? 0;
  const classCount = (k) => stats?.by_class.find(c => c.key === k)?.count ?? 0;
  const classesCount = (ks) => ks.reduce((n, k) => n + classCount(k), 0);
  const spectrumRows = stats ? [
    { label: 'ปกติ / ไม่โจมตี', count: stats.totals.normal, color: 'var(--green)' },
    ...stats.by_class.map(c => ({ label: c.key, count: c.count, color: CLASS_COLOR[c.key] || 'var(--blue)' })),
  ].map(r => ({ ...r, pct: displayTotal ? ((r.count / displayTotal) * 100).toFixed(1) : '0.0' })) : [];

  /**
   * MitreIcon — ไอคอน SVG สำหรับแต่ละขั้นตอนใน MITRE ATT&CK
   * @param {string} name - ชื่อขั้นตอน ('recon' | 'initial' | 'credential' | 'lateral' | 'privilege' | 'impact')
   * - recon      → Reconnaissance (กล้องส่องทางไกล/เรดาร์)
   * - initial    → Initial Access (แสง/ดวงอาทิตย์ = ช่องโหว่เปิด)
   * - credential → Credential Access (กุญแจล็อก)
   * - lateral    → Lateral Movement (ลูกศร 2 ทิศ = การเคลื่อนย้าย)
   * - privilege  → Privilege Escalation (ลูกศรขึ้น = ยกระดับสิทธิ์)
   * - impact     → Impact (สัญญาณ wifi = network disruption)
   */
  const MitreIcon = ({ name }) => {
    let path = "";
    if (name === 'recon')      path = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v4 M12 18v4 M2 12h4 M18 12h4";
    if (name === 'initial')    path = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
    if (name === 'credential') path = "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4";
    if (name === 'lateral')    path = "M16 3l4 4-4 4 M8 21l-4-4 4-4 M4 7h16 M20 17H4";
    if (name === 'privilege')  path = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M16 5l-4-4-4 4";
    if (name === 'impact')     path = "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01";
    
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    )
  }

  // ── ข้อมูลแผนที่ MITRE ATT&CK ──
  // จับคู่เทคนิคการโจมตีที่ตรวจพบกับขั้นตอนมาตรฐาน MITRE ATT&CK
  // ไม่มีแถว Reconnaissance/Port Scan — ไม่มีโมเดลหรือกฎตัวไหนตรวจจับได้ (ไม่แสดงของที่ตรวจไม่ได้)
  const MITRE_COLOR = { // สีตามความรุนแรงของ tactic
    T1190: ['var(--red-bg-strong)', 'var(--red-text-strong)'], T1110: ['var(--orange-bg)', 'var(--orange-text-mid)'],
    T1021: ['var(--red-bg-strong)', 'var(--red-text-strong)'], T1068: ['var(--red-bg-strong)', 'var(--red-text-strong)'],
    T1498: ['var(--orange-bg)', 'var(--orange-text-mid)'],
  };
  const mitreRows = mitre.map(m => ({
    tactic: m.tactic_th, technique: m.label_th, tacticEn: m.tactic, techEn: `${m.id} ${m.name}`,
    count: classesCount(m.classes), icon: m.icon,
    bg: (MITRE_COLOR[m.id] || MITRE_COLOR.T1110)[0], fg: (MITRE_COLOR[m.id] || MITRE_COLOR.T1110)[1],
  }));

  // ── ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว ──
  // แสดงในส่วน "ข้อมูลประสิทธิภาพโมเดล" ด้านล่าง เป็นการ์ด 3 ใบ (INTRUSION, FLOW, SQLI)
  const modelAlerts = (k) => stats?.by_model.filter(m => m.key === k || (k === 'flow' && m.key === 'flow_rules')).reduce((n, m) => n + m.count, 0) ?? 0;
  const modelLoaded = (k) => (modelInfo?.ok ? !!modelInfo[k]?.loaded : null);  // null = ไม่ทราบ
  const telemetryData = [
    { tag: 'INTRUSION', key: 'intrusion', name: 'Intrusion Model (NSL-KDD, SimpleRNN)', desc: 'ตรวจจับ R2L/U2R — ปิดบนทราฟฟิกสดโดยค่าเริ่มต้น (วัด content features ด้วย nfstream ไม่ได้) ใช้ผ่านหน้า Test',
      inputShape: 'หน้าต่าง 10 × 41', alerts: modelAlerts('intrusion'), loaded: modelLoaded('intrusion'),
      icon: <path d="M18 20V10 M12 20V4 M6 20v-6" /> },
    { tag: 'FLOW', key: 'flow', name: 'Flow Model (CIC-IDS2017 + lab fine-tune)', desc: 'ตรวจจับ DoS, DDoS และ Brute Force ต่อ source IP (รวมการแจ้งเตือนจากกฎ rate rules)',
      inputShape: 'หน้าต่าง 10 × 52', alerts: modelAlerts('flow'), loaded: modelLoaded('flow'),
      icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" /> },
    { tag: 'SQLI', key: 'sqli', name: 'Injection Model (SQLi, char-level)', desc: 'ตรวจจับ SQL Injection จาก Query String และ Payload ของ HTTP request',
      inputShape: 'ตัวอักษร 221 ตัว', alerts: modelAlerts('sqli'), loaded: modelLoaded('sqli'),
      icon: <path d="M4 7c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z M4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7 M4 12c0 1.1 3.6 2 8 2s8-.9 8-2" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>การวิเคราะห์ภัยคุกคาม & การวิเคราะห์</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 4, fontSize: 13.5 }}>การกระจายประเภทภัยคุกคาม แผนที่ MITRE ATT&CK และค่าความมั่นใจของโมเดล</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="pill-tab-group" style={{ background: 'var(--gray-chip-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
            {[{ key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: 'all', label: 'ทั้งหมด' }, { key: 'custom', label: 'กำหนดเอง' }].map(({ key, label }) => (
              <button
                key={key}
                className="pill-tab"
                onClick={() => { setTimeRange(key); playSound('click'); }}
                style={{
                  background: timeRange === key ? 'var(--card-bg)' : 'transparent',
                  border: 'none',
                  boxShadow: timeRange === key ? 'var(--shadow)' : 'none',
                  color: timeRange === key ? 'var(--text)' : 'var(--text-secondary)',
                  padding: '7px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontWeight: timeRange === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[[customFrom, setCustomFrom, { max: customTo }], [customTo, setCustomTo, { min: customFrom }]].map(([val, set, lim], i) => (
                <React.Fragment key={i}>
                  {i === 1 && <span className="text-muted">–</span>}
                  <input type="datetime-local" value={val} {...lim} onChange={e => set(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${customOk ? 'var(--border-soft)' : '#f87171'}`, background: 'var(--card-bg)', color: 'var(--text)', fontSize: 12.5 }} />
                </React.Fragment>
              ))}
            </div>
          )}
          <button
            className="btn btn-outline"
            onClick={handleRefresh}
            disabled={!liveEnabled}
            title={!liveEnabled ? 'ขาดการเชื่อมต่ออยู่ — เชื่อมต่อสดก่อนจึงจะรีเฟรชได้' : undefined}
            style={!liveEnabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span style={{ marginLeft: 6 }}>รีเฟรชกราฟ</span>
          </button>
        </div>
      </div>

      <div className="two-col">
        <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>การกระจายประเภทภัยคุกคาม</div>
              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>สัดส่วนผลการจำแนกของโมเดลจากเหตุการณ์จริงที่บันทึกไว้ในช่วงเวลาที่เลือก</div>
            </div>
            <div className="tag tag-neutral" style={{ padding: '6px 12px', background: 'var(--gray-chip-bg)', color: 'var(--gray-chip-text)', fontSize: 11.5, fontWeight: 700 }}>รวมทั้งหมด {displayTotal} รายการ</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {spectrumRows.length === 0 && (
              <div className="text-muted" style={{ textAlign: 'center', padding: '28px 0', fontSize: 13 }}>{apiError ? 'เชื่อมต่อ API ไม่ได้' : 'ยังไม่มีเหตุการณ์ในช่วงเวลานี้'}</div>
            )}
            {spectrumRows.map((row) => (
              <div key={row.label} className="bar-list-row" style={{ gap: 8 }}>
                <div className="bar-list-head" style={{ fontSize: 13, color: 'var(--text)' }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 700 }}>{row.count} ({row.pct}%)</span>
                </div>
                <div className="dist-bar-bg" style={{ height: 8, background: 'var(--border-soft)' }}>
                  <div className="dist-bar-fill" style={{ width: `${row.pct}%`, background: row.color, height: '100%', borderRadius: 999 }} />
                </div>
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="card-title" style={{ marginBottom: 4, fontSize: 15 }}>แผนที่ MITRE ATT&CK <InfoHelp id="mitre" /></div>
          <div className="text-muted" style={{ fontSize: 11.5, marginBottom: 24 }}>จับคู่เทคนิคการโจมตีที่ตรวจพบกับขั้นตอนมาตรฐาน MITRE ATT&CK</div>
          
          <div className="mitre-row mitre-head" style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: 16 }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>กลุ่มภัย</span>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>เทคนิค (Technique)</span>
            <span style={{ textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>จำนวนที่ตรวจพบ</span>
          </div>
          
          {mitreRows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: i === mitreRows.length - 1 ? 'none' : '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="mitre-cell-icon" style={{ background: 'var(--row-head-bg)', color: 'var(--text-secondary)' }}>
                  <MitreIcon name={row.icon} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{row.tactic}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{row.tacticEn}</div>
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{row.technique}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{row.techEn}</div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span className="tag" style={{ 
                  background: row.count > 0 ? row.bg : 'var(--gray-chip-bg)', 
                  color: row.count > 0 ? row.fg : 'var(--text-tertiary)',
                  fontSize: 11.5,
                  padding: '5px 12px'
                }}>
                  {row.count} ครั้ง
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
          สถานะและการตรวจจับของโมเดล <InfoHelp id="modelPerf" />
        </div>
        <div className="model-grid">
          {telemetryData.map((m) => (
            <div key={m.tag} className="card elev-sm model-card" style={{ padding: '20px 22px', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag tag-neutral" style={{ padding: '4px 10px', fontSize: 11 }}>{m.tag}</span>
                {m.loaded === null ? <span className="text-muted" style={{ fontSize: 12 }}>ไม่ทราบสถานะ</span> : m.loaded ? <span className="status-badge-online"><span className="status-dot dot-online"></span>โหลดแล้ว</span> : <span className="text-muted" style={{ fontSize: 12 }}>ยังไม่โหลด</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="model-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)', width: 44, height: 44, borderRadius: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {m.icon}
                  </svg>
                </div>
                <div className="model-name" style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
              </div>
              
              <div className="model-desc" style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
                {m.desc}
              </div>
              
              <div className="model-stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>รูปแบบข้อมูลนำเข้า</span>
                  <span className="model-stat-value" style={{ fontSize: 14, fontWeight: 700 }}>{m.inputShape}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>แจ้งเตือนในช่วงเวลาที่เลือก</span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.alerts}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
