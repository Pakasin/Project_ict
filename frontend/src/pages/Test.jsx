// ─────────────────────────────────────────────────────────────────────────────
// pages/Test.jsx — หน้าทดสอบโมเดล AI ด้วยตนเอง (Manual Model Testing)
//
// ให้ผู้ใช้ส่ง input ไปตรวจสอบกับโมเดล LSTM ผ่าน API /api/predict
// Tab ที่มี:
//   1. SQLi   — ทดสอบ SQL Injection จาก query string / payload
//   2. Intrusion — ทดสอบการบุกรุก (R2L/U2R) ด้วย feature 41 ค่า (UNSW-NB15)
//   3. Flow   — ทดสอบ DDoS/DoS/Brute Force ด้วย feature 78 ค่า (CIC-IDS2018)
// เพราะ General User ไม่สามารถทดสอบได้ ปุ่มส่งจะถูกปิด (isGeneralView guard)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'
import InfoHelp from '../components/InfoHelp'

export default function Test() {
  const { t, isGeneralView } = useApp()

  // activeTab: โมเดลที่กำลังทดสอบ ('sqli' | 'intrusion' | 'flow')
  const [activeTab, setActiveTab] = useState('sqli')

  // loading: กำลังรอผล prediction จาก API
  const [loading, setLoading] = useState(false)

  // result: ผลลัพธ์ prediction ที่ได้รับจาก API (null = ยังไม่ได้ทดสอบ)
  const [result, setResult] = useState(null)

  // error: ข้อความ error ถ้า prediction ล้มเหลว
  const [error, setError] = useState(null)

  // modelInfo: ข้อมูลโมเดล (features ที่ใช้ train) จาก API /api/model-info
  const [modelInfo, setModelInfo] = useState(null)

  // sqliPayload: ข้อความ SQL หรือ HTTP Request ที่ user พิมพ์ (สำหรับ Injection LSTM)
  const [sqliPayload, setSqliPayload] = useState('')

  // intrusionFeatures: array ค่า 41 feature สำหรับโมเดล Intrusion (UNSW-NB15/NSL-KDD)
  const [intrusionFeatures, setIntrusionFeatures] = useState(Array(41).fill('0'))

  // flowFeatures: array ค่า 78 feature สำหรับโมเดล Flow (CIC-IDS2018)
  const [flowFeatures, setFlowFeatures] = useState(Array(78).fill('0'))

  // ดึง model info จาก API ตอน component mount (ใช้แสดง feature names ที่โมเดล Flow ใช้จริง)
  useEffect(() => {
    fetch('/api/model-info').then(r => r.json()).then(d => { if (d.ok) setModelInfo(d) }).catch(() => {})
  }, [])

  /**
   * loadIntrusionPreset — โหลดค่า feature สำเร็จรูปสำหรับ Intrusion Model
   * เพื่อให้ผู้ใช้ทดสอบได้ง่ายโดยไม่ต้องกรอกค่าทีละช่อง
   * @param {'r2l' | 'u2r' | 'normal'} scenario
   *   - r2l:    จำลองการโจมตี Remote to Local (เข้าถึงผ่าน service ระยะไกล)
   *   - u2r:    จำลองการยกระดับสิทธิ์ User to Root (privilege escalation)
   *   - normal: ทราฟฟิกปกติ (ไม่ใช่การโจมตี)
   */
  function loadIntrusionPreset(scenario) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setResult(null); setError(null)

    const next = Array(41).fill('0') // เริ่มจาก  0 ทั้งหมด แล้วค่อยเปลี่ยนเฉพาะ feature สำคัญ

    if (scenario === 'r2l') {
      // duration=4.5, protocol=1 (TCP), service=20 (ftp), count=3, dst_host_count=5,
      // is_guest_login=1, confidence_indicator=0.85
      next[0]='4.5'; next[1]='1'; next[2]='20'; next[7]='3'; next[10]='5'; next[21]='1'; next[24]='0.85'
    } else if (scenario === 'u2r') {
      // duration=1.2, num_compromised=1, root_shell=1, su_attempted=4, num_root=6, num_file_creations=2
      next[0]='1.2'; next[13]='1'; next[14]='1'; next[15]='4'; next[16]='6'; next[17]='2'
    } else if (scenario === 'normal') {
      // duration=0.02, src_bytes=540, dst_bytes=3240, count=12
      next[0]='0.02'; next[4]='540'; next[5]='3240'; next[22]='12'
    }
    setIntrusionFeatures(next)
  }

  /**
   * loadFlowPreset — โหลดค่า feature สำเร็จรูปสำหรับ Flow Model
   * @param {'ddos' | 'dos' | 'benign'} scenario
   *   - ddos:   จำลอง Distributed Denial of Service attack
   *   - dos:    จำลอง Denial of Service attack
   *   - benign: ทราฟฟิกปกติ (HTTPS)
   */
  function loadFlowPreset(scenario) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setResult(null); setError(null)

    const next = Array(78).fill('0') // เริ่มจาก 0 ทั้งหมด แล้วปรับเฉพาะ feature สำคัญ

    if (scenario === 'ddos') {
      // dst_port=80, Fwd Packets/s=150, Fwd Pkt Len Mean=8500, Init_Win_bytes_bwd=145000
      // Flow Duration=1.2s, SYN Flag Count=1
      next[0]='80'; next[1]='150'; next[2]='8500'; next[14]='145000'; next[18]='1.2'; next[38]='1'
    } else if (scenario === 'dos') {
      // dst_port=443, Fwd Packets/s=115M, Fwd Pkt Len Mean=12, ลร.การแพคเก็ตเดินหน้า=0.12
      next[0]='443'; next[1]='115000000'; next[2]='12'; next[14]='0.12'; next[67]='1'
    } else if (scenario === 'benign') {
      // HTTPS traffic: dst_port=443, Fwd Pkt Len Mean=45K, 18 packets, 24 bytes, flow=840
      next[0]='443'; next[1]='45000'; next[2]='18'; next[3]='24'; next[14]='840'
    }
    setFlowFeatures(next)
  }

  /**
   * handlePredict — ส่งข้อมูลไปตรวจสอบกับโมเดล AI ผ่าน API /api/predict
   * เพลียเสียงตามผล: alert = ชนิดภัย, success = ปกติ
   * General User ไม่สามารถส่งได้ (isGeneralView guard)
   * @param {'sqli' | 'intrusion' | 'flow'} modelName - โมเดลที่ต้องการทดสอบ
   */
  async function handlePredict(modelName) {
    if (isGeneralView) return   // General User ไม่สามารถทำได้
    playSound('click'); setLoading(true); setResult(null); setError(null)
    try {
      // สร้าง request body ตาม model type
      let body = { model_name: modelName }
      if (modelName === 'sqli')      body.payload  = sqliPayload
      else if (modelName === 'intrusion') body.features = intrusionFeatures.map(v => Number(v) || 0)
      else if (modelName === 'flow')      body.features = flowFeatures.map(v => Number(v) || 0)

      const res = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        setResult(data.result)
        // เล่นเสียงตามผล: ถ้า class ≠ Normal/BENIGN = ตรวจพบภัย → alert, ถ้าปกติ → success
        playSound(data.result.predicted_class !== 'Normal' && data.result.predicted_class !== 'BENIGN' ? 'alert' : 'success')
      } else {
        setError(data.error || 'Prediction failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * updateFeature — อัปเดตค่า feature ที่ตำแหน่งใดใน array
   * ใช้แบบ immutable update (สร้าง array ใหม่) เพื่อให้ React detect การเปลี่ยนแปลง
   * @param {string[]} features - array feature ปัจจุบัน
   * @param {function} setFeatures - setter function (จาก useState)
   * @param {number} index - ตำแหน่ง feature ที่ต้องการแก้
   * @param {string} value - ค่าใหม่
   */
  function updateFeature(features, setFeatures, index, value) {
    if (isGeneralView) return   // General User ไม่สามารถแก้ไขได้
    const updated = [...features]; updated[index] = value; setFeatures(updated)
  }

  const nslFeatureNames = [
    'duration','protocol_type','service','flag','src_bytes','dst_bytes','land','wrong_fragment','urgent','hot',
    'num_failed_logins','logged_in','num_compromised','root_shell','su_attempted','num_root','num_file_creations',
    'num_shells','num_access_files','num_outbound_cmds','is_host_login','is_guest_login','count','srv_count',
    'serror_rate','srv_serror_rate','rerror_rate','srv_rerror_rate','same_srv_rate','diff_srv_rate',
    'srv_diff_host_rate','dst_host_count','dst_host_srv_count','dst_host_same_srv_rate','dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate','dst_host_srv_diff_host_rate','dst_host_serror_rate','dst_host_srv_serror_rate',
    'dst_host_rerror_rate','dst_host_srv_rerror_rate',
  ]

  const isMalicious = !!result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'
  const flowIgnoredNames = modelInfo?.flow ? modelInfo.flow.raw_feature_names.filter(n => !modelInfo.flow.trained_feature_names.includes(n)) : []

  const MODEL_TABS = [
    {
      key: 'sqli',
      label: 'SQL / HTTP Query · Injection LSTM (SQLi)',
      sublabel: 'SQL Injection · HTTP Request',
      desc: 'ตรวจสอบ SQL Injection จาก Query String',
      features: 'Embedding LSTM',
      color: 'var(--green)',
      bg: 'rgba(34,197,94,.12)',
      icon: <path d="M12 3 4.5 12c0 5 3.5 8.5 7.5 9 4-1.5 7.5-4.5 7.5-9L19.5 3zm-4 9 3 3 5-5" />,
      help: 'sqliModelHelp'
    },
    {
      key: 'intrusion',
      label: 'Intrusion LSTM (UNSW-NB15)',
      sublabel: '49 features · R2L, U2R',
      desc: 'ตรวจจับการบุกรุก R2L และการยกระดับสิทธิ์ U2R',
      features: 'NSL-KDD · 41 features',
      color: 'var(--blue)',
      bg: 'rgba(99,102,241,.12)',
      icon: <path d="M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z" />,
      viewBox: '0 0 20 24',
      help: 'unswNb15'
    },
    {
      key: 'flow',
      label: 'Flow LSTM (CIC-IDS2018)',
      sublabel: 'Normal, DoS, DDoS, BruteForce',
      desc: 'วิเคราะห์ปริมาณการรับ-ส่ง DDoS, DoS, Brute Force',
      features: 'CSE-CIC-IDS2018 · 78 features',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.1)',
      icon: <path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4" />,
      help: 'cicIds2018'
    },
  ]

  const SQLI_PRESETS = [
    { label: 'Normal Query', payload: "SELECT name, price FROM products WHERE category = 'electronics'", safe: true },
    { label: 'SQL Injection', payload: "' OR 1=1 --" },
    { label: 'HTTP Request', payload: "GET /login.php?id=1 OR '1'='1'" },
  ]
  const [sqliPreset, setSqliPreset] = useState('Normal Query')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── ส่วนหัวหน้า ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,179,8,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 4h18v16H3V4zM7 9l3 3-3 3M12 15h4" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>แซนด์บ็อกซ์จำลองการโจมตีด้วยตนเอง</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>ป้อนข้อมูลตรงเข้าโมเดลเพื่อทดสอบพฤติกรรมอย่างละเอียด</p>
        </div>
      </div>

      {/* ── การ์ดเลือกโมเดล ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {MODEL_TABS.map(m => (
          <div key={m.key} onClick={() => { playSound('click'); setActiveTab(m.key); setResult(null); setError(null) }}
            style={{
              padding: '18px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all .2s',
              border: activeTab === m.key ? `2px solid ${m.color}` : '2px solid var(--border-soft)',
              background: activeTab === m.key ? m.bg : 'var(--card-bg)',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, flexShrink: 0 }}>
                <svg width="18" height="18" viewBox={m.viewBox || '0 0 24 24'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{m.icon}</svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: activeTab === m.key ? m.color : 'var(--text)', lineHeight: 1.3 }}>{m.label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <InfoHelp id={m.help} />
              <div className="text-muted" style={{ fontSize: 11.5 }}>{m.sublabel}</div>
            </div>
          </div>
        ))}
      </div>

      {isGeneralView && (
        <div style={{ fontSize: 12, padding: '10px 16px', background: 'rgba(234,179,8,.08)', borderRadius: 8, border: '1px solid rgba(234,179,8,.2)', color: '#fbbf24' }}>
          คุณกำลังดูในโหมดอ่านอย่างเดียว — การส่งข้อมูลถูกปิดการใช้งาน
        </div>
      )}

      {/* ── ฟอร์มกรอกข้อมูล ── */}
      <div className="card elev-sm" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* แท็บ SQL Injection */}
        {activeTab === 'sqli' && (
          <>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>คำสั่ง SQL หรือ HTTP Request ที่ต้องการทดสอบ</label>
              <textarea value={sqliPayload} onChange={e => !isGeneralView && setSqliPayload(e.target.value)} readOnly={isGeneralView}
                placeholder={`เช่น SELECT * FROM users WHERE id = 1 OR '1'='1';`} rows={5}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-soft)',
                  background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'monospace',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6
                }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รูปแบบสำเร็จรูป</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SQLI_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { playSound('click'); setSqliPayload(p.payload); setSqliPreset(p.label) }}
                    disabled={isGeneralView}
                    style={{
                      padding: '7px 16px', borderRadius: 999, border: '1.5px solid', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                      borderColor: sqliPreset === p.label ? 'var(--accent)' : 'var(--border-soft)',
                      background: sqliPreset === p.label ? 'rgba(99,102,241,.12)' : 'transparent',
                      color: sqliPreset === p.label ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('sqli')} disabled={loading || isGeneralView || !sqliPayload.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
              <button onClick={() => { playSound('click'); setSqliPayload(''); setResult(null); setError(null); setSqliPreset('') }}
                disabled={isGeneralView}
                style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                ล้างค่า
              </button>
            </div>
          </>
        )}

        {/* แท็บ Intrusion */}
        {activeTab === 'intrusion' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>41 packet features — ตรวจจับการบุกรุก R2L และยกระดับสิทธิ์ U2R</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['r2l', 'R2L Preset'], ['u2r', 'U2R Preset'], ['normal', 'Normal Preset']].map(([k, l]) => (
                  <button key={k} disabled={isGeneralView} onClick={() => loadIntrusionPreset(k)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {intrusionFeatures.map((val, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>[{i}] {nslFeatureNames[i] || `feat_${i}`}</label>
                  <input type="number" step="any" value={val} disabled={isGeneralView}
                    onChange={e => updateFeature(intrusionFeatures, setIntrusionFeatures, i, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12, outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('intrusion')} disabled={loading || isGeneralView}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
            </div>
          </>
        )}

        {/* แท็บ Flow */}
        {activeTab === 'flow' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>78 raw flow features — ตรวจจับ DDoS, DoS และ Brute Force</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['ddos', 'DDoS Preset'], ['dos', 'DoS Preset'], ['benign', 'Benign Preset']].map(([k, l]) => (
                  <button key={k} disabled={isGeneralView} onClick={() => loadFlowPreset(k)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {flowFeatures.map((val, i) => {
                const name = modelInfo?.flow?.raw_feature_names?.[i] || `flow_feat_${i}`
                const ignored = flowIgnoredNames.includes(name)
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: ignored ? .45 : 1 }}>
                    <label style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }} title={ignored ? 'Dropped server-side (fingerprint feature)' : undefined}>
                      [{i}] {name}{ignored ? ' (ignored)' : ''}
                    </label>
                    <input type="number" step="any" value={val} disabled={isGeneralView}
                      onChange={e => updateFeature(flowFeatures, setFlowFeatures, i, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12, outline: 'none' }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => handlePredict('flow')} disabled={loading || isGeneralView}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 999, animation: 'spin 1s linear infinite' }}></div> กำลังประมวลผล...</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ประมวลผลด้วยโมเดล</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── ข้อความผิดพลาด ── */}
      {error && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
          <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 4 }}>Model Prediction Error</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      )}

      {/* ── การ์ดแสดงผลลัพธ์ ── */}
      {!result && !error && (
        <div className="card elev-sm" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, border: '2px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>ยังไม่มีผลลัพธ์</div>
          <div className="text-muted" style={{ fontSize: 13, textAlign: 'center', maxWidth: 360 }}>ป้อนข้อมูลด้านบนแล้วกด "ประมวลผลด้วยโมเดล" เพื่อดูผลการตรวจจับ (ค่าตัดสิน + ค่าความเชื่อมั่น) ที่นี่</div>
        </div>
      )}

      {result && (
        <div style={{
          padding: '24px 28px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 20,
          background: isMalicious ? 'rgba(239,68,68,.05)' : 'rgba(34,197,94,.05)',
          border: `1.5px solid ${isMalicious ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.25)'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: isMalicious ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)',
              color: isMalicious ? '#f87171' : '#4ade80'
            }}>
              {isMalicious ? '⚠ ตรวจพบภัยคุกคาม' : '✓ ปลอดภัย / ปกติ'}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>ความเชื่อมั่น: <strong style={{ color: 'var(--text)' }}>{(result.confidence * 100).toFixed(2)}%</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isMalicious ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)', color: isMalicious ? '#f87171' : '#4ade80' }}>
              {isMalicious
                ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m10.3 3.9 8.7 15A1.8 1.8 0 0 1 17.5 21h-15a1.8 1.8 0 0 1-1.6-2.7L9 3.9a1.8 1.8 0 0 1 3 0ZM12 9v4M12 16.5v.01" /></svg>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{result.predicted_class}</div>
          </div>

          {result.caveat && (
            <div className="text-muted" style={{ fontSize: 12 }}>⚠ {result.caveat}</div>
          )}

          {result.all_probabilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>ค่าความน่าจะเป็นทั้งหมด</div>
              {Object.entries(result.all_probabilities).sort(([, a], [, b]) => b - a).map(([cls, prob]) => (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mono" style={{ width: 160, fontSize: 13, flexShrink: 0 }}>{cls}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-soft)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: isMalicious ? '#f87171' : '#4ade80', width: `${prob * 100}%` }} />
                  </div>
                  <span className="mono" style={{ width: 56, textAlign: 'right', fontSize: 13 }}>{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
