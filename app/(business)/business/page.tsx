'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/ui/StatusBadge'
import PaymentServices from '@/components/ui/PaymentServices'
import { ArrowRight, Clock, Package, CheckCircle } from 'lucide-react'

export default function BusinessHome() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(pp)
      if (u) {
        const { data: orders } = await supabase.from('missions')
          .select('id, title, status, price_agreed, category:service_categories(slug, name_it, icon), client:users!missions_client_id_fkey(full_name)')
          .eq('provider_id', u.id).in('status', ['matched','confirmed','in_progress'])
          .order('created_at', { ascending: false })
        setPendingOrders(orders ?? [])
        const { data: done } = await supabase.from('missions')
          .select('price_agreed, payment_outside_platform')
          .eq('provider_id', u.id).in('status', ['completed','reviewed'])
        const paid = (done ?? []).filter(m => !m.payment_outside_platform)
        setTotalEarned(paid.reduce((s, m) => s + (m.price_agreed ?? 0), 0))
        setCompletedCount(done?.length ?? 0)
      }
    })
  }, [])

  const bd = profile?.business_data ?? {}
  const businessName = bd.business_name || user?.full_name || 'La tua attività'

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="card text-white" style={{background:'linear-gradient(135deg,#5B2D8E,#7C3FC4)',border:'none'}}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🏪</div>
          <div>
            <h1 className="text-xl font-bold">{businessName}</h1>
            {bd.business_address && <p className="text-purple-200 text-sm mt-0.5">📍 {bd.business_address}</p>}
            <Link href="/business/wallet" className="inline-block mt-2">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white">
                💼 Totale incassato: <strong>€{totalEarned.toFixed(2)}</strong>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {icon:<Clock size={20}/>, val:pendingOrders.filter(o=>o.status==='matched').length, label:'Da confermare', color:'#5B2D8E'},
          {icon:<Package size={20}/>, val:pendingOrders.filter(o=>o.status!=='matched').length, label:'In lavorazione', color:'#1A73E8'},
          {icon:<CheckCircle size={20}/>, val:completedCount, label:'Completati', color:'#1D9E75'},
        ].map((s,i)=>(
          <div key={i} className="card text-center p-4">
            <div className="flex justify-center mb-1" style={{color:s.color}}>{s.icon}</div>
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ordini */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">📦 Ordini attivi</h2>
          <Link href="/business/orders" className="text-sm font-medium flex items-center gap-1" style={{color:'#5B2D8E'}}>
            Tutti <ArrowRight size={14}/>
          </Link>
        </div>
        {pendingOrders.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">Nessun ordine attivo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map(o=>(
              <Link key={o.id} href="/business/orders"
                className="card flex items-center justify-between hover:shadow-md transition-shadow border-l-4"
                style={{padding:'1rem',borderLeftColor:o.status==='matched'?'#5B2D8E':o.status==='in_progress'?'#1D9E75':'#1A73E8'}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#f5f3ff'}}>
                    {(o.category as any)?.icon??'📦'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{o.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={o.status}/>
                      <span className="text-xs text-gray-400">{(o.client as any)?.full_name}</span>
                    </div>
                    {o.status==='matched'&&<p className="text-xs font-semibold mt-0.5" style={{color:'#5B2D8E'}}>⚡ Da confermare</p>}
                  </div>
                </div>
                {o.price_agreed>0?<p className="font-bold" style={{color:'#1D9E75'}}>€{o.price_agreed}</p>:<span className="text-xs text-gray-400">Prezzo da definire</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Wallet rapido */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">💼 Wallet e Incassi</h2>
          <Link href="/business/wallet" className="text-sm font-medium flex items-center gap-1" style={{color:'#5B2D8E'}}>
            Vedi tutto <ArrowRight size={14}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/business/wallet" className="card text-center p-5 hover:shadow-md transition-all">
            <p className="text-2xl font-bold" style={{color:'#5B2D8E'}}>€{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Totale incassato</p>
          </Link>
          <Link href="/business/wallet?tab=methods" className="card text-center p-5 hover:shadow-md transition-all">
            <p className="text-3xl mb-1">🏦</p>
            <p className="text-xs text-gray-500">IBAN incassi</p>
            <p className="text-xs font-semibold mt-1" style={{color:'#5B2D8E'}}>Gestisci →</p>
          </Link>
        </div>
      </div>

      {/* Pagamenti JOBBY */}
      <PaymentServices paymentsHref="/business/payments" compact/>
    </div>
  )
}
