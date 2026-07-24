import React, { useState } from 'react';
import { isSoundEnabled, setSoundEnabled as saveSoundEnabled, getVolume, setVolume as saveVolume, playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { t, lang, setLang, theme, setTheme, auth, updateProfile, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView } = useApp();
  const [category, setCategory] = useState('profile');

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

  // Firewall
  const [blockedIps, setBlockedIps] = useState(() => JSON.parse(localStorage.getItem('cybershield_blocked_ips') || '["192.168.1.105", "10.0.0.88"]'));

  function unblockIp(ip) {
    if (isGeneralView) return;
    playSound('click');
    const next = blockedIps.filter((item) => item !== ip);
    setBlockedIps(next);
    localStorage.setItem('cybershield_blocked_ips', JSON.stringify(next));
    playSound('success');
  }

  function addDemoBlockedIp() {
    if (isGeneralView) return;
    playSound('click');
    const demoIp = `172.16.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(Math.random() * 254 + 1)}`;
    if (!blockedIps.includes(demoIp)) {
      const next = [...blockedIps, demoIp];
      setBlockedIps(next);
      localStorage.setItem('cybershield_blocked_ips', JSON.stringify(next));
      playSound('success');
    }
  }

  const categories = [
    { key: 'profile', label: t.settings.catProfile },
    { key: 'general', label: t.settings.catGeneral },
    { key: 'audio', label: t.settings.catAudio },
    { key: 'display', label: t.settings.catDisplay },
    ...(isAdminActual ? [{ key: 'role', label: t.settings.catRole }] : []),
    { key: 'firewall', label: t.settings.catFirewall },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header">
        <h2>{t.settings.title}</h2>
        <p className="text-muted">{t.settings.subtitle}</p>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {categories.map((c) => (
            <a key={c.key} href="#" aria-current={category === c.key ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); playSound('click'); setCategory(c.key); }}>
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
                <button className="btn btn-secondary" onClick={() => playSound('click')} disabled={!soundOn}>{t.settings.testClick}</button>
                <button className="btn btn-secondary" onClick={() => playSound('success')} disabled={!soundOn}>{t.settings.testChime}</button>
              </div>
            </div>
          )}

          {category === 'display' && (
            <div>
              <h3 style={{ margin: '0 0 var(--space-3) 0' }}>{t.settings.displayCardTitle}</h3>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.densityLabel}</div><div className="settings-row-desc text-muted">{t.settings.densityDesc}</div></div>
                <div className="seg">
                  <label className="seg-opt"><input type="radio" name="density" checked={compactMode} onChange={() => handleCompactToggle(true)} disabled={isGeneralView} />{t.settings.on}</label>
                  <label className="seg-opt"><input type="radio" name="density" checked={!compactMode} onChange={() => handleCompactToggle(false)} disabled={isGeneralView} />{t.settings.off}</label>
                </div>
              </div>
              <div className="settings-row">
                <div><div className="settings-row-label">{t.settings.refreshLabel}</div><div className="settings-row-desc text-muted">{t.settings.refreshDesc}</div></div>
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
                <div><div className="settings-row-label">{t.settings.roleLabel}</div><div className="settings-row-desc text-muted">{t.settings.roleDesc}</div></div>
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
                <h3 style={{ margin: 0 }}>{t.settings.firewallTitle}</h3>
                <button className="btn btn-secondary" onClick={addDemoBlockedIp} disabled={isGeneralView}>{t.settings.addBlockBtn}</button>
              </div>
              <div className="quarantine-list">
                {blockedIps.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: 13 }}>{t.settings.firewallEmpty}</div>
                ) : (
                  blockedIps.map((ip) => (
                    <div key={ip} className="tag tag-outline quarantine-tag">
                      <span className="mono">{ip}</span>
                      <button className="btn btn-ghost" style={{ padding: 0, fontSize: 11 }} onClick={() => unblockIp(ip)} disabled={isGeneralView}>{t.settings.unblockBtn}</button>
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
