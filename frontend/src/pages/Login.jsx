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
      if (loginUsername.trim().toLowerCase() === 'admin' && loginPassword === 'admin12345') {
        playSound('success')
        onLoginSuccess('admin', 'SOC Lead Operator', 'admin@cybershield.th', { name: 'admin', lastname: 'Administrator', phone: '-' })
        return
      }

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

  return (
    <div className="login-shell">
      <div className={`card blueprint elev-md login-card ${shake ? 'shake' : ''}`}>
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>

        <div className="login-brand">
          <div className="login-brand-row">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
            <h1 style={{ fontSize: 26, margin: 0 }}>{t.brand}</h1>
          </div>
          <div className="login-tagline">{t.tagline}</div>
        </div>

        {error && <div className="card blueprint login-notice" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
        {successMsg && <div className="card blueprint login-notice" style={{ borderColor: 'var(--color-accent)', fontSize: 13 }}>{successMsg}</div>}

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
            <div style={{ textAlign: 'center', fontSize: 13 }}>
              {t.login.noAccountText} <a href="#" onClick={(e) => { e.preventDefault(); handleTabSwitch('signup') }}>{t.login.tabSignup}</a>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 20, margin: 0, textAlign: 'center' }}>{t.login.tabSignup}</h2>
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
            <div style={{ textAlign: 'center', fontSize: 13 }}>
              {t.login.haveAccountText} <a href="#" onClick={(e) => { e.preventDefault(); handleTabSwitch('signin') }}>{t.login.tabSignin}</a>
            </div>
          </form>
        )}

        <div className="login-footer">
          <span className="tag tag-outline">{t.login.secureBadge}</span>
          <p style={{ fontSize: 12, margin: 0 }} className="text-muted">{t.login.footerNote}</p>
        </div>
      </div>
    </div>
  )
}
