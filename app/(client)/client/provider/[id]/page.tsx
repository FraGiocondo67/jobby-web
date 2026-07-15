'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'

// Fallback se l'utente nega/non fornisce la geolocalizzazione browser (stesso default usato in client/map)
const DEFAULT_CENTER = { lat: 45.6667, lng: 12.2417 }

export default function ProviderOrderPage() {
  const router = useRouter()
  const params = useParams()
  const providerId = params?.id as string
  const { t, lang } = useLanguage()

  const [provider, setProvider] = useState<any>(null)
  const [categories, setCategories] = useState<Record<string, { name_it: string; name_en: string; icon: string }>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [categorySlug, setCategorySlug] = useState<string>('')
  const [itemQty, setItemQty] = useState<Record<string, number>>({})
  const [address, setAddress] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const catName = (slug: string) => {
    const c = categories[slug]
    if (!c) return slug
    return lang === 'it' ? c.name_it : (c.name_en || c.name_it)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      setUser(u)
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null)
      )
    }
  }, [])

  useEffect(() => {
    supabase.from('service_categories').select('slug, name_it, name_en, icon').eq('is_active', true)
      .then(({ data }) => {
        const map: Record<string, { name_it: string; name_en: string; icon: string }> = {}
        ;(data ?? []).forEach((c: any) => { map[c.slug] = { name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🛠️' } })
        setCategories(map)
      })
  }, [])

  useEffect(() => {
    if (!providerId) return
    setLoading(true)
    supabase.from('profiles_provider')
      .select(`user_id, bio, skills, hourly_rate, avg_rating, trust_score, completed_missions, availability_status, price_list,
        user:users!profiles_provider_user_id_fkey(id, full_name)`)
      .eq('user_id', providerId)
      .single()
      .then(({ data }) => {
        setProvider(data)
        setCategorySlug(data?.skills?.[0] ?? '')
        setLoading(false)
      })
  }, [providerId])

  const setQty = (id: string, delta: number) => {
    setItemQty(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  const priceList: any[] = provider?.price_list ?? []
  const selectedItems = priceList
    .filter(it => (itemQty[it.id] ?? 0) > 0)
    .map(it => ({ id: it.id, name: it.name, price: it.price, unit: it.unit ?? null, qty: itemQty[it.id] }))
  const orderTotal = selectedItems.reduce((sum, it) => sum + Number(it.price) * it.qty, 0)

  const sendOrder = async () => {
    if (!user || !provider) return
    if (!address.trim()) { setError(t('addressRequiredError')); return }
    if (!dateStr) { setError(t('providerDateRequiredError')); return }
    if (selectedItems.length === 0 && !notes.trim()) { setError(t('providerSelectServiceOrNotesError')); return }
    setSending(true); setError('')
    try {
      const { data: catData } = await supabase.from('service_categories').select('id').eq('slug', categorySlug).maybeSingle()
      const name = provider.user?.full_name ?? t('providerFallbackName')
      const itemsSummary = selectedItems.map(it => `${it.qty}× ${it.name}`).join(', ')
      const title = `${catName(categorySlug)} — ${itemsSummary || 'richiesta diretta'}`
      const coords = userCoords ?? DEFAULT_CENTER
      const locationWkt = `POINT(${coords.lng} ${coords.lat})`
      const { error: insertError } = await supabase.from('missions').insert({
        client_id: user.id,
        provider_id: provider.user_id,
        category_id: catData?.id ?? null,
        title,
        description: [
          itemsSummary ? `Articoli: ${itemsSummary}` : '',
          notes.trim() ? `Note: ${notes.trim()}` : '',
        ].filter(Boolean).join('\n'),
        address: address.trim(),
        scheduled_at: new Date(dateStr).toISOString(),
        duration_hours: 2,
        price_agreed: orderTotal,
        selected_items: selectedItems,
        status: 'matched',
        payment_status: 'pending',
        location: locationWkt,
      })
      if (insertError) throw new Error(insertError.message)
      await supabase.from('notifications').insert({
        user_id: provider.user_id,
        type: 'new_direct_order',
        title: `📋 Nuova richiesta diretta da ${user.full_name}`,
        body: title,
        data: { mission_id: null },
      })
      router.push('/client/missions')
    } catch (e: any) {
      setError(e.message)
    } finally { setSending(false) }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }
  if (!provider) return <div className="card text-center py-12"><p className="text-gray-500">{t('providerNotFound')}</p></div>

  const name = provider.user?.full_name ?? t('providerFallbackName')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👤 {name}</h1>
          <p className="text-gray-500 text-sm">{(provider.skills ?? []).map((s: string) => catName(s)).join(' · ')}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-4">
        {provider.avg_rating > 0 && <span>⭐ {Number(provider.avg_rating).toFixed(1)}</span>}
        {provider.trust_score > 0 && <span>🛡️ {t('providerTrustPrefix')} {provider.trust_score}</span>}
        {provider.hourly_rate && <span>€{provider.hourly_rate}/h</span>}
        <span>{provider.completed_missions ?? 0} {t('providerCompletedMissionsSuffix')}</span>
      </div>

      {provider.bio && <p className="text-sm text-gray-600">{provider.bio}</p>}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">📋 {t('providerRequestServiceToPrefix')} {name}</h2>

        {(provider.skills ?? []).length > 1 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('categoryLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {(provider.skills ?? []).map((s: string) => (
                <button key={s} type="button" onClick={() => setCategorySlug(s)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors
                    ${categorySlug === s ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {categories[s]?.icon} {catName(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {priceList.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('priceListLabel')}</p>
            <div className="space-y-2">
              {priceList.map((it: any) => {
                const qty = itemQty[it.id] ?? 0
                return (
                  <div key={it.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors
                    ${qty > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{it.name}</p>
                      <p className="text-xs text-gray-500">€{Number(it.price).toFixed(2)}{it.unit ? ` / ${it.unit}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button" onClick={() => setQty(it.id, -1)}
                        className="w-7 h-7 rounded-full border-2 border-gray-300 text-gray-600 flex items-center justify-center hover:border-blue-400">−</button>
                      <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                      <button type="button" onClick={() => setQty(it.id, 1)}
                        className="w-7 h-7 rounded-full border-2 border-blue-400 text-blue-600 flex items-center justify-center hover:bg-blue-50">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100">
                <span className="text-sm font-medium text-gray-700">{t('totalLabel')}</span>
                <span className="text-lg font-bold text-blue-700">€{orderTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} /> {t('addressLabel')}
          </label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)}
            placeholder={t('addressPlaceholder')} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Calendar size={14} /> {t('dateTimeLabel')}
          </label>
          <input type="datetime-local" className="input" value={dateStr} onChange={e => setDateStr(e.target.value)}
            min={new Date().toISOString().slice(0, 16)} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {priceList.length > 0 ? t('providerNotesLabel') : t('whatDoYouNeedLabel')}
          </label>
          <textarea className="input resize-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={`${t('describeNeedFromPrefix')} ${name}...`} />
        </div>

        <button onClick={sendOrder} disabled={sending}
          className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ background: '#1A73E8' }}>
          {sending ? t('sendingEllipsis') : selectedItems.length > 0 ? `📋 ${t('proximitySendRequestAction')} (€${orderTotal.toFixed(2)})` : `📋 ${t('proximitySendRequestAction')}`}
        </button>
      </div>
    </div>
  )
}
