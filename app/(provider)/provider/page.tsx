'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/ui/StatusBadge'
import PaymentServices from '@/components/ui/PaymentServices'
import { ArrowRight, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export default function ProviderHome() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pendingMissions, setPendingMissions] = useState<any[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [availStatus, setAvailStatus] = useState('offline')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(pp)
      setAvailStatus(pp?.availability_status ?? 'offline')
      if (u) {
        const { data: missions } = await supabase.from('missions')
          .select('id, title, status, price_agreed, scheduled_at, category:service_categories(slug, name_it, icon), client:users!missions_client_id_fkey(full_name)')
          .eq('provider_id', u.id)
          .in('status', ['matched','confirmed','in_progress'])
          .order('created_at', { ascending: false })
        setPendingMissions(missions ?? [])
        const { data: completed } = await supabase.from('missions')
          .select('price_agreed, payment_outside_platform')
          .eq('provider_id', u.id).in('status', ['completed','reviewed'])
        const total = (completed ?? []).filter(m => !m.payment_outside_platform)
          .reduce((s, m) => s + (m.price_agreed ?? 0), 0)
        setTotalEarned(total)
      }
    })
  }, [])

  const toggleAvailability = async () => {
    const next = availStatus === 'online' ? 'offline' : 'online'
    setAvailStatus(next)
    if (user) await supabase.from('profiles_provider').update({ availability_status: next }).eq('user_id', user.id)
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('providerHomeGreeting')} {user?.full_name?.split(' ')[0] ?? t('providerFallbackName')} 👋</h1>
          <button onClick={toggleAvailability}
            className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all"
            style={availStatus==='online'
              ? {background:'#f0fdf4',color:'#166534',borderColor:'#86efac'}
              : {background:'#f9fafb',color:'#6b7280',borderColor:'#e5e7eb'}}>
            {availStatus==='online'?<><ToggleRight size={16}/>{t('statusOnline')}</>:<><ToggleLeft size={16}/>{t('statusOffline')}</>}
          </button>
        </div>
        <Link href="/provider/wallet" className="text-right hover:opacity-80">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('providerHomeEarnedLabel')}</p>
          <p className="text-xl font-bold mt-0.5" style={{color:'#1D9E75'}}>€{totalEarned.toFixed(2)}</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {val: pendingMissions.filter(m=>m.status==='matched').length, label:t('missionsFilterPending'), color:'#f59e0b'},
          {val: pendingMissions.filter(m=>['confirmed','in_progress'].includes(m.status)).length, label:t('providerHomeStatActive'), color:'#1A73E8'},
          {val: profile?.avg_rating ? Number(profile.avg_rating).toFixed(1) : '—', label:t('statRatingLabel'), color:'#E25C45'},
        ].map(s=>(
          <div key={s.label} className="card text-center p-4">
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Missioni attive */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('providerHomeActiveMissionsTitle')}</h2>
          <Link href="/provider/missions" className="text-sm font-medium flex items-center gap-1" style={{color:'#1A73E8'}}>
            {t('providerHomeSeeAll')} <ArrowRight size={14}/>
          </Link>
        </div>
        {pendingMissions.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">{t('providerHomeEmptyTitle')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('providerHomeEmptySubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMissions.map(m=>(
              <Link key={m.id} href="/provider/missions"
                className="card flex items-center justify-between hover:shadow-md transition-shadow"
                style={{padding:'1rem'}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#eff6ff'}}>
                    {(m.category as any)?.icon??'📋'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={m.status}/>
                      <span className="text-xs text-gray-400">{(m.client as any)?.full_name}</span>
                    </div>
                  </div>
                </div>
                {m.price_agreed>0 && <p className="font-bold" style={{color:'#1D9E75'}}>€{m.price_agreed}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Wallet rapido */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('providerHomeWalletTitle')}</h2>
          <Link href="/provider/wallet" className="text-sm font-medium flex items-center gap-1" style={{color:'#1D9E75'}}>
            {t('providerHomeSeeAllWallet')} <ArrowRight size={14}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/provider/wallet" className="card text-center p-5 hover:shadow-md transition-all">
            <p className="text-2xl font-bold" style={{color:'#1D9E75'}}>€{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('providerHomeTotalEarnedLabel')}</p>
          </Link>
          <Link href="/provider/wallet?tab=methods" className="card text-center p-5 hover:shadow-md transition-all">
            <p className="text-3xl mb-1">🏦</p>
            <p className="text-xs text-gray-500">{t('walletTabMethods')}</p>
            <p className="text-xs font-semibold mt-1" style={{color:'#1A73E8'}}>{t('providerHomeManage')}</p>
          </Link>
        </div>
      </div>

      {/* Pagamenti JOBBY */}
      <PaymentServices paymentsHref="/provider/payments" compact/>
    </div>
  )
}
