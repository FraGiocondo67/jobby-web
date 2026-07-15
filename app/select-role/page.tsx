'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [providerProfile, setProviderProfile] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }

      const { data: u } = await supabase.from('users')
        .select('id, full_name, role')
        .eq('auth_id', session.user.id).single()

      if (!u) { router.push('/login'); return }
      setUser(u)

      if (u.role === 'client') { router.push('/client'); return }
      if (u.role === 'provider') { router.push('/provider'); return }

      // Ruolo "both" — mostra selezione
      const { data: cp } = await supabase.from('profiles_client')
        .select('trust_score').eq('user_id', u.id).maybeSingle()
      const { data: pp } = await supabase.from('profiles_provider')
        .select('trust_score, is_proximity_business, business_data').eq('user_id', u.id).maybeSingle()
      setClientProfile(cp)
      setProviderProfile(pp)
      setLoading(false)
    })
  }, [router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/jobby-icon.png" alt="JOBBY" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
          <h1 className="text-3xl font-bold text-gray-900">JOBBY</h1>
          <p className="text-gray-500 mt-2">{t('loadingText')}</p>
          <div className="mt-6 w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"/>
        </div>
      </div>
    )
  }

  // Schermata selezione ruolo per utenti "both"
  const isProximity = providerProfile?.is_proximity_business
  const bd = providerProfile?.business_data ?? {}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{background:'linear-gradient(135deg,#fff7ed,#ffffff,#eff6ff)'}}>
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/jobby-icon.png" alt="JOBBY" className="w-16 h-16 rounded-2xl mx-auto mb-2 object-cover" />
          <h1 className="text-4xl font-black text-gray-900">JOBBY</h1>
          <p className="text-gray-500 mt-1">The Time Economy Platform</p>
          {user.full_name && (
            <p className="text-gray-400 text-sm mt-1">👋 {t('hello')}, {user.full_name.split(' ')[0]}</p>
          )}
        </div>

        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
          {t('yourRolesLabel')}
        </p>

        {/* Card Cliente */}
        <button onClick={() => router.push('/client')}
          className="w-full p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg active:scale-[0.98]"
          style={{borderColor:'#E25C45',background:'#fff7f5'}}>
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900">{t('imAClientTitle')}</h2>
          <p className="text-gray-500 mt-1">{t('clientRoleDesc')}</p>
          {clientProfile?.trust_score != null && (
            <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-sm font-bold"
              style={{background:'#fef3c7',color:'#92400e'}}>
              {Number(clientProfile.trust_score).toFixed(1)}
            </div>
          )}
        </button>

        {/* Card Fornitore/Attività */}
        <button onClick={() => router.push(isProximity ? '/business' : '/provider')}
          className="w-full p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg active:scale-[0.98]"
          style={{borderColor: isProximity ? '#5B2D8E' : '#1A73E8', background: isProximity ? '#faf5ff' : '#f0f7ff'}}>
          <div className="text-4xl mb-3">{isProximity ? '🏪' : '⚡'}</div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isProximity ? `${t('imBusinessPrefix')} ${bd.business_name || t('businessFallbackName')}` : t('imAProviderTitle')}
          </h2>
          <p className="text-gray-500 mt-1">
            {isProximity ? t('businessRoleDesc') : t('providerRoleDesc')}
          </p>
          {providerProfile?.trust_score != null && (
            <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-sm font-bold"
              style={{background: isProximity ? '#f5f3ff' : '#dbeafe', color: isProximity ? '#5B2D8E' : '#1e40af'}}>
              {Number(providerProfile.trust_score).toFixed(1)}
            </div>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          {t('switchRolesHint')}
        </p>
      </div>
    </div>
  )
}
