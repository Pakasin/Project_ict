import { useState, useEffect } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'
import InfoHelp from '../components/InfoHelp'

export default function Test() {
  const { t, isGeneralView } = useApp()
  const [activeTab, setActiveTab] = useState('sqli')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)

  const [sqliPayload, setSqliPayload] = useState("' OR 1=1 --")
  const [intrusionFeatures, setIntrusionFeatures] = useState(Array(41).fill('0'))
  const [flowFeatures, setFlowFeatures] = useState(Array(78).fill('0'))

  useEffect(() => {
    fetch('/api/model-info').then((res) => res.json()).then((data) => { if (data.ok) setModelInfo(data) }).catch(() => {})
  }, [])

  function loadIntrusionPreset(scenario) {
    if (isGeneralView) return
    playSound('click'); setResult(null); setError(null)
    const next = Array(41).fill('0')
    if (scenario === 'r2l') { next[0]='4.5'; next[1]='1'; next[2]='20'; next[7]='3'; next[10]='5'; next[21]='1'; next[24]='0.85' }
    else if (scenario === 'u2r') { next[0]='1.2'; next[13]='1'; next[14]='1'; next[15]='4'; next[16]='6'; next[17]='2' }
    else if (scenario === 'normal') { next[0]='0.02'; next[4]='540'; next[5]='3240'; next[22]='12' }
    setIntrusionFeatures(next)
  }

  function loadFlowPreset(scenario) {
    if (isGeneralView) return
    playSound('click'); setResult(null); setError(null)
    const next = Array(78).fill('0')
    if (scenario === 'ddos') { next[0]='80'; next[1]='150'; next[2]='8500'; next[14]='145000'; next[18]='1.2'; next[38]='1' }
    else if (scenario === 'dos') { next[0]='443'; next[1]='115000000'; next[2]='12'; next[14]='0.12'; next[67]='1' }
    else if (scenario === 'benign') { next[0]='443'; next[1]='45000'; next[2]='18'; next[3]='24'; next[14]='840' }
    setFlowFeatures(next)
  }

  async function handlePredict(modelName) {
    if (isGeneralView) return
    playSound('click'); setLoading(true); setResult(null); setError(null)
    try {
      let body = { model_name: modelName }
      if (modelName === 'sqli') body.payload = sqliPayload
      else if (modelName === 'intrusion') body.features = intrusionFeatures.map((v) => Number(v) || 0)
      else if (modelName === 'flow') body.features = flowFeatures.map((v) => Number(v) || 0)

      const res = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        setResult(data.result)
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

  function updateFeature(features, setFeatures, index, value) {
    if (isGeneralView) return
    const updated = [...features]; updated[index] = value; setFeatures(updated)
  }

  const nslFeatureNames = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes', 'land', 'wrong_fragment', 'urgent', 'hot',
    'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login', 'is_guest_login', 'count', 'srv_count',
    'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate',
    'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate', 'dst_host_serror_rate', 'dst_host_srv_serror_rate',
    'dst_host_rerror_rate', 'dst_host_srv_rerror_rate',
  ]

  const isMalicious = !!result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'
  const flowIgnoredNames = modelInfo?.flow ? modelInfo.flow.raw_feature_names.filter((n) => !modelInfo.flow.trained_feature_names.includes(n)) : []

  const MODEL_TABS = [
    { key: 'sqli', label: t.manual.tabSql, desc: 'SQLi · Embedding LSTM', icon: 'icon-box-green', help: 'sqliModelHelp', path: "M12 3 4.5 12c0 5 3.5 8.5 7.5 9 4-1.5 7.5-4.5 7.5-9L19.5 3zm-4 9 3 3 5-5" },
    { key: 'intrusion', label: t.manual.tabIntrusion, desc: 'NSL-KDD · R2L/U2R', icon: 'icon-box-red', help: 'unswNb15', path: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", viewBox: '0 0 20 24' },
    { key: 'flow', label: t.manual.tabFlow, desc: 'CSE-CIC-IDS2018 · DoS/DDoS', icon: 'icon-box-amber', help: 'cicIds2018', path: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4" },
  ]

  const activeModel = MODEL_TABS.find((m) => m.key === activeTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="dash-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18v16H3V4zM7 9l3 3-3 3M12 15h4" /></svg>
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{t.manual.title}</h2>
          <p className="text-muted" style={{ margin: 0 }}>{t.manual.subtitle}</p>
        </div>
      </div>

      <div className="test-model-tabs">
        {MODEL_TABS.map((m) => (
          <div key={m.key} className={`test-model-tab ${activeTab === m.key ? 'active' : ''}`}
            onClick={() => { playSound('click'); setActiveTab(m.key); setResult(null); setError(null) }}>
            <span className={`stat-icon-box ${m.icon}`}>
              <svg width="16" height="16" viewBox={m.viewBox || '0 0 24 24'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={m.path} /></svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="tab-title">{m.label} <InfoHelp id={m.help} /></div>
              <div className="tab-desc">{m.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {isGeneralView && <div className="text-muted" style={{ fontSize: 12 }}>{t.manual.readOnlyNotice}</div>}

      <div className="card elev-sm test-card">
        {activeTab === 'sqli' && (
          <>
            <div className="field">
              <label>HTTP Raw Query / SQL String</label>
              <textarea className="input" value={sqliPayload} onChange={(e) => !isGeneralView && setSqliPayload(e.target.value)} readOnly={isGeneralView} rows={4} />
            </div>
            <div className="preset-toolbar">
              <span className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{t.manual.presetsLabel} <InfoHelp id="presetsHelp" /></span>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("' OR 1=1 --") }}>{t.manual.presetBoolean}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("1'; DROP TABLE users--") }}>{t.manual.presetStacked}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("admin' UNION SELECT username, password FROM credentials--") }}>{t.manual.presetUnion}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("SELECT name, price FROM products WHERE category = 'electronics'") }}>{t.manual.presetClean}</button>
              <InfoHelp id="cleanBaseline" />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('sqli')} disabled={loading || isGeneralView || !sqliPayload.trim()}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}

        {activeTab === 'intrusion' && (
          <>
            <div className="preset-toolbar" style={{ justifyContent: 'space-between' }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>41 packet features — classifies R2L and U2R privilege attacks.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadIntrusionPreset('r2l')}>{t.manual.presetR2l}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadIntrusionPreset('u2r')}>{t.manual.presetU2r}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadIntrusionPreset('normal')}>{t.manual.presetNormal}</button>
              </div>
            </div>
            <div className="features-grid-scroll">
              {intrusionFeatures.map((val, i) => (
                <div key={i}>
                  <label>[{i}] {nslFeatureNames[i] || `feat_${i}`}</label>
                  <input className="input mono" type="number" step="any" value={val} disabled={isGeneralView}
                    onChange={(e) => updateFeature(intrusionFeatures, setIntrusionFeatures, i, e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('intrusion')} disabled={loading || isGeneralView}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}

        {activeTab === 'flow' && (
          <>
            <div className="preset-toolbar" style={{ justifyContent: 'space-between' }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>78 raw flow features (7 fingerprint columns dropped server-side) — classifies DoS, DDoS, and BruteForce.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('ddos')}>{t.manual.presetDdos}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('dos')}>{t.manual.presetDos}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('benign')}>{t.manual.presetBenign}</button>
              </div>
            </div>
            <div className="features-grid-scroll">
              {flowFeatures.map((val, i) => {
                const name = modelInfo?.flow?.raw_feature_names?.[i] || `flow_feat_${i}`
                const ignored = flowIgnoredNames.includes(name)
                return (
                  <div key={i} style={ignored ? { opacity: 0.5 } : undefined}>
                    <label title={ignored ? 'Dropped server-side (fingerprint feature) — not seen by the model' : undefined}>[{i}] {name}{ignored ? ' (ignored)' : ''}</label>
                    <input className="input mono" type="number" step="any" value={val} disabled={isGeneralView}
                      onChange={(e) => updateFeature(flowFeatures, setFlowFeatures, i, e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }} />
                  </div>
                )
              })}
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('flow')} disabled={loading || isGeneralView}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="card result-card alert-result">
          <h3 style={{ color: 'var(--color-danger)', margin: 0 }}>Model Prediction Error</h3>
          <p className="mono" style={{ fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div className={`card result-card ${isMalicious ? 'alert-result' : 'safe-result'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`tag ${isMalicious ? 'tag-danger' : 'tag-accent'}`} style={{ fontSize: 13, padding: '5px 14px' }}>
              {isMalicious ? t.manual.resultThreat : t.manual.resultSafe}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>{t.manual.resultConfidence}: {(result.confidence * 100).toFixed(2)}%</span>
          </div>
          <div className="result-header-row">
            <span className={`stat-icon-box ${isMalicious ? 'icon-box-red' : 'icon-box-green'}`}>
              {isMalicious
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10.3 3.9 8.7 15A1.8 1.8 0 0 1 17.5 21h-15a1.8 1.8 0 0 1-1.6-2.7L9 3.9a1.8 1.8 0 0 1 3 0ZM12 9v4M12 16.5v.01" /></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
            </span>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>{result.predicted_class}</div>
          </div>

          {result.caveat && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>⚠ {result.caveat}</div>
          )}

          {result.all_probabilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{t.manual.probSpectrum}</div>
              {Object.entries(result.all_probabilities).sort(([, a], [, b]) => b - a).map(([cls, prob]) => (
                <div key={cls} className="prob-row">
                  <span className="mono" style={{ width: 150, fontSize: 13 }}>{cls}</span>
                  <div className="prob-bar-bg"><div className="prob-bar-fill" style={{ width: `${prob * 100}%` }} /></div>
                  <span className="mono" style={{ width: 60, textAlign: 'right', fontSize: 13 }}>{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
