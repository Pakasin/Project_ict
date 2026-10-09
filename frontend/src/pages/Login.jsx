// ─────────────────────────────────────────────────────────────────────────────
// pages/Login.jsx — หน้าล็อกอินและสมัครสมาชิก
//
// รองรับ 2 โหมด (Tab): Sign In และ Sign Up
// Sign In: ตรวจสอบกับ localStorage ก่อน ถ้าไม่เจอจึง call API /api/login
// Sign Up: บันทึก user ใหม่ลง localStorage (role: General User)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { playSound } from '../utils/sound'
import { useApp } from '../context/AppContext'

/**
 * Login — หน้าล็อกอิน / สมัครสมาชิก
 * @param {function} onLoginSuccess - callback เมื่อล็อกอินสำเร็จ (ส่ง username, role, email, profile)
 */
export default function Login({ onLoginSuccess }) {
  const { t } = useApp()

  // ── โหมดปัจจุบัน: 'signin' หรือ 'signup' ──
  const [authMode, setAuthMode] = useState('signin')

  // ── State ฟอร์ม Sign In ──
  const [loginUsername, setLoginUsername] = useState('')   // ช่อง Username
  const [loginPassword, setLoginPassword] = useState('')   // ช่อง Password
  const [showSigninPw, setShowSigninPw] = useState(false)  // toggle แสดง/ซ่อน password
  const [mfaStep, setMfaStep] = useState(false)            // รหัสผ่านถูกแล้ว กำลังรอรหัส MFA
  const [mfaCode, setMfaCode] = useState('')               // รหัส TOTP 6 หลัก หรือ recovery code

  // ── State ฟอร์ม Sign Up ──
  const [regUsername, setRegUsername] = useState('')       // ชื่อผู้ใช้ (username)
  const [regName, setRegName] = useState('')               // ชื่อจริง
  const [regLastname, setRegLastname] = useState('')       // นามสกุล
  const [regPhone, setRegPhone] = useState('')             // เบอร์โทรศัพท์
  const [regEmail, setRegEmail] = useState('')             // อีเมล
  const [regPassword, setRegPassword] = useState('')       // รหัสผ่าน
  const [regConfirm, setRegConfirm] = useState('')         // ยืนยันรหัสผ่าน
  const [showSignupPw, setShowSignupPw] = useState(false)  // toggle แสดง/ซ่อน password
  const [showConfirmPw, setShowConfirmPw] = useState(false)// toggle แสดง/ซ่อน confirm password
  const [consentChecked, setConsentChecked] = useState(false) // checkbox ยินยอมข้อมูล

  // ── State ทั่วไป ──
  const [loading, setLoading] = useState(false)       // กำลังส่งฟอร์ม (ปิดปุ่ม)
  const [error, setError] = useState(null)            // ข้อความ error
  const [successMsg, setSuccessMsg] = useState(null)  // ข้อความสำเร็จ (หลังสมัครสมาชิก)
  const [shake, setShake] = useState(false)           // animation สั่น card เมื่อ error

  // ── สลับ Tab Sign In / Sign Up ──
  function handleTabSwitch(mode) {
    playSound('click')
    setAuthMode(mode)
    setError(null)        // ล้าง error เมื่อเปลี่ยน tab
    setSuccessMsg(null)
  }

  /**
   * triggerShake — แสดง error พร้อม animation สั่น card
   * @param {string} message - ข้อความ error ที่จะแสดง
   */
  function triggerShake(message) {
    playSound('click')
    setError(message)
    setSuccessMsg(null)
    setShake(true)
    setTimeout(() => setShake(false), 500) // หยุด animation หลัง 500ms
  }

  // ─────────────────────────────────────────────────────────────────────────
  // หน้าล็อกอิน — ส่วนของ handleLoginSubmit (Sign In logic)
  // ลำดับการตรวจสอบ:
  //   POST /api/login — admin (.env) หรือ General User (ตาราง users) ตรวจที่ backend ทั้งหมด
  // ─────────────────────────────────────────────────────────────────────────
  async function handleLoginSubmit(e) {
    e.preventDefault()

    // validation: ต้องกรอก username และ password
    if (!loginUsername.trim() || !loginPassword.trim()) {
      triggerShake('Please enter both username and password')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      // บัญชีทั้งหมด (admin จาก .env และ General User ที่สมัคร) ตรวจที่ backend — ได้ session cookie จริง
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      })
      const data = await res.json()

      if (data.ok) {
        finishLogin(data)
      } else if (data.mfa_required) {
        setMfaStep(true)
        setMfaCode('')
      } else {
        triggerShake(data.message || 'Invalid username or password')
      }
    } catch (err) {
      // กรณี network error (server ไม่รัน หรือ CORS)
      triggerShake('Connection failed. Please verify the server is running')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  function finishLogin(data) {
    playSound('success')
    onLoginSuccess(
      data.username,
      data.role === 'admin' ? 'SOC Lead Operator' : 'General User',
      data.email,
      data.profile,
    )
  }

  // ขั้นที่ 2: ส่งรหัส TOTP / recovery code ไปที่ POST /api/login/mfa
  async function handleMfaSubmit(e) {
    e.preventDefault()
    if (!mfaCode.trim()) { triggerShake('Please enter the verification code'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/login/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      const data = await res.json()
      if (data.ok) finishLogin(data)
      else {
        if (!data.mfa_required) { setMfaStep(false); setLoginPassword('') } // หมดเวลา/ถูกล็อก → เริ่มใหม่
        triggerShake(data.message || 'Invalid verification code')
      }
    } catch (err) {
      triggerShake('Connection failed. Please verify the server is running')
      console.error('MFA error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // หน้าสมัครสมาชิก — ส่วนของ handleRegisterSubmit (Sign Up logic)
  // สมัครผ่าน POST /api/register (เก็บในตาราง users ของ backend, role: General User)
  // ─────────────────────────────────────────────────────────────────────────
  async function handleRegisterSubmit(e) {
    e.preventDefault()

    // ── Validation ทุกช่อง ──
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

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(), password: regPassword, name: regName.trim(),
          lastname: regLastname.trim(), phone: regPhone.trim(), email: regEmail.trim(),
        }),
      })
      const data = await res.json()
      if (!data.ok) { triggerShake(data.message || 'Registration failed'); return }
      playSound('success')
      // สลับกลับไป Sign In แล้วกรอก username ให้อัตโนมัติ
      setAuthMode('signin')
      setLoginUsername(data.username)
      setSuccessMsg(t.login.signupSuccessNotice) // ข้อความ "สมัครสำเร็จ กรุณาล็อกอิน"
    } catch (err) {
      triggerShake('Connection failed. Please verify the server is running')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Feature cards แสดงในแถบซ้ายของหน้าล็อกอิน (ฟีเจอร์ระบบ) ──
  const FEATURES = [
    { icon: "M10 1L18 4V11C18 17 14 21 10 23C6 21 2 17 2 11V4L10 1Z", viewBox: '0 0 20 24', title: t.login.featIntrusionTitle, desc: t.login.featIntrusionDesc },
    { icon: "M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4", viewBox: '0 0 24 24', title: t.login.featFlowTitle, desc: t.login.featFlowDesc },
    { icon: "M8.5 1.3L15.5 13H1.5L8.5 1.3ZM8.5 5.5v3.5M8.5 11v.01", viewBox: '0 0 16 16', title: t.login.featAlertTitle, desc: t.login.featAlertDesc },
  ]

  return (
    // ── Layout หลัก: แบ่ง 2 ส่วน (แถบซ้าย + ฟอร์ม) ──
    <div className="login-shell">

      {/* ── แถบซ้าย: แสดง Brand + Feature List + Footer status ── */}
      <div className="login-side-panel">
        <div className="login-side-content">
          {/* โลโก้และชื่อแอป */}
          <div className="login-brand-row">
            <span className="shield-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
            </span>
            <h1 style={{ fontSize: 22, margin: 0, color: '#F1F4FA' }}>{t.brand}</h1>
          </div>
          <div className="login-side-tagline">{t.tagline}</div>
        </div>

        {/* รายการฟีเจอร์ของระบบ (Intrusion Detection, Flow Analysis, Alert) */}
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

        {/* Status footer: dot สีเขียว + ข้อความระบบออนไลน์ */}
        <div className="login-side-footer">
          <span className="status-dot dot-online"></span>{t.login.sideFooter}
        </div>
      </div>

      {/* ── แถบขวา: Card ฟอร์มล็อกอิน/สมัครสมาชิก ── */}
      <div className="login-form-panel">
        {/* shake class เพิ่มเมื่อมี error เพื่อ animation สั่น */}
        <div className={`card elev-md login-card ${shake ? 'shake' : ''}`}>

          {/* ── หัว Card: ชื่อหน้าและ subtitle ── */}
          <div className="login-brand">
            <div className="login-brand-row" style={{ display: 'none' }}>
              <span className="shield-icon" style={{ width: 52, height: 52, borderRadius: 14 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path></svg>
              </span>
            </div>
            <h1 style={{ fontSize: 21, margin: 0 }}>{authMode === 'signin' ? t.login.welcomeBack : t.login.tabSignup}</h1>
            <div className="login-tagline">{authMode === 'signin' ? t.login.signinSubtitle : t.login.signupSubtitle}</div>
          </div>

          {/* ── Tab เลือก Sign In / Sign Up ── */}
          <div className="auth-tabs">
            <button type="button" className={authMode === 'signin' ? 'active' : ''} onClick={() => handleTabSwitch('signin')}>{t.login.tabSignin}</button>
            <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => handleTabSwitch('signup')}>{t.login.tabSignup}</button>
          </div>

          {/* ── แสดง Error / Success notice ── */}
          {error && <div className="card login-notice" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
          {successMsg && <div className="card login-notice" style={{ borderColor: 'var(--color-accent)', fontSize: 13 }}>{successMsg}</div>}

          {/* ─────────────────────────────────────────────────────────────────────
              หน้าล็อกอิน — ส่วนของฟอร์ม Sign In
          ───────────────────────────────────────────────────────────────────── */}
          {authMode === 'signin' && mfaStep && (
            <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="field">
                <label>Verification code</label>
                <input className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="123456 / recovery code"
                  value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} disabled={loading} autoFocus />
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Enter the 6-digit code from your authenticator app, or a one-time recovery code.</div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? '...' : 'Verify'}</button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => { setMfaStep(false); setLoginPassword(''); setError(null) }}>Back</button>
            </form>
          )}
          {authMode === 'signin' && !mfaStep && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* ช่อง Username */}
              <div className="field">
                <label>{t.login.usernameLabel}</label>
                <input className="input" placeholder={t.login.usernamePh} value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} disabled={loading} autoFocus />
              </div>
              {/* ช่อง Password พร้อมปุ่มแสดง/ซ่อน */}
              <div className="field">
                <label>{t.login.passwordLabel}</label>
                <div className="pw-field">
                  <input className="input" type={showSigninPw ? 'text' : 'password'} placeholder={t.login.passwordPh} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={loading} />
                  <button type="button" className="btn btn-ghost pw-toggle-btn" onClick={() => setShowSigninPw((s) => !s)}>
                    {showSigninPw ? t.login.hidePw : t.login.showPw}
                  </button>
                </div>
              </div>
              {/* hint สำหรับ admin account (username: admin) */}
              <div className="text-muted" style={{ fontSize: 12 }}>{t.login.adminHint}</div>
              {/* ปุ่ม Submit */}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '...' : t.login.submitSignin}
              </button>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────────
              หน้าสมัครสมาชิก — ส่วนของฟอร์ม Sign Up
          ───────────────────────────────────────────────────────────────────── */}
          {authMode === 'signup' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Grid 2 คอลัมน์: ชื่อ, นามสกุล, username, เบอร์โทร */}
              <div className="auth-grid">
                <div className="field"><label>{t.login.firstName}</label><input className="input" placeholder={t.login.firstNamePh} value={regName} onChange={(e) => setRegName(e.target.value)} disabled={loading} autoFocus /></div>
                <div className="field"><label>{t.login.lastName}</label><input className="input" placeholder={t.login.lastNamePh} value={regLastname} onChange={(e) => setRegLastname(e.target.value)} disabled={loading} /></div>
                <div className="field"><label>{t.login.usernameLabel}</label><input className="input" placeholder={t.login.usernamePh2} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={loading} /></div>
                <div className="field"><label>{t.login.phone}</label><input className="input" placeholder={t.login.phonePh} value={regPhone} onChange={(e) => setRegPhone(e.target.value)} disabled={loading} /></div>
              </div>
              {/* ช่อง Email */}
              <div className="field"><label>{t.login.email}</label><input className="input" placeholder={t.login.emailPh} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} /></div>
              {/* Grid 2 คอลัมน์: Password + Confirm Password */}
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
              {/* Checkbox ยินยอมการเก็บข้อมูลส่วนบุคคล */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ marginTop: 3 }} />
                <span>{t.login.consentText}</span>
              </label>
              {/* ปุ่ม Submit — disabled ถ้ายังไม่ยินยอม */}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading || !consentChecked}>
                {loading ? '...' : t.login.submitSignup}
              </button>
            </form>
          )}

          {/* ── Footer: badge Secure + หมายเหตุ ── */}
          <div className="login-footer">
            <span className="tag tag-outline">{t.login.secureBadge}</span>
            <p style={{ fontSize: 12, margin: 0 }} className="text-muted">{t.login.footerNote}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
