import { createContext, useContext, useEffect, useState } from 'react'
import { STR } from '../i18n/strings'

const AppContext = createContext(null)

export function AppProvider({ auth, updateProfile, children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cybershield_theme') || 'dark')
  const [lang, setLang] = useState(() => localStorage.getItem('cybershield_lang') || 'th')
  const [previewAsGeneral, setPreviewAsGeneral] = useState(false)
  const [openHelpId, setOpenHelpId] = useState(null)
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('cybershield_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('cybershield_lang', lang)
  }, [lang])

  useEffect(() => {
    // Reset the admin preview whenever the signed-in identity changes (e.g. logout)
    setPreviewAsGeneral(false)
  }, [auth?.user])


  const t = STR[lang] || STR.th
  const isAdminActual = !!auth?.user && auth.role !== 'General User'
  const isGeneralView = auth?.role === 'General User' || (isAdminActual && previewAsGeneral)

  const value = {
    auth, updateProfile,
    theme, setTheme,
    lang, setLang,
    t,
    previewAsGeneral, setPreviewAsGeneral,
    isAdminActual, isGeneralView,
    openHelpId, setOpenHelpId,
    accessDeniedOpen, setAccessDeniedOpen,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
