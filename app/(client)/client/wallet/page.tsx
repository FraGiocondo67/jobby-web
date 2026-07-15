'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { ArrowLeft, CreditCard, Plus, Trash2, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

const DATE_LOCALES: Record<string, string> = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }

export default function WalletPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transactions'|'methods'>('transactions')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      const { data: cp } = await supabase.from('profiles_client').select('total_spent, trust_score').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(cp)

      // Carica missioni completate (= transazioni)
      const { data: missions } = await supabase.from('missions')
        .select('id, title, price_agreed, checkout_at, payment_outside_platform, status, category:service_categories(icon, name_it), provider:users!missions_provider_id_fkey(full_name)')
        .eq('client_id', u?.id)
        .in('status', ['completed', 'reviewed'])
        .order('checkout_at', { ascending: false })
      setTransactions(missions ?? [])
      setLoading(false)
    })
  }, [])

  const totalSpent = transactions.filter(t => !t.payment_outside_platform).reduce((s, t) => s + (t.price_agreed ?? 0), 0)
  const inAppCount = transactions.filter(t => !t.payment_outside_platform).length
  const externalCount = transactions.filter(t => t.payment_outside_platform).length

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(DATE_LOCALES[lang] ?? 'en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  // Metodi di pagamento (placeholder — integrazione YOB Pay futura)
  const paymentMethods = profile?.payout_details?.payment_methods ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💼 {t('walletTitle')}</h1>
          <p className="text-gray-500 text-sm">{t('walletSubtitle')}</p>
        </div>
      </div>

      {/* Saldo e stats */}
      <div className="card text-white" style={{background:'linear-gradient(135deg,#1A73E8,#0d47a1)',border:'none'}}>
        <p className="text-sm text-blue-200 mb-1">{t('walletTotalSpent')}</p>
        <p className="text-4xl font-bold">€{totalSpent.toFixed(2)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-xs text-blue-200">{t('walletInAppPayments')}</p>
            <p className="text-lg font-bold">{inAppCount}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200">{t('walletExternalPayments')}</p>
            <p className="text-lg font-bold">{externalCount}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200">{t('trustScoreLabel')}</p>
            <p className="text-lg font-bold">{Number(profile?.trust_score ?? 0).toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{background:'#f3f4f6'}}>
        {[
          { id: 'transactions', label: `📋 ${t('walletTabTransactions')}` },
          { id: 'methods', label: `💳 ${t('walletTabMethods')}` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === tab.id
              ? {background:'#fff', color:'#1A73E8', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}
              : {color:'#6b7280'}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transazioni */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#1A73E8',borderTopColor:'transparent'}}/>
            </div>
          ) : transactions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500">{t('walletEmptyTransactions')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('walletEmptyTransactionsSub')}</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="card flex items-center gap-4" style={{padding:'1rem'}}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{background: tx.payment_outside_platform ? '#f3f4f6' : '#eff6ff'}}>
                  {(tx.category as any)?.icon ?? '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{tx.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(tx.provider as any)?.full_name ?? '—'} · {fmtDate(tx.checkout_at)}
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                    style={tx.payment_outside_platform
                      ? {background:'#f3f4f6',color:'#6b7280'}
                      : {background:'#dbeafe',color:'#1e40af'}}>
                    {tx.payment_outside_platform ? `🤝 ${t('walletExternalPaymentBadge')}` : `🔒 ${t('walletInAppPaymentBadge')}`}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" style={{color: tx.payment_outside_platform ? '#6b7280' : '#E25C45'}}>
                    {tx.payment_outside_platform ? '—' : `-€${tx.price_agreed ?? 0}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Metodi di pagamento */}
      {activeTab === 'methods' && (
        <div className="space-y-4">
          {/* Cards/conti collegati */}
          {paymentMethods.length === 0 ? (
            <div className="card text-center py-10">
              <CreditCard className="mx-auto text-gray-300 mb-3" size={48}/>
              <p className="font-semibold text-gray-700">{t('walletNoMethodsTitle')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('walletNoMethodsSub')}</p>
            </div>
          ) : (
            paymentMethods.map((m: any, i: number) => (
              <div key={i} className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:'#eff6ff'}}>
                  {m.type === 'card' ? '💳' : '🏦'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{m.label}</p>
                  <p className="text-sm text-gray-500">{m.type === 'card' ? `**** **** **** ${m.last4}` : m.iban_last4}</p>
                </div>
                {m.is_default && <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#d1fae5',color:'#065f46'}}>{t('walletDefaultBadge')}</span>}
              </div>
            ))
          )}

          {/* Aggiungi metodo — placeholder YOB Pay */}
          <div className="card border-2 border-dashed text-center py-6 cursor-pointer hover:border-blue-300 transition-colors"
            style={{borderColor:'#bfdbfe'}}>
            <Plus className="mx-auto mb-2" style={{color:'#1A73E8'}} size={24}/>
            <p className="font-semibold text-sm" style={{color:'#1A73E8'}}>{t('walletAddMethod')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('walletYobIntegration')}</p>
          </div>

          {/* Info sicurezza */}
          <div className="card" style={{background:'#f8fafc',border:'none'}}>
            <div className="flex gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">{t('walletSecureTitle')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('walletSecureText')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
