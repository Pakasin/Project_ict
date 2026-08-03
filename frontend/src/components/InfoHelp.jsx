import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const MARGIN = 8
const POP_WIDTH = 280

export default function InfoHelp({ id }) {
  const { t, openHelpId, setOpenHelpId } = useApp()
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })

  const isOpen = openHelpId === id
  const help = t.help?.[id]

  useEffect(() => {
    if (!isOpen) return

    function measure() {
      const btn = btnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      let left = rect.left
      if (left + POP_WIDTH + MARGIN > window.innerWidth) left = window.innerWidth - POP_WIDTH - MARGIN
      if (left < MARGIN) left = MARGIN

      const estHeight = popRef.current?.offsetHeight || 140
      let top = rect.bottom + 6
      const fitsBelow = window.innerHeight - rect.bottom - MARGIN >= estHeight
      if (!fitsBelow && rect.top - MARGIN >= estHeight) top = rect.top - estHeight - 6
      if (top < MARGIN) top = MARGIN
      if (top + estHeight > window.innerHeight - MARGIN) top = Math.max(MARGIN, window.innerHeight - estHeight - MARGIN)
      setPos({ top, left })
    }

    measure()
    function onDocClick(e) { if (!e.target.closest('[data-info-help]')) setOpenHelpId(null) }
    function onKeyDown(e) { if (e.key === 'Escape') setOpenHelpId(null) }

    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, setOpenHelpId])

  if (!help) return null

  return (
    <span className="info-help" data-info-help="true">
      <button
        ref={btnRef}
        type="button"
        className="info-help-btn"
        aria-label={help.title}
        data-plain="true"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenHelpId(isOpen ? null : id) }}
      >
        !
      </button>
      {isOpen && (
        <div ref={popRef} className="info-help-pop" style={{ top: pos.top, left: pos.left }}>
          <div className="info-help-title">{help.title}</div>
          <div className="info-help-desc">{help.desc}</div>
        </div>
      )}
    </span>
  )
}
