'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/ui/StatusBadge'
import { ArrowRight, CreditCard } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface CategoryTile { slug: string; name_it: string; name_en: string; icon: string }

export default function ClientHome() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recentMissions, setRecentMissions] = useState<any[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [showAllProximity, setShowAllProximity] = useState(false)
  const [serviceCategories, setServiceCategories] = useState<CategoryTile[]>([])
  const [proximityCategories, setProximityCategories] = useState<CategoryTile[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users')
        .select('*, profiles_client(total_spent, trust_score, search_radius_km)')
        .eq('auth_id', session.user.id).single()
      setUser(u)
      if (u) {
        setTotalSpent(u.profiles_client?.[0]?.total_spent ?? 0)
        setProfile(u.profiles_client?.[0])
        const { data: missions } = await supabase.from('missions')
          .select('id, title, status, price_agreed, scheduled_at, category:service_categories(slug, name_it, name_en, icon)')
          .eq('client_id', u.id)
          .order('created_at', { ascending: false })
          .limit(4)
        setRecentMissions(missions ?? [])
      }
    })
  }, [])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon, category_type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setServiceCategories(
          rows.filter((c: any) => c.category_type === 'standard')
            .map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🛠️' }))
        )
        setProximityCategories(
          rows.filter((c: any) => c.category_type === 'proximity')
            .map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🏪' }))
        )
      })
  }, [])

  const categoryName = (cat: CategoryTile) => (lang === 'it' ? cat.name_it : (cat.name_en || cat.name_it))

  const visibleProximity = showAllProximity ? proximityCategories : proximityCategories.slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('hello')}, {user?.full_name?.split(' ')[0] ?? t('genericUser')} 👋
          </h1>
          <p className="text-gray-500 mt-1">{t('whatDoYouNeed')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('totalSpentLabel')}</p>
          <p className="text-xl font-bold text-accent mt-0.5">€{totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* CTA principale */}
      <Link href="/client/request/new"
        className="flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-transform hover:scale-[1.01]"
        style={{background:'linear-gradient(135deg,#E25C45,#f07a63)'}}>
        <span className="text-2xl">+</span> {t('requestServiceButton')}
      </Link>

      {/* Servizi professionali */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('professionalServicesTitle')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {serviceCategories.map(cat => (
            <Link key={cat.slug} href={`/client/request/new?category=${cat.slug}`}
              className="card hover:shadow-md transition-all cursor-pointer text-center p-4 hover:border-accent"
              style={{padding:'1rem'}}>
              <div className="text-3xl mb-2">{cat.icon}</div>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{categoryName(cat)}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Attività di prossimità */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('proximityBusinessesTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('proximityBusinessesSubtitle')}</p>
          </div>
          <span className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
            style={{background:'#5B2D8E'}}>
            {proximityCategories.length}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleProximity.map(cat => (
            <Link key={cat.slug} href={`/client/proximity?category=${cat.slug}`}
              className="card hover:shadow-md transition-all cursor-pointer text-center hover:border-purple-300"
              style={{padding:'1rem',borderColor:'#f3e8ff'}}>
              <div className="text-3xl mb-2">{cat.icon}</div>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{categoryName(cat)}</p>
            </Link>
          ))}
        </div>
        {!showAllProximity && proximityCategories.length > 6 && (
          <button onClick={() => setShowAllProximity(true)}
            className="mt-3 w-full py-2.5 text-sm font-semibold rounded-xl border-2 border-dashed transition-colors"
            style={{color:'#5B2D8E',borderColor:'#d8b4fe'}}>
            {t('showAll')} ({proximityCategories.length}) ▼
          </button>
        )}
      </div>

      {/* Pagamenti */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('paymentsTitle')}</h2>
          <Link href="/client/payments" className="text-sm font-medium flex items-center gap-1" style={{color:'#E25C45'}}>
            {t('viewAllPayments')} <ArrowRight size={14}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center p-5" style={{borderColor:'#fce7f3'}}>
            <CreditCard className="mx-auto mb-2 text-accent" size={24}/>
            <p className="text-2xl font-bold text-accent">€{totalSpent.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('totalSpentCardLabel')}</p>
          </div>
          <div className="card text-center p-5">
            <span className="text-2xl block mb-2">📋</span>
            <p className="text-2xl font-bold text-gray-900">{recentMissions.length}</p>
            <p className="text-xs text-gray-500 mt-1">{t('servicesRequestedLabel')}</p>
          </div>
        </div>
        {/* Ultime transazioni */}
        <div className="mt-3 card" style={{padding:'1rem'}}>
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('recentTransactionsTitle')}</p>
          {recentMissions.filter(m => m.status === 'completed' || m.status === 'reviewed').length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-3">{t('noTransactionsYet')}</p>
          ) : (
            recentMissions.filter(m => ['completed','reviewed'].includes(m.status)).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{(m.category as any)?.icon ?? '📋'}</span>
                  <span className="text-sm text-gray-700 truncate max-w-[160px]">{m.title}</span>
                </div>
                {m.price_agreed > 0 && <span className="text-sm font-bold text-accent">-€{m.price_agreed}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ultime richieste */}
      {recentMissions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t('recentRequestsTitle')}</h2>
            <Link href="/client/missions" className="text-sm font-medium flex items-center gap-1" style={{color:'#E25C45'}}>
              {t('viewAllRequests')} <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="space-y-3">
            {recentMissions.map(m => (
              <Link key={m.id} href="/client/missions"
                className="card flex items-center justify-between hover:shadow-md transition-shadow"
                style={{padding:'1rem'}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{background:'#fff7ed'}}>
                    {(m.category as any)?.icon ?? '📋'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.title}</p>
                    <StatusBadge status={m.status}/>
                  </div>
                </div>
                {m.price_agreed > 0 && <p className="font-bold" style={{color:'#1D9E75'}}>€{m.price_agreed}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
