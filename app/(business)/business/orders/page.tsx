'use client'
import { useEffect, useState } from 'react'
import { supabase, apiCall } from '@/lib/supabase'
import StatusBadge from '@/components/ui/StatusBadge'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export default function BusinessOrders() {
  const { t } = useLanguage()

  const FILTERS = [
    { id: 'matched', label: t('bizOrdersFilterToConfirm') },
    { id: 'confirmed', label: t('bizOrdersFilterAccepted') },
    { id: 'in_progress', label: t('missionsFilterInProgress') },
    { id: 'completed', label: t('missionsFilterCompleted') },
    { id: 'all', label: t('mapAllChipLabel') },
  ]
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('matched')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [proximityPrice, setProximityPrice] = useState('')
  const [finalPrice, setFinalPrice] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u?.id).single()
      setUser(u); setProfile(pp)
      if (u) loadOrders(u.id)
    })
  }, [])

  const loadOrders = async (uid: string) => {
    setLoading(true)
    const { data } = await supabase.from('missions')
      .select(`id, title, status, price_agreed, scheduled_at, address, description, client_id,
        payment_outside_platform,
        category:service_categories(slug, name_it, icon),
        client:users!missions_client_id_fkey(id, full_name, phone)`)
      .eq('provider_id', uid)
      .in('status', ['matched', 'confirmed', 'in_progress', 'completed', 'reviewed', 'cancelled'])
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const bd = profile?.business_data ?? {}
  const businessName = bd.business_name || user?.full_name || t('bizYourBusiness')

  const acceptOrder = async () => {
    setActionLoading(true)
    try {
      const price = parseFloat(proximityPrice) || null
      try { await apiCall('/missions/accept', 'POST', { mission_id: selected.id }) }
      catch {
        await supabase.from('missions').update({
          status: 'confirmed', confirmed_at: new Date().toISOString(),
          ...(price ? { price_agreed: price } : {})
        }).eq('id', selected.id)
      }
      if (price) await supabase.from('missions').update({ price_agreed: price }).eq('id', selected.id)
      const clientId = selected.client_id || selected.client?.id
      if (clientId) await supabase.from('notifications').insert({
        user_id: clientId, type: 'proximity_accepted',
        title: t('bizOrdersNotifAcceptedTitle'),
        body: `${businessName} ${t('bizOrdersNotifAcceptedBody')}${price ? ` — €${price}` : ''}.`,
        data: { mission_id: selected.id }
      })
      if (user) await loadOrders(user.id)
      setSelected(null); setProximityPrice('')
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  const completeOrder = async (external: boolean) => {
    if (external && !confirm(t('bizOrdersExternalPaymentWarning'))) return
    setActionLoading(true)
    try {
      const price = parseFloat(finalPrice)
      if (price && price !== selected.price_agreed)
        await supabase.from('missions').update({ price_agreed: price }).eq('id', selected.id)
      await apiCall('/missions/checkout', 'POST', { mission_id: selected.id, provider_notes: external ? 'Pagamento esterno' : null })
      if (user) await loadOrders(user.id)
      setSelected(null); setFinalPrice('')
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navOrders')}</h1>
          <p className="text-sm text-gray-500">{businessName}</p>
        </div>
        <button onClick={() => user && loadOrders(user.id)} className="btn-outline flex items-center gap-2 py-2 px-4">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${filter === f.id ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            style={filter === f.id ? { background: '#5B2D8E' } : {}}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor: '#5B2D8E', borderTopColor: 'transparent'}} /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">{filter === 'matched' ? t('bizOrdersEmptyMatched') : t('bizOrdersEmptyOther')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} onClick={() => { setSelected(o); setFinalPrice(o.price_agreed > 0 ? String(o.price_agreed) : '') }}
              className={`card flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border-l-4
                ${o.status === 'matched' ? 'border-purple-400' : o.status === 'in_progress' ? 'border-green-400' :
                  o.status === 'confirmed' ? 'border-blue-400' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background: '#EEEDFE'}}>
                  {o.category?.icon ?? '📦'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{o.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-gray-400">· {o.client?.full_name}</span>
                  </div>
                  {o.status === 'matched' && (
                    <p className="text-xs font-semibold mt-1" style={{color: '#5B2D8E'}}>{t('bizOrdersBadgeToConfirm')}</p>
                  )}
                </div>
              </div>
              {o.price_agreed > 0
                ? <p className="font-bold text-green-600">€{o.price_agreed}</p>
                : <span className="text-xs text-gray-400">{t('bizOrdersPriceTBD')}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Modal ordine */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { setSelected(null); setFinalPrice('') }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                <button onClick={() => { setSelected(null); setFinalPrice('') }} className="text-gray-400 text-xl">✕</button>
              </div>

              <StatusBadge status={selected.status} />
              {selected.client?.full_name && <p className="text-sm text-gray-600">👤 {selected.client.full_name}</p>}
              {selected.address && <p className="text-sm text-gray-600">📍 {selected.address}</p>}
              {selected.description && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {selected.description}
                </div>
              )}

              {/* Azioni */}
              {selected.status === 'matched' && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold" style={{color: '#5B2D8E'}}>{t('bizOrdersNewToConfirm')}</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('bizOrdersIndicativePrice')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <input type="number" className="input pl-8" value={proximityPrice}
                        onChange={e => setProximityPrice(e.target.value)} placeholder={t('bizOrdersIndicativePricePh')} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={acceptOrder} disabled={actionLoading}
                      className="flex-1 py-3 text-white rounded-xl font-semibold hover:opacity-90" style={{background: '#5B2D8E'}}>
                      {actionLoading ? '...' : t('missionsAccept')}
                    </button>
                    <button onClick={async () => {
                      if (!confirm(t('bizOrdersConfirmReject'))) return
                      await supabase.from('missions').update({ status: 'cancelled' }).eq('id', selected.id)
                      const clientId = selected.client_id || selected.client?.id
                      if (clientId) await supabase.from('notifications').insert({
                        user_id: clientId, type: 'proximity_rejected', title: t('bizOrdersNotifRejectedTitle'),
                        body: `${businessName} ${t('bizOrdersNotifRejectedBody')}`, data: { mission_id: selected.id }
                      })
                      if (user) loadOrders(user.id); setSelected(null)
                    }} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100">
                      {t('missionsReject')}
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'confirmed' && (
                <div className="border-t pt-4">
                  <button onClick={async () => {
                    await supabase.from('missions').update({ status: 'in_progress', checkin_at: new Date().toISOString() }).eq('id', selected.id)
                    if (user) loadOrders(user.id); setSelected(null)
                  }} className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600" disabled={actionLoading}>
                    {t('bizOrdersStartWork')}
                  </button>
                </div>
              )}

              {selected.status === 'in_progress' && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold">{t('bizOrdersCloseOrder')}</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('bizOrdersFinalPrice')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <input type="number" className="input pl-8" value={finalPrice}
                        onChange={e => setFinalPrice(e.target.value)} placeholder={t('bizOrdersFinalPricePh')} />
                    </div>
                    {selected.price_agreed > 0 && <p className="text-xs text-gray-400 mt-1">{t('bizOrdersIndicativeLabel')}: €{selected.price_agreed}</p>}
                  </div>
                  <button onClick={() => completeOrder(false)} className="btn-primary w-full" disabled={actionLoading || !finalPrice}>
                    {actionLoading ? '...' : t('bizOrdersDeliveredInApp')}
                  </button>
                  <button onClick={() => completeOrder(true)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200" disabled={actionLoading}>
                    {t('bizOrdersDeliveredExternal')}
                  </button>
                </div>
              )}

              {selected.status === 'completed' && !selected.payment_outside_platform && (
                <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 border-t pt-4">
                  {t('bizOrdersCompletedMsg')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
