'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

const DATE_LOCALES: Record<string, string> = { it: 'it-IT', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }

export default function BusinessWallet() {
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
      const { data: pp } = await supabase.from('profiles_provider').select('business_data').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(pp)
      if (u) {
        const { data } = await supabase.from('missions')
          .select('id, title, price_agreed, checkout_at, payment_outside_platform, status, category:service_categories(icon, name_it), client:users!missions_client_id_fkey(full_name)')
          .eq('provider_id', u.id).in('status', ['completed','reviewed'])
          .order('checkout_at', { ascending: false })
        setTransactions(data ?? [])
        setLoading(false)
      }
    })
  }, [])

  const inApp = transactions.filter(t => !t.payment_outside_platform)
  const totalEarned = inApp.reduce((s, t) => s + (t.price_agreed ?? 0), 0)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(DATE_LOCALES[lang] ?? 'en-US', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const bd = profile?.business_data ?? {}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('walletTitle')}</h1>
          <p className="text-gray-500 text-sm">{bd.business_name || t('bizYourBusiness')}</p>
        </div>
      </div>

      <div className="card text-white" style={{background:'linear-gradient(135deg,#5B2D8E,#7C3FC4)',border:'none'}}>
        <p className="text-sm mb-1" style={{color:'#e9d5ff'}}>{t('bizWalletTotalEarned')}</p>
        <p className="text-4xl font-bold">€{totalEarned.toFixed(2)}</p>
        <div className="flex gap-6 mt-4">
          <div><p className="text-xs" style={{color:'#e9d5ff'}}>{t('bizWalletOrdersPaidInApp')}</p><p className="text-lg font-bold">{inApp.length}</p></div>
          <div><p className="text-xs" style={{color:'#e9d5ff'}}>{t('walletExternalPayments')}</p><p className="text-lg font-bold">{transactions.length-inApp.length}</p></div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{background:'#f3f4f6'}}>
        {[{id:'transactions',label:t('walletTabTransactions')},{id:'methods',label:t('walletTabMethods')}].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab===tab.id?{background:'#fff',color:'#5B2D8E',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}:{color:'#6b7280'}}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab==='transactions' && (
        <div className="space-y-3">
          {loading?<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#5B2D8E',borderTopColor:'transparent'}}/></div>
          :transactions.length===0?<div className="card text-center py-12"><p className="text-4xl mb-3">📭</p><p className="text-gray-500">{t('walletEmptyTransactions')}</p></div>
          :transactions.map(tx=>(
            <div key={tx.id} className="card flex items-center gap-4" style={{padding:'1rem'}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{background:tx.payment_outside_platform?'#f3f4f6':'#f5f3ff'}}>
                {(tx.category as any)?.icon??'📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{tx.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{(tx.client as any)?.full_name??'—'} · {fmtDate(tx.checkout_at)}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                  style={tx.payment_outside_platform?{background:'#f3f4f6',color:'#6b7280'}:{background:'#f5f3ff',color:'#5B2D8E'}}>
                  {tx.payment_outside_platform?t('walletExternalPaymentBadge'):t('walletInAppPaymentBadge')}
                </span>
              </div>
              <p className="font-bold flex-shrink-0" style={{color:tx.payment_outside_platform?'#6b7280':'#5B2D8E'}}>
                {tx.payment_outside_platform?'—':`+€${tx.price_agreed??0}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab==='methods' && (
        <div className="space-y-4">
          <div className="card border-2 border-dashed text-center py-6 cursor-pointer hover:border-purple-300 transition-colors" style={{borderColor:'#d8b4fe'}}>
            <Plus className="mx-auto mb-2" style={{color:'#5B2D8E'}} size={24}/>
            <p className="font-semibold text-sm" style={{color:'#5B2D8E'}}>{t('bizWalletAddIban')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('walletYobIntegration')}</p>
          </div>
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
