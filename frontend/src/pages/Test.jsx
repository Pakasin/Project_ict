import { useState } from 'react'

export default function Test() {
  const [activeTab, setActiveTab] = useState('sqli')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // SQLi input
  const [sqliPayload, setSqliPayload] = useState("' OR 1=1 --")

  // Feature inputs (simplified — common features with defaults)
  const [intrusionFeatures, setIntrusionFeatures] = useState(
    Array(41).fill('0')
  )
  const [flowFeatures, setFlowFeatures] = useState(
    Array(78).fill('0')
  )

  async function handlePredict(modelName) {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      let body = { model_name: modelName }

      if (modelName === 'sqli') {
        body.payload = sqliPayload
      } else if (modelName === 'intrusion') {
        body.features = intrusionFeatures.map(Number)
      } else if (modelName === 'flow') {
        body.features = flowFeatures.map(Number)
      }

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.ok) {
        setResult(data.result)
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
    const updated = [...features]
    updated[index] = value
    setFeatures(updated)
  }

  // UNSW-NB15 feature names (key ones)
  const nslFeatureNames = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes',
    'dst_bytes', 'land', 'wrong_fragment', 'urgent', 'hot',
    'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell',
    'su_attempted', 'num_root', 'num_file_creations', 'num_shells',
    'num_access_files', 'num_outbound_cmds', 'is_host_login',
    'is_guest_login', 'count', 'srv_count', 'serror_rate',
    'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate', 'same_srv_rate',
    'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count',
    'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate',
    'dst_host_serror_rate', 'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate',
  ]

  return (
    <div>
      <div className="page-header">
        <h1>🧪 Manual Test</h1>
        <p>
          Send payloads directly to models — bypasses sensors.
          Used for demo and debugging.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          id="tab-sqli"
          className={`tab-btn ${activeTab === 'sqli' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sqli'); setResult(null); setError(null) }}
        >
          💉 SQL Injection
        </button>
        <button
          id="tab-intrusion"
          className={`tab-btn ${activeTab === 'intrusion' ? 'active' : ''}`}
          onClick={() => { setActiveTab('intrusion'); setResult(null); setError(null) }}
        >
          🔐 Intrusion (UNSW-NB15)
        </button>
        <button
          id="tab-flow"
          className={`tab-btn ${activeTab === 'flow' ? 'active' : ''}`}
          onClick={() => { setActiveTab('flow'); setResult(null); setError(null) }}
        >
          🌊 Flow (CSE-CIC-IDS2018)
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {/* === SQLi Tab === */}
        {activeTab === 'sqli' && (
          <div>
            <div className="form-group">
              <label htmlFor="sqli-payload">SQL Query Payload</label>
              <textarea
                id="sqli-payload"
                className="form-textarea"
                value={sqliPayload}
                onChange={(e) => setSqliPayload(e.target.value)}
                placeholder="Enter SQL query to test, e.g.: ' OR 1=1 --"
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick examples:</span>
              {[
                "' OR 1=1 --",
                "1'; DROP TABLE users--",
                "admin' UNION SELECT * FROM passwords--",
                "SELECT * FROM products WHERE id = 1",
              ].map((example) => (
                <button
                  key={example}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  onClick={() => setSqliPayload(example)}
                >
                  {example.substring(0, 30)}{example.length > 30 ? '...' : ''}
                </button>
              ))}
            </div>

            <button
              id="predict-sqli"
              className="btn btn-primary"
              onClick={() => handlePredict('sqli')}
              disabled={loading || !sqliPayload.trim()}
            >
              {loading ? '⏳ Analyzing...' : '🔍 Analyze Query'}
            </button>
          </div>
        )}

        {/* === Intrusion Tab === */}
        {activeTab === 'intrusion' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter 41 UNSW-NB15 features. The model will detect R2L and U2R attacks.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px', padding: '4px' }}>
              {intrusionFeatures.map((val, i) => (
                <div className="form-group" key={i} style={{ marginBottom: 0 }}>
                  <label htmlFor={`nsl-feature-${i}`} style={{ fontSize: '0.65rem' }}>
                    [{i}] {nslFeatureNames[i] || `feature_${i}`}
                  </label>
                  <input
                    id={`nsl-feature-${i}`}
                    className="form-input"
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => updateFeature(intrusionFeatures, setIntrusionFeatures, i, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  />
                </div>
              ))}
            </div>

            <button
              id="predict-intrusion"
              className="btn btn-primary"
              onClick={() => handlePredict('intrusion')}
              disabled={loading}
            >
              {loading ? '⏳ Predicting...' : '🔐 Run Intrusion Model'}
            </button>
          </div>
        )}

        {/* === Flow Tab === */}
        {activeTab === 'flow' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter 78 CSE-CIC-IDS2018 features. The model will detect DDoS, DoS, PortScan, and BruteForce attacks.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px', padding: '4px' }}>
              {flowFeatures.map((val, i) => (
                <div className="form-group" key={i} style={{ marginBottom: 0 }}>
                  <label htmlFor={`cic-feature-${i}`} style={{ fontSize: '0.65rem' }}>
                    feature_{i}
                  </label>
                  <input
                    id={`cic-feature-${i}`}
                    className="form-input"
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => updateFeature(flowFeatures, setFlowFeatures, i, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  />
                </div>
              ))}
            </div>

            <button
              id="predict-flow"
              className="btn btn-primary"
              onClick={() => handlePredict('flow')}
              disabled={loading}
            >
              {loading ? '⏳ Predicting...' : '🌊 Run Flow Model'}
            </button>
          </div>
        )}
      </div>

      {/* Result Display */}
      {error && (
        <div className="result-card alert-result">
          <h3 style={{ color: 'var(--red)', marginBottom: '8px' }}>❌ Error</h3>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      {result && (
        <div className={`result-card ${result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN' ? 'alert-result' : 'safe-result'}`}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN' ? '🚨' : '✅'}
            Prediction Result
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Model</div>
              <div style={{ fontWeight: 600 }}>
                <span className={`event-model-badge ${result.model_name}`}>
                  {result.model_name}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Predicted Class</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                {result.predicted_class}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Confidence</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem' }}
                className={result.confidence >= 0.85 ? 'confidence-high' : result.confidence >= 0.6 ? 'confidence-medium' : 'confidence-low'}>
                {(result.confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Probability Breakdown */}
          {result.all_probabilities && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                All Probabilities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(result.all_probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cls, prob]) => (
                    <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '120px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{cls}</span>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${prob * 100}%`,
                          height: '100%',
                          background: prob === result.confidence
                            ? 'linear-gradient(90deg, var(--cyan), var(--purple))'
                            : 'var(--border-color)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ width: '55px', textAlign: 'right', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
