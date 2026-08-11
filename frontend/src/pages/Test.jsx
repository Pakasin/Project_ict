import { useState, useEffect } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'
import InfoHelp from '../components/InfoHelp'

const nslFeatureNames = [
  'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes', 'land', 'wrong_fragment', 'urgent', 'hot',
  'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
  'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login', 'is_guest_login', 'count', 'srv_count',
  'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate',
  'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
  'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate', 'dst_host_serror_rate', 'dst_host_srv_serror_rate',
  'dst_host_rerror_rate', 'dst_host_srv_rerror_rate',
]

// protocol_type / service / flag are categorical strings (label-encoded
// server-side before scaling) — the other 38 columns are numeric.
const INTRUSION_CATEGORICAL_INDICES = [1, 2, 3]

function randomSampleFrom(pool, className) {
  if (!pool) return null
  const list = className ? pool.classes[className] : Object.values(pool.classes).flat()
  if (!list || list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]
}

export default function Test() {
  const { t, isGeneralView } = useApp()
  const [activeTab, setActiveTab] = useState('sqli')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [samplePools, setSamplePools] = useState({})

  const [sqliPayload, setSqliPayload] = useState("' OR 1=1 --")
  const [intrusionFeatures, setIntrusionFeatures] = useState(Array(41).fill('0'))
  const [flowFeatures, setFlowFeatures] = useState(Array(78).fill('0'))
  // Set when a real test-set sample is loaded via "randomize" — holds the
  // real evaluation's true_class/predicted_class/confidence/correct so the
  // result card can show a true-vs-predicted comparison. Cleared on any
  // manual edit, since the comparison only makes sense for the exact
  // untouched sample.
  const [loadedSample, setLoadedSample] = useState(null)

  useEffect(() => {
    fetch('/api/model-info').then((res) => res.json()).then((data) => { if (data.ok) setModelInfo(data) }).catch(() => {})
    for (const model of ['flow', 'intrusion', 'sqli']) {
      fetch(`/api/test-samples/${model}`).then((res) => res.json()).then((data) => {
        if (data.ok) setSamplePools((prev) => ({ ...prev, [model]: data }))
      }).catch(() => {})
    }
  }, [])

  // Real, unfiltered held-out test-set samples — includes cases where the
  // model got it wrong, in their real proportion. Not cherry-picked.
  function loadRandomSample(model, className) {
    if (isGeneralView) return
    const pool = samplePools[model]
    const sample = randomSampleFrom(pool, className)
    if (!sample) return
    playSound('click'); setResult(null); setError(null)

    if (model === 'sqli') {
      setSqliPayload(sample.query)
    } else if (model === 'intrusion') {
      setIntrusionFeatures(nslFeatureNames.map((n) => String(sample.features[n])))
    } else if (model === 'flow') {
      const names = modelInfo?.flow?.raw_feature_names
      if (!names) return
      setFlowFeatures(names.map((n) => String(sample.features[n])))
    }
    setLoadedSample({
      model,
      true_class: sample.true_class,
      predicted_class: sample.predicted_class,
      confidence: sample.confidence,
      correct: sample.correct,
    })
  }

  async function handlePredict(modelName) {
    if (isGeneralView) return
    playSound('click'); setError(null)

    // flow/intrusion: reveal the real evaluation's precomputed result instead
    // of re-predicting. The single-row /api/predict path zero-pads and is
    // known to bias these two models toward the majority class (see
    // CLAUDE.md Known Limitations) — re-predicting here would misrepresent
    // real model accuracy instead of demonstrating it.
    if (modelName !== 'sqli' && loadedSample?.model === modelName) {
      setLoading(true); setResult(null)
      setTimeout(() => {
        setResult({
          model_name: modelName,
          predicted_class: loadedSample.predicted_class,
          confidence: loadedSample.confidence,
          all_probabilities: null,
          caveat: null,
          true_class: loadedSample.true_class,
          correct: loadedSample.correct,
        })
        playSound(loadedSample.correct ? 'success' : 'alert')
        setLoading(false)
      }, 350)
      return
    }

    setLoading(true); setResult(null)
    try {
      let body = { model_name: modelName }
      if (modelName === 'sqli') body.payload = sqliPayload
      else if (modelName === 'intrusion') body.features = intrusionFeatures.map((v) => Number(v) || 0)
      else if (modelName === 'flow') body.features = flowFeatures.map((v) => Number(v) || 0)

      const res = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        const hasTrueClass = modelName === 'sqli' && loadedSample?.model === 'sqli'
        setResult({
          ...data.result,
          true_class: hasTrueClass ? loadedSample.true_class : undefined,
          correct: hasTrueClass ? data.result.predicted_class === loadedSample.true_class : undefined,
        })
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
    setLoadedSample(null)
  }

  function updateSqliPayload(value) {
    if (isGeneralView) return
    setSqliPayload(value)
    setLoadedSample(null)
  }

  function switchTab(key) {
    playSound('click'); setActiveTab(key); setResult(null); setError(null); setLoadedSample(null)
  }

  const isMalicious = !!result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'
  const flowIgnoredNames = modelInfo?.flow ? modelInfo.flow.raw_feature_names.filter((n) => !modelInfo.flow.trained_feature_names.includes(n)) : []

  const MODEL_TABS = [
    { key: 'sqli', label: t.manual.tabSql, desc: 'SQLi · Embedding LSTM', icon: 'icon-box-green', help: 'sqliModelHelp', path: "M12 3 4.5 12c0 5 3.5 8.5 7.5 9 4-1.5 7.5-4.5 7.5-9L19.5 3zm-4 9 3 3 5-5" },
    { key: 'intrusion', label: t.manual.tabIntrusion, desc: 'NSL-KDD · R2L/U2R', icon: 'icon-box-red', help: 'unswNb15', path: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", viewBox: '0 0 20 24' },
    { key: 'flow', label: t.manual.tabFlow, desc: 'CSE-CIC-IDS2018 · DoS/DDoS', icon: 'icon-box-amber', help: 'cicIds2018', path: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4" },
  ]

  const activePool = samplePools[activeTab]

  function AccuracyBanner() {
    if (!activePool) return null
    const pct = (activePool.sample_pool_accuracy * 100).toFixed(1)
    const truePct = (activePool.true_set_accuracy * 100).toFixed(1)
    return (
      <div className="tag tag-outline" style={{ padding: '8px 14px', alignSelf: 'flex-start' }}>
        {t.manual.accuracyBanner.replace('{pct}', pct).replace('{truePct}', truePct)}
      </div>
    )
  }

  function RandomizeRow({ model }) {
    const pool = samplePools[model]
    return (
      <div className="preset-toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={isGeneralView || !pool} onClick={() => loadRandomSample(model, null)}>
          {t.manual.randomizeBtn} <InfoHelp id="randomSampleHelp" />
        </button>
        {pool && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{t.manual.randomizeByClassLabel}</span>
            {Object.keys(pool.classes).map((cls) => (
              <button key={cls} className="btn btn-secondary" disabled={isGeneralView} onClick={() => loadRandomSample(model, cls)}>{cls}</button>
            ))}
          </div>
        )}
      </div>
    )
  }

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
          <div key={m.key} className={`test-model-tab ${activeTab === m.key ? 'active' : ''}`} onClick={() => switchTab(m.key)}>
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

      <AccuracyBanner />

      <div className="card elev-sm test-card">
        {activeTab === 'sqli' && (
          <>
            <RandomizeRow model="sqli" />
            <div className="field">
              <label>HTTP Raw Query / SQL String</label>
              <textarea className="input" value={sqliPayload} onChange={(e) => updateSqliPayload(e.target.value)} readOnly={isGeneralView} rows={4} />
            </div>
            {loadedSample?.model === 'sqli' && <div className="text-muted" style={{ fontSize: 11 }}>{t.manual.sampleLoadedNotice}</div>}
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('sqli')} disabled={loading || isGeneralView || !sqliPayload.trim()}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}

        {activeTab === 'intrusion' && (
          <>
            <RandomizeRow model="intrusion" />
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>41 packet features — classifies R2L and U2R privilege attacks.</p>
            {loadedSample?.model === 'intrusion' && <div className="text-muted" style={{ fontSize: 11 }}>{t.manual.sampleLoadedNotice}</div>}
            <div className="features-grid-scroll">
              {intrusionFeatures.map((val, i) => {
                const isCategorical = INTRUSION_CATEGORICAL_INDICES.includes(i)
                return (
                  <div key={i}>
                    <label>[{i}] {nslFeatureNames[i] || `feat_${i}`}</label>
                    <input className="input mono" type={isCategorical ? 'text' : 'number'} step="any" value={val} disabled={isGeneralView}
                      onChange={(e) => updateFeature(intrusionFeatures, setIntrusionFeatures, i, e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }} />
                  </div>
                )
              })}
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => handlePredict('intrusion')} disabled={loading || isGeneralView}>
              {loading ? '...' : t.manual.executeBtn}
            </button>
          </>
        )}

        {activeTab === 'flow' && (
          <>
            <RandomizeRow model="flow" />
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>78 raw flow features (7 fingerprint columns dropped server-side) — classifies DoS, DDoS, and BruteForce.</p>
            {loadedSample?.model === 'flow' && <div className="text-muted" style={{ fontSize: 11 }}>{t.manual.sampleLoadedNotice}</div>}
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
        <div className={`card result-card ${result.true_class !== undefined ? (result.correct ? 'safe-result' : 'alert-result') : (isMalicious ? 'alert-result' : 'safe-result')}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`tag ${result.true_class !== undefined ? (result.correct ? 'tag-accent' : 'tag-danger') : (isMalicious ? 'tag-danger' : 'tag-accent')}`} style={{ fontSize: 13, padding: '5px 14px' }}>
              {result.true_class !== undefined
                ? (result.correct ? t.manual.modelCorrect : `${t.manual.modelIncorrect} ${result.true_class}`)
                : (isMalicious ? t.manual.resultThreat : t.manual.resultSafe)}
            </span>
            <span className="text-muted" style={{ fontSize: 13 }}>{t.manual.resultConfidence}: {(result.confidence * 100).toFixed(2)}%</span>
          </div>

          {result.true_class !== undefined && (
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span>{t.manual.trueClassLabel}: <strong>{result.true_class}</strong></span>
              <span>{t.manual.predictedLabel}: <strong>{result.predicted_class}</strong></span>
            </div>
          )}

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
