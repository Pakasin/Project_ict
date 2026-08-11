import { useState } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

export default function Login({ onLoginSuccess }) {
  const { t } = useApp()
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showSigninPw, setShowSigninPw] = useState(false)

  const [regUsername, setRegUsername] = useState('')
  const [regName, setRegName] = useState('')
  const [regLastname, setRegLastname] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [shake, setShake] = useState(false)

  function handleTabSwitch(mode) {
    playSound('click')
    setAuthMode(mode)
    setError(null)
    setSuccessMsg(null)
  }

  function triggerShake(message) {
    playSound('click')
    setError(message)
    setSuccessMsg(null)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  async function handleLoginSubmit(e) {
    e.preventDefault()
    if (!loginUsername.trim() || !loginPassword.trim()) {
      triggerShake('Please enter both username and password')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const localUsers = JSON.parse(localStorage.getItem('cybershield_registered_operators') || '[]')
      const foundUser = localUsers.find(
        (u) => u.username.toLowerCase() === loginUsername.trim().toLowerCase() && u.password === loginPassword
      )

      if (foundUser) {
        playSound('success')
        onLoginSuccess(foundUser.username, foundUser.role || 'General User', foundUser.email, {
          name: foundUser.name || foundUser.username,
          lastname: foundUser.lastname || '',
          phone: foundUser.phone || '-'
        })
        return
      }

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data = await res.json()

      if (data.ok) {
        playSound('success')
        onLoginSuccess(data.username, 'SOC Lead Operator', `${data.username}@cybershield.th`, {
          name: 'System', lastname: 'Administrator', phone: '-'
        })
      } else {
        triggerShake(data.message || 'Invalid username or password')
      }
    } catch (err) {
      triggerShake('Connection failed. Please verify the server is running')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleRegisterSubmit(e) {
    e.preventDefault()

    if (!regUsername.trim() || !regName.trim() || !regLastname.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirm.trim()) {
      triggerShake('Please fill in all registration fields')
      return
    }
    if (regUsername.trim().length < 3) { triggerShake('Username must be at least 3 characters long'); return }
    if (regName.trim().length < 2 || regLastname.trim().length < 2) { triggerShake('Please enter a valid first and last name'); return }
    if (!/^[0-9+\-()\s]{8,15}$/.test(regPhone.trim())) { triggerShake('Please enter a valid phone number'); return }
    if (!regEmail.includes('@') || !regEmail.includes('.')) { triggerShake('Please enter a valid email address'); return }
    if (!consentChecked) { triggerShake('Please accept the data-usage consent to continue'); return }
    if (regPassword.length < 6) { triggerShake('Password must be at least 6 characters long'); return }
    if (regPassword !== regConfirm) { triggerShake('Passwords do not match'); return }

    setLoading(true)
    setError(null)

    setTimeout(() => {
      try {
        const localUsers = JSON.parse(localStorage.getItem('cybershield_registered_operators') || '[]')
        const exists = localUsers.some((u) => u.username.toLowerCase() === regUsername.trim().toLowerCase())

        if (exists || regUsername.trim().toLowerCase() === 'admin') {
          triggerShake('Username already taken. Please choose another')
          setLoading(false)
          return
        }

        const newUser = {
          id: Date.now(),
          username: regUsername.trim(),
          name: regName.trim(),
          lastname: regLastname.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: 'General User',
          createdAt: new Date().toISOString(),
        }

        localStorage.setItem('cybershield_registered_operators', JSON.stringify([...localUsers, newUser]))
        playSound('success')
        setLoading(false)
        setAuthMode('signin')
        setLoginUsername(newUser.username)
        setSuccessMsg(t.login.signupSuccessNotice)
      } catch (err) {
        triggerShake('Failed to save registration data')
        console.error('Registration error:', err)
        setLoading(false)
      }
    }, 500)
  }

  const FEATURES = [
    { icon: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", viewBox: '0 0 20 24', title: t.login.featIntrusionTitle, desc: t.login.featIntrusionDesc },
    { icon: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4", viewBox: '0 0 24 24', title: t.login.featFlowTitle, desc: t.login.featFlowDesc },
    { icon: "M8.5 1.3L15.5 13H1.5L8.5 1.3ZM8.5 5.5v3.5M8.5 11v.01", viewBox: '0 0 16 16', title: t.login.featAlertTitle, desc: t.login.featAlertDesc },
  ]

  return (
    <div className="login-shell">
      <div className="login-side-panel">
        <div className="login-side-content">
          <div className="login-brand-row">
            <span className="shield-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
            </span>
            <h1 style={{ fontSize: 22, margin: 0, color: '#F1F4FA' }}>{t.brand}</h1>
          </div>
          <div className="login-side-tagline">{t.tagline}</div>
        </div>

        <div className="login-feature-list">
          {FEATURES.map((f, i) => (
            <div className="login-feature-item" key={i}>
              <span className="login-feature-icon">
                <svg width="16" height="16" viewBox={f.viewBox} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </span>
              <div className="login-feature-text">
                <div className="ft-title">{f.title}</div>
                <div className="ft-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="login-side-footer">
          <span className="status-dot dot-online"></span>{t.login.sideFooter}
        </div>
      </div>

      <div className="login-form-panel">
      <div className={`card elev-md login-card ${shake ? 'shake' : ''}`}>
        <div className="login-brand">
          <div className="login-brand-row" style={{ display: 'none' }}>
            <span className="shield-icon" style={{ width: 52, height: 52, borderRadius: 14 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
            </span>
          </div>
          <h1 style={{ fontSize: 21, margin: 0 }}>{authMode === 'signin' ? t.login.welcomeBack : t.login.tabSignup}</h1>
          <div className="login-tagline">{authMode === 'signin' ? t.login.signinSubtitle : t.login.signupSubtitle}</div>
        </div>

        <div className="auth-tabs">
          <button type="button" className={authMode === 'signin' ? 'active' : ''} onClick={() => handleTabSwitch('signin')}>{t.login.tabSignin}</button>
          <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => handleTabSwitch('signup')}>{t.login.tabSignup}</button>
        </div>

        {error && <div className="card login-notice" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
        {successMsg && <div className="card login-notice" style={{ borderColor: 'var(--color-accent)', fontSize: 13 }}>{successMsg}</div>}

        {authMode === 'signin' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="field">
              <label>{t.login.usernameLabel}</label>
              <input className="input" placeholder={t.login.usernamePh} value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} disabled={loading} autoFocus />
            </div>
            <div className="field">
              <label>{t.login.passwordLabel}</label>
              <div className="pw-field">
                <input className="input" type={showSigninPw ? 'text' : 'password'} placeholder={t.login.passwordPh} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={loading} />
                <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowSigninPw((s) => !s)}>
                  {showSigninPw ? t.login.hidePw : t.login.showPw}
                </button>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>{t.login.adminHint}</div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '...' : t.login.submitSignin}
            </button>
          </form>
        )}

        {authMode === 'signup' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="auth-grid">
              <div className="field"><label>{t.login.firstName}</label><input className="input" placeholder={t.login.firstNamePh} value={regName} onChange={(e) => setRegName(e.target.value)} disabled={loading} autoFocus /></div>
              <div className="field"><label>{t.login.lastName}</label><input className="input" placeholder={t.login.lastNamePh} value={regLastname} onChange={(e) => setRegLastname(e.target.value)} disabled={loading} /></div>
              <div className="field"><label>{t.login.usernameLabel}</label><input className="input" placeholder={t.login.usernamePh2} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={loading} /></div>
              <div className="field"><label>{t.login.phone}</label><input className="input" placeholder={t.login.phonePh} value={regPhone} onChange={(e) => setRegPhone(e.target.value)} disabled={loading} /></div>
            </div>
            <div className="field"><label>{t.login.email}</label><input className="input" placeholder={t.login.emailPh} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} /></div>
            <div className="auth-grid">
              <div className="field">
                <label>{t.login.passwordLabel}</label>
                <div className="pw-field">
                  <input className="input" type={showSignupPw ? 'text' : 'password'} minLength={6} placeholder={t.login.passwordPh2} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} />
                  <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowSignupPw((s) => !s)}>{showSignupPw ? t.login.hidePw : t.login.showPw}</button>
                </div>
              </div>
              <div className="field">
                <label>{t.login.confirmPassword}</label>
                <div className="pw-field">
                  <input className="input" type={showConfirmPw ? 'text' : 'password'} minLength={6} placeholder={t.login.confirmPh} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} disabled={loading} />
                  <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowConfirmPw((s) => !s)}>{showConfirmPw ? t.login.hidePw : t.login.showPw}</button>
                </div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{t.login.consentText}</span>
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !consentChecked}>
              {loading ? '...' : t.login.submitSignup}
            </button>
          </form>
        )}

        <div className="login-footer">
          <span className="tag tag-outline">{t.login.secureBadge}</span>
          <p style={{ fontSize: 12, margin: 0 }} className="text-muted">{t.login.footerNote}</p>
        </div>
      </div>
      </div>
    </div>
  )
}
