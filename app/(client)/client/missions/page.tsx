'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Missions, Claims } from '@/lib/client-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import StatusBadge from '@/components/ui/StatusBadge'
import { RefreshCw, Plus, Flag } from 'lucide-react'
import Link from 'next/link'

const PROXIMITY_SLUGS = ['pharmacy','barber','beauty','laundry','florist','bakery','grocery','repair_shop','vet','optician']

// Missioni con un fornitore assegnato in questi stati possono generare una segnalazione.
// La finestra dei 2h post-esecuzione e la validità della fase sono comunque rivalidate lato server.
const CLAIMABLE_STATUSES = ['confirmed', 'in_progress', 'completed', 'reviewed']

const CLAIM_REASON_KEYS = [
  'missionsClaimReasonNoShow',
  'missionsClaimReasonIncomplete',
  'missionsClaimReasonDamage',
  'missionsClaimReasonPriceNotRespected',
  'missionsClaimReasonMisconduct',
  'missionsClaimReasonOther',
]

export default function ClientMissions() {
  const { t } = useLanguage()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [user, setUser] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const FILTERS = useMemo(() => [
    { id: 'all', label: t('missionsFilterAll') },
    { id: 'published', label: `🟡 ${t('missionsFilterPending')}` },
    { id: 'matched', label: `🟠 ${t('missionsFilterMatched')}` },
    { id: 'confirmed', label: `🔵 ${t('missionsFilterConfirmed')}` },
    { id: 'in_progress', label: `🟢 ${t('missionsFilterInProgress')}` },
    { id: 'completed', label: `✅ ${t('missionsFilterCompleted')}` },
  ], [t])

  const CLAIM_REASONS = useMemo(() => CLAIM_REASON_KEYS.map(k => t(k)), [t])

  // Segnalazione problema (claim)
  const [claimFormOpen, setClaimFormOpen] = useState(false)
  const [claimReason, setClaimReason] = useState('')
  const [claimDescription, setClaimDescription] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimSuccess, setClaimSuccess] = useState('')

  useEffect(() => {
    if (!claimReason && CLAIM_REASONS.length) setClaimReason(CLAIM_REASONS[0])
  }, [CLAIM_REASONS, claimReason])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      setUser(u)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await Missions.list({ role: 'client', limit: 100 })
      setMissions(res.missions ?? [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? missions : missions.filter(m => m.status === filter)

  const closeModal = () => {
    setSelected(null)
    setClaimFormOpen(false)
    setClaimReason(CLAIM_REASONS[0])
    setClaimDescription('')
    setClaimError('')
    setClaimSuccess('')
  }

  const submitClaim = async () => {
    if (!selected) return
    setClaimLoading(true); setClaimError('')
    try {
      await Claims.create({
        mission_id: selected.id,
        reason: claimReason,
        description: claimDescription.trim() || undefined,
      })
      setClaimFormOpen(false)
      setClaimDescription('')
      setClaimSuccess(`✅ ${t('missionsClaimSuccess')}`)
    } catch (e: any) { setClaimError(e.message) }
    finally { setClaimLoading(false) }
  }

  const doAction = async (action: () => Promise<any>) => {
    setActionLoading(true)
    try { await action(); await load(); closeModal() }
    catch (e: any) { alert(t('errorPrefix') + e.message) }
    finally { setActionLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 {t('missionsTitle')}</h1>
        <div className="flex gap-3">
          <button onClick={load} className="btn-outline flex items-center gap-2 py-2 px-4">
            <RefreshCw size={16} />
          </button>
          <Link href="/client/request/new" className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus size={16} /> {t('missionsNewButton')}
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      {/* Filtri */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${filter === f.id ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-accent'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">{t('missionsEmptyState')}</p>
          {filter === 'all' && <Link href="/client/request/new" className="btn-primary inline-flex mt-4">+ {t('missionsNewRequestLink')}</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} onClick={() => setSelected(m)}
              className={`card flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border-l-4
                ${m.status === 'matched' ? 'border-orange-400' : m.status === 'confirmed' ? 'border-blue-400' :
                  m.status === 'in_progress' ? 'border-green-400' : m.status === 'published' ? 'border-yellow-400' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl">
                  {m.category?.icon ?? '📋'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={m.status} />
                    {m.provider?.full_name && <span className="text-xs text-gray-400">· {m.provider.full_name}</span>}
                  </div>
                </div>
              </div>
              {m.price_agreed > 0 && <p className="font-bold text-green-600">€{m.price_agreed}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <button onClick={closeModal} className="text-gray-400 text-xl">✕</button>
              </div>

              <StatusBadge status={selected.status} />
              {selected.address && <p className="text-sm text-gray-600">📍 {selected.address}</p>}
              {selected.provider?.full_name && <p className="text-sm text-gray-600">👤 {selected.provider.full_name}</p>}
              {selected.price_agreed > 0 && <p className="text-2xl font-bold text-green-600">€{selected.price_agreed}</p>}

              <div className="space-y-3 border-t pt-4">
                {selected.status === 'published' && (
                  <button onClick={() => doAction(() => Missions.match(selected.id))}
                    disabled={actionLoading} className="btn-blue w-full">
                    🔍 {t('missionsSearchProviders')}
                  </button>
                )}

                {selected.status === 'matched' && !selected.provider_id && (
                  <button onClick={() => doAction(() => Missions.match(selected.id))}
                    disabled={actionLoading} className="btn-blue w-full">
                    🔍 {t('missionsSearchAgain')}
                  </button>
                )}

                {selected.status === 'matched' && selected.provider_id &&
                  !PROXIMITY_SLUGS.includes(selected.category?.slug) && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                      🔔 <strong>{selected.provider.full_name}</strong> {t('missionsProviderProposed')}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => doAction(() => Missions.confirmProvider(selected.id))}
                        disabled={actionLoading} className="btn-blue flex-1 py-2">✅ {t('missionsAccept')}</button>
                      <button onClick={() => doAction(() => Missions.rejectProvider(selected.id))}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl font-semibold">✗ {t('missionsReject')}</button>
                    </div>
                  </div>
                )}

                {selected.status === 'matched' && selected.provider_id &&
                  PROXIMITY_SLUGS.includes(selected.category?.slug) && (
                  <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
                    ⏳ {t('missionsRequestSentPrefix')} <strong>{selected.provider?.full_name}</strong>. {t('missionsAwaitingResponse')}
                  </div>
                )}

                {selected.status === 'confirmed' && (
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                    🔵 {t('missionsConfirmedInfo')}
                  </div>
                )}

                {selected.status === 'completed' && (
                  <Link href={`/client/chat/${selected.id}`}
                    className="block w-full text-center py-3 bg-accent text-white rounded-xl font-semibold">
                    ⭐ {t('missionsGoToChatReview')}
                  </Link>
                )}

                {['published', 'matched'].includes(selected.status) && (
                  <button onClick={() => { if (confirm(t('missionsCancelConfirm'))) doAction(() => Missions.cancel(selected.id)) }}
                    disabled={actionLoading}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold">
                    🗑 {t('missionsDeleteButton')}
                  </button>
                )}

                {['matched','confirmed','in_progress'].includes(selected.status) && selected.provider_id && (
                  <Link href={`/client/chat/${selected.id}`}
                    className="block w-full text-center py-3 border-2 border-blue-400 text-blue-600 rounded-xl font-semibold">
                    💬 {t('navChat')}
                  </Link>
                )}

                {/* Segnala un problema (claim) */}
                {claimSuccess ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                    {claimSuccess}
                  </div>
                ) : CLAIMABLE_STATUSES.includes(selected.status) && selected.provider_id && (
                  <div className="pt-2 border-t">
                    {!claimFormOpen ? (
                      <button onClick={() => setClaimFormOpen(true)}
                        className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl">
                        <Flag size={15} /> {t('missionsReportProblem')}
                      </button>
                    ) : (
                      <div className="space-y-3 mt-2">
                        {claimError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm">{claimError}</div>}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">{t('missionsClaimQuestion')}</label>
                          <select className="input" value={claimReason} onChange={e => setClaimReason(e.target.value)}>
                            {CLAIM_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">{t('missionsClaimDetailsLabel')}</label>
                          <textarea className="input resize-none" rows={3} value={claimDescription}
                            onChange={e => setClaimDescription(e.target.value)}
                            placeholder={t('missionsClaimDetailsPlaceholder')} />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={submitClaim} disabled={claimLoading}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50">
                            {claimLoading ? t('sendingEllipsis') : t('missionsSubmitClaim')}
                          </button>
                          <button onClick={() => { setClaimFormOpen(false); setClaimError('') }}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-600">
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
