'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage, LANGUAGES } from '@/lib/i18n'

interface Props {
  userId?: string
  accentColor?: string
}

// Selettore lingua per i profili Web (Cliente/Fornitore/Attività). Aggiorna sia
// il context locale (t() cambia subito) sia users.preferred_lang su Supabase,
// cosi' la scelta e' persistente e condivisa con l'App (stessa colonna).
export default function LanguageSelector({ userId, accentColor = '#E25C45' }: Props) {
  const { lang, setLang, t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSelect = async (code: string) => {
    if (code === lang) return
    setLang(code)
    if (!userId) return
    setSaving(true)
    try {
      await supabase.from('users').update({ preferred_lang: code }).eq('id', userId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // best-effort: il context locale e' comunque gia' aggiornato
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">🌍 {t('language')}</h2>
        {saving && <span className="text-xs text-gray-400">{t('saving')}</span>}
        {saved && <span className="text-xs" style={{ color: '#1D9E75' }}>{t('languageSaved')}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(LANGUAGES).map(([code, info]) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
            style={lang === code
              ? { background: accentColor, color: '#fff', borderColor: accentColor }
              : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
          >
            <span>{info.flag}</span> {info.label}
          </button>
        ))}
      </div>
    </div>
  )
}
