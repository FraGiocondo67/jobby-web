'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

// Fallback statico usato solo se il fetch dinamico da service_categories fallisce
// (es. utente offline durante la registrazione, prima del login). Le etichette
// vengono tradotte a runtime tramite la translationKey, non sono hardcoded.
const PROXIMITY_TYPES_FALLBACK: { slug: string; icon: string; translationKey: string }[] = [
  { slug: 'pharmacy', icon: '💊', translationKey: 'categoryPharmacy' },
  { slug: 'barber', icon: '✂️', translationKey: 'categoryBarber' },
  { slug: 'beauty', icon: '💅', translationKey: 'categoryBeauty' },
  { slug: 'laundry', icon: '🧺', translationKey: 'categoryLaundry' },
  { slug: 'florist', icon: '💐', translationKey: 'categoryFlorist' },
  { slug: 'bakery', icon: '🥐', translationKey: 'categoryBakery' },
  { slug: 'grocery', icon: '🛒', translationKey: 'categoryGrocery' },
  { slug: 'repair_shop', icon: '🔩', translationKey: 'categoryRepairShop' },
  { slug: 'vet', icon: '🐾', translationKey: 'categoryVet' },
  { slug: 'optician', icon: '👓', translationKey: 'categoryOptician' },
]

type ProximityType = { slug: string; icon: string; translationKey?: string; name_it?: string; name_en?: string }

