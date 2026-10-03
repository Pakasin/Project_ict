// ─────────────────────────────────────────────────────────────────────────────
// pages/Analytics.jsx — หน้าวิเคราะห์ภัยคุกคาม (Threat Analytics)
//
// ประกอบด้วย  3 ส่วนหลัก:
//   1. การกระจายประเภทภัยคุกคาม (Bar Spectrum Chart)
//   2. แผนที่ MITRE ATT&CK (Tactic → Technique → ความรุนแรง)
//   3. ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว (accuracy, F1-score, latency)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';
import { CONN_STATUS } from '../hooks/useConnectionStatus';

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

  // refreshKey: เพิ่มทุกครั้งที่กดรีเฟรช เพื่อ trigger re-fetch ข้อมูล
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * handleRefresh — รีเฟรชกราฟและข้อมูล (ทำงานเฉพาะเมื่อเชื่อมต่ออยู่)
   * ถ้าขาดการเชื่อมต่อ ปุ่มจะถูก disabled และฟังก์ชันนี้จะ return ทันที
   */
  const handleRefresh = () => {
    if (!liveEnabled) return;
    playSound('click');
    setRefreshKey(k => k + 1); // trigger re-render/re-fetch
  };

  // ── ข้อมูลการกระจายประเภทภัยคุกคาม (Spectrum Bar Chart) ──
  // สัดส่วนผลการจำแนกของโมเดลจากข้อมูลทดสอบ (demo data)
  const spectrumRows = [
    { label: 'ปกติ / ไม่โจมตี', count: 342, pct: '55.0', color: 'var(--green)' },
    { label: 'DDoS', count: 84, pct: '13.5', color: 'var(--red)' },
    { label: 'DoS', count: 56, pct: '9.0', color: 'var(--red)' },
    { label: 'R2L (Remote to Local)', count: 23, pct: '3.7', color: 'var(--yellow)' },
    { label: 'U2R (User to Root)', count: 9, pct: '1.4', color: 'var(--blue)' },
    { label: 'Brute Force', count: 67, pct: '10.8', color: 'var(--blue)' },
    { label: 'SQL Injection', count: 41, pct: '6.6', color: 'var(--border)' },
    { label: 'อื่น ๆ / ไม่ทราบประเภท', count: 0, pct: '0.0', color: 'var(--text-tertiary)' }
  ];
  const displayTotal = 622; // ยอดรวมของแถวทั้งหมด

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
  const mitreRows = [
    { tactic: 'การลาดตระเวณ', technique: 'สแกนเครือข่าย', tacticEn: 'Reconnaissance', techEn: 'Network Scanning', sev: 'ปานกลาง', bg: 'var(--orange-bg-strong)', fg: 'var(--yellow-text)', icon: 'recon' },
    { tactic: 'การเข้าถึงเบื้องต้น', technique: 'โจมตีแบบใช้ช่องโหว่จากข้อมูล (SQLi)', tacticEn: 'Initial Access', techEn: 'Exploit Public-Facing Application (SQLi)', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'initial' },
    { tactic: 'การเข้าถึงข้อมูล', technique: 'โจมตีแบบ Brute Force', tacticEn: 'Credential Access', techEn: 'Brute Force', sev: 'สูง', bg: 'var(--orange-bg)', fg: 'var(--orange-text-mid)', icon: 'credential' },
    { tactic: 'การเคลื่อนที่ในระบบ', technique: 'Remote to Local (R2L)', tacticEn: 'Lateral Movement', techEn: 'Remote Services', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'lateral' },
    { tactic: 'การยกระดับสิทธิ์', technique: 'User to Root (U2R)', tacticEn: 'Privilege Escalation', techEn: 'Privilege Escalation', sev: 'วิกฤต', bg: 'var(--red-bg-strong)', fg: 'var(--red-text-strong)', icon: 'privilege' },
    { tactic: 'ผลกระทบ', technique: 'Network DoS (DDoS/DoS)', tacticEn: 'Impact', techEn: 'Network Denial of Service', sev: 'สูง', bg: 'var(--orange-bg)', fg: 'var(--orange-text-mid)', icon: 'impact' },
  ];

  // ── ข้อมูลประสิทธิภาพโมเดล AI แต่ละตัว ──
  // แสดงในส่วน "ข้อมูลประสิทธิภาพโมเดล" ด้านล่าง เป็นการ์ด 3 ใบ (INTRUSION, FLOW, SQLI)
  const telemetryData = [
    { 
      tag: 'INTRUSION', 
      name: 'Intrusion LSTM (NSL-KDD)', 
      desc: 'ตรวจจับการโจมตีแบบ Zero-day และการยกระดับสิทธิ์ R2L/U2R',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'Packet + Flow', 
      accLabel: 'ความแม่นยำ',
      acc: '96.32%', 
      f1Label: 'F1-SCORE',
      f1: '0.9421', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '12.6 ms',
      icon: <path d="M18 20V10 M12 20V4 M6 20v-6" />
    },
    { 
      tag: 'FLOW', 
      name: 'Flow LSTM (CSE-CIC-IDS2018)', 
      desc: 'ตรวจจับการโจมตี DDoS, DoS และรูปแบบ Brute Force',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'NetFlow + Packet', 
      accLabel: 'ความแม่นยำ',
      acc: '97.15%', 
      f1Label: 'F1-SCORE',
      f1: '0.9534', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '15.2 ms',
      icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" />
    },
    { 
      tag: 'SQLI', 
      name: 'Injection LSTM (SQLi)', 
      desc: 'ตรวจจับ SQL Injection จาก Query String และ Payload',
      inputLabel: 'รูปแบบข้อมูลนำเข้า',
      inputShape: 'Query + Payload', 
      accLabel: 'ความแม่นยำ',
      acc: '95.48%', 
      f1Label: 'F1-SCORE',
      f1: '0.9317', 
      latencyLabel: 'เวลาประมวลผลเฉลี่ย',
      latency: '9.8 ms',
      icon: <path d="M4 5a8 3 0 1 0 16 0A8 3 0 1 0 4 5z M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5 M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    },
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
            {[{ key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: 'all', label: 'ทั้งหมด' }].map(({ key, label }) => (
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
              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>สัดส่วนผลการจำแนกของโมเดลจากข้อมูลทดสอบทั้งหมด</div>
            </div>
            <div className="tag tag-neutral" style={{ padding: '6px 12px', background: 'var(--gray-chip-bg)', color: 'var(--gray-chip-text)', fontSize: 11.5, fontWeight: 700 }}>รวมทั้งหมด {displayTotal} รายการ</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <span style={{ textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11.5 }}>ความรุนแรง</span>
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
                  background: row.bg, 
                  color: row.fg,
                  fontSize: 11.5,
                  padding: '5px 12px'
                }}>
                  {row.sev}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
          ข้อมูลประสิทธิภาพโมเดล <InfoHelp id="modelPerf" />
        </div>
        <div className="model-grid">
          {telemetryData.map((m) => (
            <div key={m.tag} className="card elev-sm model-card" style={{ padding: '20px 22px', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag tag-neutral" style={{ padding: '4px 10px', fontSize: 11 }}>ผลลัพธ์สาธิต</span>
                <span className="status-badge-online"><span className="status-dot dot-online"></span>ออนไลน์</span>
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
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.inputLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 14, fontWeight: 700 }}>{m.inputShape}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.accLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.acc}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{m.f1Label} <InfoHelp id="f1score" /></span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.f1}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="model-stat-label text-muted" style={{ fontSize: 11 }}>{m.latencyLabel}</span>
                  <span className="model-stat-value" style={{ fontSize: 15, fontWeight: 700 }}>{m.latency}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
