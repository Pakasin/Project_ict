import { useState } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

export default function Test() {
  const { t, isGeneralView } = useApp()
  const [activeTab, setActiveTab] = useState('sqli')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [sqliPayload, setSqliPayload] = useState("' OR 1=1 --")
  const [intrusionFeatures, setIntrusionFeatures] = useState(Array(41).fill('0'))
  const [flowFeatures, setFlowFeatures] = useState(Array(78).fill('0'))

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
    else if (scenario === 'portscan') { next[0]='3389'; next[1]='45'; next[14]='85000'; next[38]='1'; next[41]='1' }
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

  const isMalicious = result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header">
        <h2>{t.manual.title}</h2>
        <p className="text-muted">{t.manual.subtitle}</p>
      </div>

      <div className="seg">
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}><input type="radio" name="model" checked={activeTab === 'sqli'} onChange={() => { setActiveTab('sqli'); setResult(null); setError(null) }} />{t.manual.tabSql}</label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}><input type="radio" name="model" checked={activeTab === 'intrusion'} onChange={() => { setActiveTab('intrusion'); setResult(null); setError(null) }} />{t.manual.tabIntrusion}</label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}><input type="radio" name="model" checked={activeTab === 'flow'} onChange={() => { setActiveTab('flow'); setResult(null); setError(null) }} />{t.manual.tabFlow}</label>
      </div>

      {isGeneralView && <div className="text-muted" style={{ fontSize: 12 }}>{t.manual.readOnlyNotice}</div>}

      <div className="card blueprint elev-sm test-card">
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>

        {activeTab === 'sqli' && (
          <>
            <div className="field">
              <label>HTTP Raw Query / SQL String</label>
              <textarea className="input" value={sqliPayload} onChange={(e) => !isGeneralView && setSqliPayload(e.target.value)} readOnly={isGeneralView} rows={4} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{t.manual.presetsLabel}</span>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("' OR 1=1 --") }}>{t.manual.presetBoolean}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("1'; DROP TABLE users--") }}>{t.manual.presetStacked}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("admin' UNION SELECT username, password FROM credentials--") }}>{t.manual.presetUnion}</button>
              <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => { playSound('click'); setSqliPayload("SELECT name, price FROM products WHERE category = 'electronics'") }}>{t.manual.presetClean}</button>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('sqli')} disabled={loading || isGeneralView || !sqliPayload.trim()}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}

        {activeTab === 'intrusion' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>78 volumetric flow features — classifies DDoS, Slowloris DoS, PortScan.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('ddos')}>{t.manual.presetDdos}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('dos')}>{t.manual.presetDos}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('portscan')}>{t.manual.presetPortscan}</button>
                <button className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadFlowPreset('benign')}>{t.manual.presetBenign}</button>
              </div>
            </div>
            <div className="features-grid-scroll">
              {flowFeatures.map((val, i) => (
                <div key={i}>
                  <label>flow_feat_{i}</label>
                  <input className="input mono" type="number" step="any" value={val} disabled={isGeneralView}
                    onChange={(e) => updateFeature(flowFeatures, setFlowFeatures, i, e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('flow')} disabled={loading || isGeneralView}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="card blueprint result-card alert-result">
          <h3 style={{ color: 'var(--color-danger)', margin: 0 }}>Model Prediction Error</h3>
          <p className="mono" style={{ fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div className={`card blueprint result-card ${isMalicious ? 'alert-result' : 'safe-result'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`tag ${isMalicious ? 'tag-danger' : 'tag-accent'}`} style={{ fontSize: 13, padding: '5px 14px' }}>
              {isMalicious ? t.manual.resultThreat : t.manual.resultSafe}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>{t.manual.resultConfidence}: {(result.confidence * 100).toFixed(2)}%</span>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>{result.predicted_class}</div>

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
