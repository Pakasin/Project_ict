import { useApp } from '../context/AppContext'
import { playSound } from '../utils/sound'

// Shown when a General User (real or admin-in-preview) reaches an admin-only
// route or settings tab — either by URL bar, or because an admin flips into
// preview mode while already sitting on an admin-only page.
export default function AccessDeniedModal({ onDismiss }) {
  const { t, accessDeniedOpen } = useApp()
  if (!accessDeniedOpen) return null

  function handleDismiss() {
    playSound('click')
    onDismiss()
  }

  return (
    <div className="dialog-backdrop" onClick={handleDismiss}>
      <div className="dialog card elev-lg" style={{ maxWidth: 380, textAlign: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon icon-alert" style={{ borderRadius: '50%' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"></line>
          </svg>
        </div>
        <h3 style={{ margin: 0 }}>{t.access.title}</h3>
        <p className="text-muted" style={{ fontSize: 13.5, margin: 0 }}>{t.access.desc}</p>
        <button className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-2)' }} onClick={handleDismiss}>{t.access.back}</button>
      </div>
    </div>
  )
}
