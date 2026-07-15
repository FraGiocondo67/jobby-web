'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { ArrowLeft, MapPin, Clock, Package } from 'lucide-react'

interface ProximityMeta { name_it: string; name_en: string; icon: string }

// Fallback se l'utente nega/non fornisce la geolocalizzazione browser (stesso default usato in client/map)
const DEFAULT_CENTER = { lat: 45.6667, lng: 12.2417 }

function ProximitySearchContent() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category') ?? 'laundry'
  const [proximityMeta, setProximityMeta] = useState<Record<string, ProximityMeta>>({})
  const meta = proximityMeta[categorySlug] ?? { name_it: categorySlug, name_en: categorySlug, icon: '🏪' }
  const metaName = lang === 'it' ? meta.name_it : (meta.name_en || meta.name_it)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [orderText, setOrderText] = useState('')
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [sendingOrder, setSendingOrder] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      setUser(u)
    })
    loadBusinesses()
  }, [categorySlug])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null)
      )
    }
  }, [])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon, category_type')
      .eq('is_active', true)
      .eq('category_type', 'proximity')
      .then(({ data }) => {
        const map: Record<string, ProximityMeta> = {}
        ;(data ?? []).forEach((c: any) => { map[c.slug] = { name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🏪' } })
        setProximityMeta(map)
      })
  }, [])

  const loadBusinesses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles_provider')
      .select(`user_id, bio, skills, operational_radius_km, avg_rating, trust_score, business_data, price_list,
        user:users!profiles_provider_user_id_fkey(id, full_name)`)
      .eq('is_proximity_business', true)
      .contains('skills', [categorySlug])
    setBusinesses(data ?? [])
    setLoading(false)
  }

  // Quantità selezionate per ciascun articolo del listino: { [item.id]: qty }
  const [itemQty, setItemQty] = useState<Record<string, number>>({})
  const setQty = (id: string, delta: number) => {
    setItemQty(prev => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      return { ...prev, [id]: next }
    })
  }
  const priceList: any[] = (selected?.price_list ?? [])
  const selectedItems = priceList
    .filter(it => (itemQty[it.id] ?? 0) > 0)
    .map(it => ({ id: it.id, name: it.name, price: it.price, unit: it.unit ?? null, qty: itemQty[it.id] }))
  const orderTotal = selectedItems.reduce((sum, it) => sum + Number(it.price) * it.qty, 0)

  const sendOrder = async () => {
    if (!user || !selected) return
    if (!orderText.trim() && selectedItems.length === 0) { alert(t('proximityNeedDescriptionAlert')); return }
    setSendingOrder(true)
    try {
      const bd = selected.business_data ?? {}
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 1)
      defaultDate.setHours(12, 0, 0, 0)

      const { data: catData } = await supabase.from('service_categories').select('id').eq('slug', categorySlug).maybeSingle()
      const itemsSummary = selectedItems.map(it => `${it.qty}× ${it.name}`).join(', ')
      const title = `${metaName} — ${itemsSummary || orderText.slice(0, 50)}`
      const coords = userCoords ?? DEFAULT_CENTER
      const locationWkt = `POINT(${coords.lng} ${coords.lat})`
      const { error } = await supabase.from('missions').insert({
        client_id: user.id,
        provider_id: selected.user_id,
        category_id: catData?.id ?? null,
        title,
        description: [
          itemsSummary ? `Articoli: ${itemsSummary}` : '',
          orderText.trim() ? `Note: ${orderText.trim()}` : '',
          `Modalità: ${deliveryType === 'delivery' ? `A domicilio — ${deliveryAddress}` : 'Ritiro in sede'}`,
        ].filter(Boolean).join('\n'),
        address: deliveryType === 'delivery' ? deliveryAddress : bd.business_address,
        scheduled_at: defaultDate.toISOString(),
        duration_hours: 1,
        price_agreed: orderTotal,
        selected_items: selectedItems,
        status: 'matched',
        payment_status: 'pending',
        location: locationWkt,
      })
      if (error) throw new Error(error.message)
      await supabase.from('notifications').insert({
        user_id: selected.user_id,
        type: 'new_proximity_order',
        title: `📦 Nuova richiesta da ${user.full_name}`,
        body: title,
        data: { mission_id: null },
      })
      alert(`✅ ${t('proximityOrderSentPrefix')} ${bd.business_name || selected.user?.full_name}! ${t('proximityOrderSentSuffix')}`)
      router.push('/client/missions')
    } catch (e: any) { alert(t('errorPrefix') + e.message) }
    finally { setSendingOrder(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{meta.icon} {metaName}</h1>
          <p className="text-gray-500 text-sm">{t('proximitySubtitle')}</p>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
        🏪 {t('proximityInfoBox')}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor: '#5B2D8E', borderTopColor: 'transparent'}} />
        </div>
      ) : businesses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">{t('proximityEmptyStatePrefix')} {metaName.toLowerCase()} {t('proximityEmptyStateSuffix')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('proximityExpandingCategory')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {businesses.map(biz => {
            const bd = biz.business_data ?? {}
            const name = bd.business_name || biz.user?.full_name || t('mapBusinessFallback')
            const products = bd.products ?? []
            return (
              <button key={biz.user_id} onClick={() => { setSelected(biz); setItemQty({}) }}
                className={`card text-left hover:shadow-lg transition-all border-2
                  ${selected?.user_id === biz.user_id ? 'border-purple-400 bg-purple-50' : 'border-transparent'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background: '#EEEDFE'}}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{name}</p>
                    {bd.business_address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {bd.business_address}
                      </p>
                    )}
                    {bd.can_travel && (
                      <p className="text-xs text-purple-600 mt-1">🚗 {t('proximityAvailableDelivery')}</p>
                    )}
                    {biz.avg_rating > 0 && (
                      <p className="text-xs text-amber-600 mt-1">⭐ {Number(biz.avg_rating).toFixed(1)}</p>
                    )}
                    {products.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {products.slice(0, 3).map((p: string) => (
                          <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                        {products.length > 3 && <span className="text-xs text-gray-400">+{products.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Order form */}
      {selected && (() => {
        const bd = selected.business_data ?? {}
        const name = bd.business_name || selected.user?.full_name
        const products = bd.products ?? []
        return (
          <div className="card border-2 border-purple-200 space-y-4">
            <h2 className="font-bold text-gray-900">📝 {t('proximityRequestToPrefix')} {name}</h2>
            {priceList.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('priceListLabel')}</p>
                <div className="space-y-2">
                  {priceList.map((it: any) => {
                    const qty = itemQty[it.id] ?? 0
                    return (
                      <div key={it.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors
                        ${qty > 0 ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{it.name}</p>
                          <p className="text-xs text-gray-500">€{Number(it.price).toFixed(2)}{it.unit ? ` / ${it.unit}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button type="button" onClick={() => setQty(it.id, -1)}
                            className="w-7 h-7 rounded-full border-2 border-gray-300 text-gray-600 flex items-center justify-center hover:border-purple-400">−</button>
                          <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                          <button type="button" onClick={() => setQty(it.id, 1)}
                            className="w-7 h-7 rounded-full border-2 border-purple-400 text-purple-600 flex items-center justify-center hover:bg-purple-50">+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-100">
                    <span className="text-sm font-medium text-gray-700">{t('totalLabel')}</span>
                    <span className="text-lg font-bold" style={{color: '#5B2D8E'}}>€{orderTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ) : products.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('proximityProductsServices')}</p>
                <div className="flex flex-wrap gap-2">
                  {products.map((p: string) => (
                    <button key={p} type="button"
                      onClick={() => setOrderText(prev => prev === p ? '' : p)}
                      className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors
                        ${orderText === p ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {selectedItems.length > 0 || products.length > 0 ? t('additionalDetailsLabel') : t('whatDoYouNeedLabel')}
              </label>
              <textarea className="input resize-none" rows={3} value={orderText} onChange={e => setOrderText(e.target.value)}
                placeholder={`${t('describeNeedFromPrefix')} ${name}...`} />
            </div>
            {bd.can_travel && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('proximityModeLabel')}</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors
                      ${deliveryType === 'delivery' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'}`}>
                    🚗 {t('proximityDeliveryOption')}
                  </button>
                  <button onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors
                      ${deliveryType === 'pickup' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'}`}>
                    🏪 {t('proximityPickupOption')}
                  </button>
                </div>
                {deliveryType === 'delivery' && (
                  <input className="input mt-3" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder={t('proximityDeliveryAddressPlaceholder')} />
                )}
              </div>
            )}
            <button onClick={sendOrder} disabled={sendingOrder || (!orderText.trim() && selectedItems.length === 0)}
              className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{background: '#5B2D8E'}}>
              {sendingOrder ? t('sendingEllipsis') : `📦 ${t('proximitySendRequestAction')}${selectedItems.length > 0 ? ` (€${orderTotal.toFixed(2)})` : ''} ${t('proximityToConnector')} ${name}`}
            </button>
          </div>
        )
      })()}
    </div>
  )
}

export default function ProximitySearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor: '#5B2D8E', borderTopColor: 'transparent'}} /></div>}>
      <ProximitySearchContent />
    </Suspense>
  )
}