export default function RegisterPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [step, setStep] = useState(1)
  const [proximityTypes, setProximityTypes] = useState<ProximityType[]>(PROXIMITY_TYPES_FALLBACK)

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon')
      .eq('is_active', true)
      .eq('category_type', 'proximity')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return // mantiene il fallback statico
        setProximityTypes(data.map((c: any) => ({ slug: c.slug, icon: c.icon ?? '🏪', name_it: c.name_it, name_en: c.name_en })))
      })
  }, [])

  const proximityLabel = (cat: ProximityType) =>
    cat.translationKey ? t(cat.translationKey) : (lang === 'it' ? cat.name_it : (cat.name_en || cat.name_it))
  const [role, setRole] = useState<'client' | 'provider' | 'both'>('client')
  const [providerType, setProviderType] = useState<'individual' | 'proximity'>('individual')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [proximityCategory, setProximityCategory] = useState('')
  const [canTravel, setCanTravel] = useState(true)
  const [travelRadius, setTravelRadius] = useState('5')
  const [products, setProducts] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isProximity = (role === 'provider' || role === 'both') && providerType === 'proximity'

  const handleRegister = async () => {
    if (!fullName.trim()) { setError(t('errorFullNameRequired')); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('errorInvalidEmail')); return }
    if (password.length < 8) { setError(t('errorPasswordMinLength')); return }
    if (password !== confirmPw) { setError(t('errorPasswordMismatch')); return }
    if (isProximity && !vatNumber.trim()) { setError(t('errorVatRequired')); return }
    if (isProximity && !businessAddress.trim()) { setError(t('errorBusinessAddressRequired')); return }

    setLoading(true); setError('')
    try {
      const businessData = isProximity ? {
        vat_number: vatNumber.trim(),
        business_name: businessName.trim() || fullName.trim(),
        business_address: businessAddress.trim(),
        can_travel: canTravel,
        travel_radius_km: parseInt(travelRadius) || 5,
        products: products.split('\n').map(p => p.trim()).filter(Boolean),
        proximity_category: proximityCategory,
      } : null

      const res = await fetch('https://jobby-platform-app.netlify.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, full_name: fullName, phone, role,
          preferred_lang: 'it',
          is_proximity_business: isProximity,
          business_data: businessData,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || t('errorRegistrationGeneric')); return }
      router.push('/login?registered=1')
    } catch { setError(t('connectionError')) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/jobby-icon.png" alt="JOBBY" className="w-14 h-14 rounded-2xl mx-auto object-cover" />
          <h1 className="text-3xl font-bold text-gray-900 mt-2">JOBBY</h1>
          <p className="text-gray-500">{t('registerTagline')}</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <div className="space-y-6">
          {/* Step 1: Ruolo */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('step1Title')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: 'client', icon: '🔍', label: t('roleClient'), desc: t('roleClientDesc') },
                { id: 'provider', icon: '⚡', label: t('roleProvider'), desc: t('roleProviderDesc') },
                { id: 'both', icon: '👥', label: t('roleBoth'), desc: t('roleBothDesc') },
              ] as const).map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-colors
                    ${role === r.id ? 'border-accent bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <div className={`text-sm font-semibold ${role === r.id ? 'text-accent' : 'text-gray-700'}`}>{r.label}</div>
                  <div className="text-xs text-gray-400">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Tipo fornitore */}
          {(role === 'provider' || role === 'both') && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('step2Title')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProviderType('individual')}
                  className={`p-4 rounded-xl border-2 text-center transition-colors
                    ${providerType === 'individual' ? 'border-blue bg-blue-50' : 'border-gray-200'}`}>
                  <div className="text-2xl mb-1">👤</div>
                  <div className={`text-sm font-semibold ${providerType === 'individual' ? 'text-blue' : 'text-gray-700'}`}>{t('providerTypeIndividual')}</div>
                  <div className="text-xs text-gray-400">{t('providerTypeIndividualDesc')}</div>
                </button>
                <button onClick={() => setProviderType('proximity')}
                  className={`p-4 rounded-xl border-2 text-center transition-colors
                    ${providerType === 'proximity' ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                  <div className="text-2xl mb-1">🏪</div>
                  <div className={`text-sm font-semibold ${providerType === 'proximity' ? 'text-purple-700' : 'text-gray-700'}`}>{t('providerTypeProximity')}</div>
                  <div className="text-xs text-gray-400">{t('providerTypeProximityDesc')}</div>
                </button>
              </div>

              {isProximity && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700">
                    {t('proximityExtraFieldsNote')}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('businessTypeLabel')} *</label>
                    <div className="flex flex-wrap gap-2">
                      {proximityTypes.map(cat => (
                        <button key={cat.slug} type="button" onClick={() => setProximityCategory(cat.slug)}
                          className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors
                            ${proximityCategory === cat.slug ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold' : 'border-gray-200 text-gray-600'}`}>
                          {cat.icon} {proximityLabel(cat)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('businessNameLabel')}</label>
                    <input className="input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={t('businessNamePlaceholder')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('vatNumberLabel')} *</label>
                    <input className="input" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="IT12345678901" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('businessAddressLabel')} *</label>
                    <input className="input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder={t('businessAddressPlaceholder')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">{t('travelAvailabilityLabel')}</label>
                    <div className="flex gap-3">
                      <button onClick={() => setCanTravel(true)} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium ${canTravel ? 'border-blue bg-blue-50 text-blue' : 'border-gray-200'}`}>{t('travelYes')}</button>
                      <button onClick={() => setCanTravel(false)} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium ${!canTravel ? 'border-blue bg-blue-50 text-blue' : 'border-gray-200'}`}>{t('travelOnSiteOnly')}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('productsLabel')}</label>
                    <textarea className="input resize-none" rows={3} value={products} onChange={e => setProducts(e.target.value)}
                      placeholder={t('productsPlaceholder')} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Dati personali */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">{t('step3Title')}</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t('fullNameLabel')} *</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('fullNamePlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t('emailLabel')} *</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t('phoneLabel')}</label>
              <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phonePlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t('passwordLabel')} *</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('passwordPlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t('confirmPasswordLabel')} *</label>
              <input type="password" className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('confirmPasswordPlaceholder')} />
            </div>
          </div>

          <button onClick={handleRegister} disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? t('registeringInProgress') : t('createAccountButton')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-accent font-medium hover:underline">{t('logIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
