import React, { useState, useEffect } from 'react';
import { isSoundEnabled, setSoundEnabled as saveSoundEnabled, getVolume, setVolume as saveVolume, playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';

export default function Settings() {
  const { t, lang, setLang, theme, setTheme, auth, updateProfile, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView, setAccessDeniedOpen } = useApp();
  const [category, setCategory] = useState('profile');

  // The firewall tab is admin-only (edge containment tooling). If an admin
  // flips into general-user preview while sitting on it, bounce them out
  // and surface the same access-denied modal the route guard uses.
  useEffect(() => {
    if (isGeneralView && category === 'firewall') {
      setCategory('profile');
      setAccessDeniedOpen(true);
    }
  }, [isGeneralView, category, setAccessDeniedOpen]);

  // Profile
  const [firstName, setFirstName] = useState(auth?.profile?.name || '');
  const [lastName, setLastName] = useState(auth?.profile?.lastname || '');
  const [email, setEmail] = useState(auth?.email || '');
  const [phone, setPhone] = useState(auth?.profile?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);

  function saveProfile() {
    if (isGeneralView) return;
    playSound('click');
    updateProfile({ name: firstName, lastname: lastName, phone });
    setProfileSaved(true);
  }

  // Password reset (not connected to a backend — see plan)
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Audio
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [volume, setVolume] = useState(() => getVolume());

  function handleSoundToggle(checked) {
    if (isGeneralView) return;
    playSound('click');
    setSoundOn(checked);
    saveSoundEnabled(checked);
    if (checked) setTimeout(() => playSound('success'), 100);
  }

  function handleVolumeChange(e) {
    if (isGeneralView) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    saveVolume(val);
  }

  // Display
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('cybershield_compact_mode') === 'true');
  const [refreshInterval, setRefreshInterval] = useState(() => localStorage.getItem('cybershield_refresh_interval') || '10');

  function handleCompactToggle(checked) {
    if (isGeneralView) return;
    playSound('click');
    setCompactMode(checked);
    localStorage.setItem('cybershield_compact_mode', checked ? 'true' : 'false');
    document.documentElement.classList.toggle('compact-theme', checked);
  }

  function handleRefreshChange(e) {
    if (isGeneralView) return;
    playSound('click');
    setRefreshInterval(e.target.value);
    localStorage.setItem('cybershield_refresh_interval', e.target.value);
  }

  // Firewall — quarantine list lives in SQLite (backend/routes/incidents.py),
  // shared with the Incidents page so a MITIGATED action shows up here too.
  const [blockedIps, setBlockedIps] = useState([]);

  useEffect(() => { fetchBlockedIps(); }, []);

  async function fetchBlockedIps() {
    try {
      const res = await fetch('/api/blocked-ips');
      const data = await res.json();
      if (data.ok) setBlockedIps(data.data.map((row) => row.ip));
    } catch (err) {
      console.error('Failed to fetch blocked IPs:', err);
    }
  }

  async function unblockIp(ip) {
    if (isGeneralView) return;
    playSound('click');
    try {
      const res = await fetch(`/api/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { setBlockedIps((prev) => prev.filter((item) => item !== ip)); playSound('success'); }
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    }
  }

  async function addDemoBlockedIp() {
    if (isGeneralView) return;
    playSound('click');
    const demoIp = `172.16.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(Math.random() * 254 + 1)}`;
    if (blockedIps.includes(demoIp)) return;
    try {
      const res = await fetch('/api/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: demoIp }),
      });
      const data = await res.json();
      if (data.ok) { setBlockedIps((prev) => [...prev, demoIp]); playSound('success'); }
    } catch (err) {
      console.error('Failed to add blocked IP:', err);
    }
  }

  const categories = [
    { key: 'profile', label: t.settings.catProfile, icon: "M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12Zm0 2c-4 0-7.5 2-7.5 5v1h15v-1c0-3-3.5-5-7.5-5Z" },
    { key: 'general', label: t.settings.catGeneral, icon: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" },
    { key: 'audio', label: t.settings.catAudio, icon: "M4 9v6h4l5 5V4L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" },
    { key: 'display', label: t.settings.catDisplay, icon: "M3 4h18v12H3zM8 20h8M12 16v4" },
    ...(isAdminActual ? [{ key: 'role', label: t.settings.catRole, icon: "M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM6 21v-2a6 6 0 0 1 12 0v2" }] : []),
    ...(isGeneralView ? [] : [{ key: 'firewall', label: t.settings.catFirewall, icon: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" }]),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="dash-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" /></svg>
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{t.settings.title}</h2>
          <p className="text-muted" style={{ margin: 0 }}>{t.settings.subtitle}</p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {categories.map((c) => (
            <a key={c.key} href="#" aria-current={category === c.key ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); playSound('click'); setCategory(c.key); }}>
              <span className="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg></span>
              {c.label}
            </a>
          ))}
        </nav>

        <div className="settings-content">
          {category === 'profile' && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ margin: 0 }}>{t.settings.profileCardTitle}</h3>
                  {profileSaved && <span className="tag tag-accent">{t.settings.profileSavedTag}</span>}
                </div>
                <div className="auth-grid">
                  <div className="field"><label>{t.login.firstName}</label><input className="input" value={firstName} disabled={isGeneralView} onChange={(e) => { setFirstName(e.target.value); setProfileSaved(false); }} /></div>
                  <div className="field"><label>{t.login.lastName}</label><input className="input" value={lastName} disabled={isGeneralView} onChange={(e) => { setLastName(e.target.value); setProfileSaved(false); }} /></div>
                  <div className="field"><label>{t.login.email}</label><input className="input" value={email} disabled={isGeneralView} onChange={(e) => { setEmail(e.target.value); setProfileSaved(false); }} /></div>
                  <div className="field"><label>{t.login.phone}</label><input className="input" value={phone} disabled={isGeneralView} onChange={(e) => { setPhone(e.target.value); setProfileSaved(false); }} /></div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={saveProfile} disabled={isGeneralView}>{t.settings.profileSaveBtn}</button>
              </div>

              <div>
                <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.resetPwTitle}</h3>
                <div className="auth-grid">
                  <div className="field"><label>{t.settings.currentPwLabel}</label><input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} disabled /></div>
                  <div></div>
                  <div className="field"><label>{t.settings.newPwLabel}</label><input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} disabled /></div>
                  <div className="field"><label>{t.login.confirmPassword}</label><input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} disabled /></div>
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>{t.settings.pwNotConnected}</div>
                <button className="btn btn-secondary" style={{ marginTop: 'var(--space-3)' }} disabled>{t.settings.resetPwBtn}</button>
              </div>
            </>
          )}

          {category === 'general' && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.catGeneral}</h3>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.languageLabel}</div><div className="settings-row-desc text-muted">{t.settings.languageDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="lang" checked={lang === 'th'} onChange={() => setLang('th')} />ไทย</label>
                  <label className="seg-opt"><input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} />English</label>
                </div>
              </div>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.themeLabel}</div><div className="settings-row-desc text-muted">{t.settings.themeDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="theme" checked={theme === 'light'} onChange={() => setTheme('light')} />{t.settings.themeLight}</label>
                  <label className="seg-opt"><input type="radio" name="theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} />{t.settings.themeDark}</label>
                </div>
              </div>
            </div>
          )}

          {category === 'audio' && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.audioCardTitle}</h3>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.audioToggleLabel}</div><div className="settings-row-desc text-muted">{t.settings.audioToggleDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="siren" checked={soundOn} onChange={() => handleSoundToggle(true)} disabled={isGeneralView} />{t.settings.on}</label>
                  <label className="seg-opt"><input type="radio" name="siren" checked={!soundOn} onChange={() => handleSoundToggle(false)} disabled={isGeneralView} />{t.settings.off}</label>
                </div>
              </div>
              <div className="settings-row">
                <div style={{ flex: 1 }}><div className="settings-row-label">{t.settings.volumeLabel}</div><div className="settings-row-desc text-muted">{t.settings.volumeDesc} ({Math.round(volume * 100)}%)</div></div>
                <input type="range" min="0.05" max="1.0" step="0.05" value={volume} onChange={handleVolumeChange} disabled={!soundOn || isGeneralView} style={{ width: 160, accentColor: 'var(--color-accent)' }} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', paddingTop: 'var(--space-3)' }}>
                <button className="btn btn-secondary" onClick={() => playSound('alert')} disabled={!soundOn}>{t.settings.testSiren}</button>
                <button className="btn btn-secondary" onClick={() => playSound('critical')} disabled={!soundOn}>{t.settings.testPulse}</button>
                <InfoHelp id="defcon1Sound" />
                <button className="btn btn-secondary" onClick={() => playSound('click')} disabled={!soundOn}>{t.settings.testClick}</button>
                <button className="btn btn-secondary" onClick={() => playSound('success')} disabled={!soundOn}>{t.settings.testChime}</button>
              </div>
            </div>
          )}

          {category === 'display' && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.displayCardTitle}</h3>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.densityLabel} <InfoHelp id="compactModeHelp" /></div><div className="settings-row-desc text-muted">{t.settings.densityDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="density" checked={compactMode} onChange={() => handleCompactToggle(true)} disabled={isGeneralView} />{t.settings.on}</label>
                  <label className="seg-opt"><input type="radio" name="density" checked={!compactMode} onChange={() => handleCompactToggle(false)} disabled={isGeneralView} />{t.settings.off}</label>
                </div>
              </div>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.refreshLabel} <InfoHelp id="refreshIntervalHelp" /></div><div className="settings-row-desc text-muted">{t.settings.refreshDesc}</div></div>
                <select className="input" style={{ width: 200 }} value={refreshInterval} onChange={handleRefreshChange} disabled={isGeneralView}>
                  <option value="5">{t.settings.every5}</option>
                  <option value="10">{t.settings.every10}</option>
                  <option value="30">{t.settings.every30}</option>
                  <option value="60">{t.settings.every60}</option>
                </select>
              </div>
            </div>
          )}

          {category === 'role' && isAdminActual && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.roleCardTitle}</h3>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.roleLabel} <InfoHelp id="currentViewHelp" /></div><div className="settings-row-desc text-muted">{t.settings.roleDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="rolePreview" checked={!previewAsGeneral} onChange={() => setPreviewAsGeneral(false)} />{t.settings.roleAdminOpt}</label>
                  <label className="seg-opt"><input type="radio" name="rolePreview" checked={previewAsGeneral} onChange={() => setPreviewAsGeneral(true)} />{t.settings.roleGeneralOpt}</label>
                </div>
              </div>
              {!previewAsGeneral && (
                <div style={{ padding: 'var(--space-3) 0' }}>
                  <div className="settings-row-label" style={{ marginBottom: 'var(--space-3)' }}>{t.settings.usageCardTitle}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-4)' }}>
                    <div><div style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>18</div><div className="text-muted" style={{ fontSize: 11 }}>{t.settings.usageActiveUsers}</div></div>
                    <div><div style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>3</div><div className="text-muted" style={{ fontSize: 11 }}>{t.settings.usageSignups}</div></div>
                    <div><div style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>47</div><div className="text-muted" style={{ fontSize: 11 }}>{t.settings.usageSessions}</div></div>
                    <div><div style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>6m 12s</div><div className="text-muted" style={{ fontSize: 11 }}>{t.settings.usageAvgSession}</div></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {category === 'firewall' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ margin: 0 }}>{t.settings.firewallTitle} <InfoHelp id="firewallHelp" /> <InfoHelp id="quarantineIp" /></h3>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={addDemoBlockedIp} disabled={isGeneralView}>{t.settings.addBlockBtn}</button>
                  <InfoHelp id="simulateBlockHelp" />
                </span>
              </div>
              <div>
                {blockedIps.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: 13 }}>{t.settings.firewallEmpty}</div>
                ) : (
                  blockedIps.map((ip) => (
                    <div key={ip} className="blocked-ip-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="stat-icon-box icon-box-red" style={{ width: 30, height: 30 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>
                        </span>
                        <span className="mono" style={{ fontSize: 13 }}>{ip}</span>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => unblockIp(ip)} disabled={isGeneralView}>{t.settings.unblockBtn}</button>
                        <InfoHelp id="unblockHelp" />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
