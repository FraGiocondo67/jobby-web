'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { completeOnboardingFromMetadata } from '@/lib/onboarding'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }

      // BLOCCO 7c: se questo è il primo login dopo una registrazione fatta
      // con conferma email attiva, i dati di onboarding erano ancora "in
      // sospeso" in user_metadata (non c'era una sessione per completarli
      // subito in fase di signup) — li applichiamo ora. Su un login normale
      // (nessun onboarding pendente) questa chiamata è un no-op veloce.
      const pending = await completeOnboardingFromMetadata()

      const { data: user } = await supabase
        .from('users')
        .select('role, is_proximity_business:profiles_provider(is_proximity_business)')
        .eq('auth_id', data.user.id)
        .single()

      const role = pending?.role ?? user?.role
      if (role === 'provider') router.push('/provider')
      else router.push('/client')
    } catch {
      setError(t('connectionError'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/jobby-icon.png" alt="JOBBY" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          <h1 className="text-3xl font-bold text-gray-900">JOBBY</h1>
          <p className="text-gray-500 mt-1">{t('loginTagline')}</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('loginHeading')}</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('passwordLabel')}</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('loggingIn') : t('logIn')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('noAccountYet')}{' '}
            <Link href="/register" className="text-accent font-medium hover:underline">
              {t('signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
