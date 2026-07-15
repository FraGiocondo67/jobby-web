'use client'
import { useEffect, useState, useCallback } from 'react'
import { Missions, Providers } from '@/lib/client-api'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/ui/StatusBadge'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

const FILTERS = [
  { id: 'matched', key: 'missionsFilterPending' },
  { id: 'confirmed', key: 'missionsFilterConfirmed' },
  { id: 'in_progress', key: 'missionsFilterInProgress' },
  { id: 'completed', key: 'missionsFilterCompleted' },
  { id: 'all', key: 'missionsFilterAll' },
]

export default function ProviderMissions() {
  const { t } = useLanguage()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('matched')
  const [profile, setProfile] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [workflowStep, setWorkflowStep] = useState<string | null>(null)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [proximityPrice, setProximityPrice] = useState('')
  const [finalPrice, setFinalPrice] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      if (u) {
        const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u.id).single()
        setProfile(pp)
      }
    })
    load()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await Missions.list({ role: 'provider', statuses: ['matched','confirmed','in_progress','completed','reviewed'], limit: 100 })
      setMissions(res.missions ?? [])
    } catch (e: any) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const doAction = async (action: () => Promise<any>) => {
    setActionLoading(true)
    try { await action(); await load(); setSelected(null); setWorkflowStep(null) }
    catch (e: any) { alert(t('errorPrefix') + e.message) }
    finally { setActionLoading(false) }
  }

  const toggleStatus = async () => {
    setStatusLoading(true)
    try {
      const next = profile?.availability_status === 'online' ? 'offline' : 'online'
      await Providers.setStatus(next)
      setProfile((p: any) => ({ ...p, availability_status: next }))
    } catch (e: any) { alert(e.message) }
    finally { setStatusLoading(false) }
  }

  const filtered = filter === 'all' ? missions : missions.filter(m => m.status === filter)
  const isProximity = profile?.is_proximity_business
  const isOnline = profile?.availability_status === 'online'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('providerMissionsTitle')}</h1>
        <div className="flex gap-2">
          <button onClick={toggleStatus} disabled={statusLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm border-2 transition-colors
              ${isOnline ? 'border-green-400 text-green-600 bg-green-50' : 'border-gray-200 text-gray-500'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? t('statusOnline') : t('statusOffline')}
          </button>
          <button onClick={load} className="btn-outline p-2"><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${filter === f.id ? 'bg-blue text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            style={filter === f.id ? { background: '#1A73E8' } : {}}>
            {t(f.key)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1A73E8', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">{t('providerMissionsEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} onClick={() => { setSelected(m); setWorkflowStep(null); setProximityPrice(''); setFinalPrice(m.price_agreed > 0 ? String(m.price_agreed) : '') }}
              className={`card flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border-l-4
                ${m.status === 'matched' ? 'border-yellow-400' : m.status === 'confirmed' ? 'border-blue-400' :
                  m.status === 'in_progress' ? 'border-green-400' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                  {m.category?.icon ?? '📋'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={m.status} />
                    <span className="text-xs text-gray-400">· {m.client?.full_name}</span>
                  </div>
                  {m.status === 'matched' && isProximity && (
                    <p className="text-xs font-semibold text-purple-600 mt-1">{t('providerMissionsNewRequest')}</p>
                  )}
                </div>
              </div>
              {m.price_agreed > 0 && <p className="font-bold text-green-600">€{m.price_agreed}</p>}
            </div>
          ))}
        </div>
      )}

      {/* MODAL WORKFLOW */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { setSelected(null); setWorkflowStep(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selected.title}</h2>
                  <p className="text-sm text-gray-500">👤 {selected.client?.full_name}</p>
                </div>
                <button onClick={() => { setSelected(null); setWorkflowStep(null) }} className="text-gray-400 text-xl">✕</button>
              </div>

              <StatusBadge status={selected.status} />
              {selected.address && <p className="text-sm text-gray-600">📍 {selected.address}</p>}
              {selected.price_agreed > 0 && <p className="text-2xl font-bold text-green-600">€{selected.price_agreed}</p>}
              {selected.description && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</div>
              )}

              {/* RATING STEP */}
              {workflowStep === 'rating' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t('providerMissionsRateClientTitle')}</h3>
                  <div className="flex gap-2 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRatingScore(s)}
                        className={`text-3xl transition-opacity ${s <= ratingScore ? 'opacity-100' : 'opacity-25'}`}>⭐</button>
                    ))}
                  </div>
                  <textarea className="input resize-none" rows={2} value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)} placeholder={t('providerMissionsCommentPlaceholder')} />
                  <button onClick={() => doAction(() => Missions.reviewClient(selected.id, ratingScore, ratingComment))}
                    disabled={!ratingScore || actionLoading} className="btn-primary w-full">
                    {actionLoading ? '...' : t('providerMissionsSubmitRating')}
                  </button>
                </div>
              )}

              {/* PAYMENT/CHECKOUT STEP */}
              {workflowStep === 'payment' && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold">{isProximity ? t('providerMissionsCloseOrderTitle') : t('providerMissionsPaymentTitle')}</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{t('providerMissionsFinalPriceLabel')}</label>
                    <input type="number" className="input" value={finalPrice} onChange={e => setFinalPrice(e.target.value)}
                      placeholder={selected.price_agreed > 0 ? String(selected.price_agreed) : t('providerMissionsEnterPricePlaceholder')} />
                  </div>
                  <button disabled={actionLoading || !finalPrice}
                    onClick={() => doAction(() => Missions.checkout(selected.id, false, parseFloat(finalPrice)))}
                    className="btn-primary w-full">
                    {isProximity ? t('providerMissionsDeliveredInAppPayment') : t('walletInAppPaymentBadge')}
                  </button>
                  <button disabled={actionLoading}
                    onClick={async () => {
                      if (!confirm(t('providerMissionsExternalPaymentConfirm'))) return
                      await doAction(() => Missions.checkout(selected.id, true, parseFloat(finalPrice) || undefined))
                    }}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold">
                    🤝 {isProximity ? t('providerMissionsDeliveredExternalPayment') : t('walletExternalPaymentBadge')}
                  </button>
                </div>
              )}

              {/* AZIONI PRINCIPALI */}
              {!workflowStep && (
                <div className="space-y-3 border-t pt-4">
                  {/* Prossimità: accetta/rifiuta */}
                  {selected.status === 'matched' && isProximity && (
                    <div className="space-y-3">
                      <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700">{t('providerMissionsDirectRequestBanner')}</div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('providerMissionsIndicativePriceLabel')}</label>
                        <input type="number" className="input" value={proximityPrice} onChange={e => setProximityPrice(e.target.value)} placeholder={t('providerMissionsPricePlaceholderExample')} />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => doAction(() => Missions.accept(selected.id, parseFloat(proximityPrice) || undefined))}
                          disabled={actionLoading} className="flex-1 py-3 text-white rounded-xl font-semibold" style={{ background: '#5B2D8E' }}>
                          {t('missionsAccept')}
                        </button>
                        <button onClick={() => { if (confirm(t('providerMissionsRejectConfirm'))) doAction(() => Missions.reject(selected.id)) }}
                          disabled={actionLoading} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-semibold">
                          {t('missionsReject')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard: in attesa conferma cliente */}
                  {selected.status === 'matched' && !isProximity && (
                    <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
                      {t('providerMissionsWaitingClientConfirm')}
                    </div>
                  )}

                  {/* Check-in */}
                  {selected.status === 'confirmed' && (
                    <button onClick={() => doAction(() => Missions.checkin(selected.id))}
                      disabled={actionLoading} className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold">
                      {t('providerMissionsCheckin')}
                    </button>
                  )}

                  {/* Check-out */}
                  {selected.status === 'in_progress' && (
                    <button onClick={() => setWorkflowStep('payment')} className="btn-primary w-full">
                      {t('providerMissionsCheckout')}
                    </button>
                  )}

                  {/* Valuta */}
                  {selected.status === 'completed' && !selected.payment_outside_platform && (
                    <button onClick={() => setWorkflowStep('rating')} className="btn-primary w-full">
                      {t('providerMissionsRateClientTitle')}
                    </button>
                  )}

                  {selected.status === 'completed' && selected.payment_outside_platform && (
                    <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
                      {t('providerMissionsExternalPaymentNotice')}
                    </div>
                  )}

                  {/* Chat */}
                  {['matched','confirmed','in_progress'].includes(selected.status) && (
                    <Link href={`/provider/chat/${selected.id}`}
                      className="block w-full text-center py-3 border-2 border-blue-400 text-blue-600 rounded-xl font-semibold">
                      {t('providerMissionsOpenChat')}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
