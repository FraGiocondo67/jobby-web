'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import type { MapMarker } from '@/components/map/LeafletMap'

interface CategoryChip { slug: string; name_it: string; name_en: string; icon: string }

// Coordinate default: Treviso (zona operativa JOBBY)
const DEFAULT_CENTER: [number, number] = [45.6667, 12.2417]

function MapLoadingFallback() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center bg-gray-100 rounded-2xl" style={{height:'460px'}}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#E25C45',borderTopColor:'transparent'}}/>
        <p className="text-sm text-gray-500">{t('mapLoadingText')}</p>
      </div>
    </div>
  )
}

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false, loading: MapLoadingFallback })

export default function ClientMap() {
  const { t, lang } = useLanguage()

  const catName = (c: { name_it: string; name_en?: string }) => lang === 'it' ? c.name_it : (c.name_en || c.name_it)

  const ALL_CHIP: CategoryChip = { slug: 'all', name_it: t('mapAllChipLabel'), name_en: t('mapAllChipLabel'), icon: '🗺️' }

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showProximity, setShowProximity] = useState(true)
  const [showProviders, setShowProviders] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [categories, setCategories] = useState<CategoryChip[]>([])
  const [proximityCats, setProximityCats] = useState<CategoryChip[]>([])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon, category_type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setCategories(rows.filter((c: any) => c.category_type === 'standard')
          .map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🛠️' })))
        setProximityCats(rows.filter((c: any) => c.category_type === 'proximity')
          .map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🏪' })))
      })
  }, [])

  useEffect(() => {
    // Geolocalizzazione
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(loc)
          setCenter(loc)
        },
        () => setCenter(DEFAULT_CENTER)
      )
    }

    // Carica utente e dati
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      if (u) setUserId(u.id)
    })

    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    // Carica fornitori con location
    const { data: prov } = await supabase.from('profiles_provider')
      .select(`user_id, skills, hourly_rate, avg_rating, trust_score, bio, availability_status,
        is_proximity_business, business_data,
        user:users!profiles_provider_user_id_fkey(id, full_name)`)
      .eq('is_proximity_business', false)
      .eq('availability_status', 'online')
      .limit(50)

    const { data: biz } = await supabase.from('profiles_provider')
      .select(`user_id, skills, avg_rating, trust_score, business_data,
        user:users!profiles_provider_user_id_fkey(id, full_name)`)
      .eq('is_proximity_business', true)
      .limit(50)

    setProviders(prov ?? [])
    setBusinesses(biz ?? [])
    setLoading(false)
  }

  // Genera coordinate simulate attorno al centro (per demo — in prod usa PostGIS)
  const fakeCoords = useCallback((seed: string, base: [number, number]): [number, number] => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    const lat = base[0] + (((hash & 0xFFFF) / 0xFFFF) - 0.5) * 0.08
    const lng = base[1] + ((((hash >> 16) & 0xFFFF) / 0xFFFF) - 0.5) * 0.08
    return [lat, lng]
  }, [])

  // Ricostruisce markers quando cambiano i filtri
  useEffect(() => {
    const base = userLocation ?? DEFAULT_CENTER
    const newMarkers: MapMarker[] = []

    // Marker posizione utente
    if (userLocation) {
      newMarkers.push({ id: 'user', lat: userLocation[0], lng: userLocation[1],
        type: 'user', title: t('mapLegendYourLocation'), icon: '📍', color: '#1D9E75' })
    }

    // Fornitori
    if (showProviders) {
      providers.filter(p => filter === 'all' || (p.skills ?? []).includes(filter))
        .forEach(p => {
          const [lat, lng] = fakeCoords(p.user_id, base)
          const skills = (p.skills ?? []).slice(0, 2).join(', ')
          newMarkers.push({
            id: `prov-${p.user_id}`, lat, lng, type: 'provider',
            title: (p.user as any)?.full_name ?? t('providerFallbackName'),
            subtitle: `${skills}${p.hourly_rate ? ` · €${p.hourly_rate}/h` : ''}`,
            icon: '👤', color: '#1A73E8',
            onClick: () => setSelected({ ...p, _type: 'provider' }),
          })
        })
    }

    // Attività di prossimità
    if (showProximity) {
      businesses.filter(b => {
        const cat = b.business_data?.proximity_category ?? b.skills?.[0]
        return filter === 'all' || cat === filter
      }).forEach(b => {
        const [lat, lng] = fakeCoords(b.user_id + '_biz', base)
        const bd = b.business_data ?? {}
        const catIcon = { pharmacy:'💊', bakery:'🥐', florist:'💐', barber:'✂️', plumber:'🚿', electrician:'⚡',
          'food-delivery':'🍕', grocery:'🛒', tailor:'🧵', cobbler:'👟', 'car-rental':'🚙', carpenter:'🪵' }
        const cat = bd.proximity_category ?? b.skills?.[0] ?? 'grocery'
        newMarkers.push({
          id: `biz-${b.user_id}`, lat, lng, type: 'proximity',
          title: bd.business_name || (b.user as any)?.full_name || t('mapBusinessFallback'),
          subtitle: bd.business_address ?? '',
          icon: (catIcon as any)[cat] ?? '🏪', color: '#5B2D8E',
          onClick: () => setSelected({ ...b, _type: 'business' }),
        })
      })
    }

    setMarkers(newMarkers)
  }, [providers, businesses, userLocation, filter, showProviders, showProximity, fakeCoords, t])

  const totalVisible = markers.filter(m => m.type !== 'user').length

  return (
    <div className="space-y-4 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Filtri */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🗺️ {t('navMap')}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={14}/>
            <span>{totalVisible} {t('mapResultsCount')}</span>
          </div>
        </div>

        {/* Filtro categorie */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[ALL_CHIP, ...categories].map(cat => (
            <button key={cat.slug} onClick={() => setFilter(cat.slug)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border-2 transition-all"
              style={filter===cat.slug?{background:'#E25C45',color:'#fff',borderColor:'#E25C45'}:{background:'#fff',color:'#6b7280',borderColor:'#e5e7eb'}}>
              {cat.icon} {catName(cat)}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1"/>
          {proximityCats.map(cat => (
            <button key={cat.slug} onClick={() => setFilter(cat.slug)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border-2 transition-all"
              style={filter===cat.slug?{background:'#5B2D8E',color:'#fff',borderColor:'#5B2D8E'}:{background:'#fff',color:'#6b7280',borderColor:'#e5e7eb'}}>
              {cat.icon} {catName(cat)}
            </button>
          ))}
        </div>

        {/* Toggle layer */}
        <div className="flex gap-2">
          <button onClick={() => setShowProviders(!showProviders)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
            style={showProviders?{background:'#1A73E8',color:'#fff',borderColor:'#1A73E8'}:{background:'#fff',color:'#6b7280',borderColor:'#e5e7eb'}}>
            👤 {t('mapProvidersToggle')}
          </button>
          <button onClick={() => setShowProximity(!showProximity)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
            style={showProximity?{background:'#5B2D8E',color:'#fff',borderColor:'#5B2D8E'}:{background:'#fff',color:'#6b7280',borderColor:'#e5e7eb'}}>
            🏪 {t('mapBusinessesToggle')}
          </button>
        </div>
      </div>

      {/* Mappa */}
      <div className="relative">
        <LeafletMap center={center} zoom={13} markers={markers} height="460px"/>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#E25C45',borderTopColor:'transparent'}}/>
          </div>
        )}

        {/* Legenda */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg text-xs space-y-1.5 z-10" style={{zIndex:1000}}>
          <p className="font-semibold text-gray-700 mb-2">{t('mapLegendTitle')}</p>
          {[
            {color:'#1D9E75',label:t('mapLegendYourLocation')},
            {color:'#1A73E8',label:t('mapLegendProviderOnline')},
            {color:'#5B2D8E',label:t('mapLegendProximityBusiness')},
          ].map(l=>(
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{background:l.color}}/>
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheda dettaglio selezionato */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4" style={{zIndex:2000}}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-lg mx-auto border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{background:selected._type==='business'?'#f5f3ff':'#eff6ff'}}>
                  {selected._type==='business'?'🏪':'👤'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {selected._type==='business'
                      ? (selected.business_data?.business_name||selected.user?.full_name)
                      : selected.user?.full_name}
                  </p>
                  {selected._type==='business' && selected.business_data?.business_address && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {selected.business_data.business_address}</p>
                  )}
                  {selected._type==='provider' && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(selected.skills??[]).slice(0,3).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400"/>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              {selected.avg_rating > 0 && <span className="text-sm">⭐ {Number(selected.avg_rating).toFixed(1)}</span>}
              {selected.trust_score > 0 && <span className="text-sm text-blue-600">🛡️ {selected.trust_score}</span>}
              {selected.hourly_rate && <span className="text-sm text-green-600 font-semibold">€{selected.hourly_rate}/h</span>}
            </div>

            {selected.bio && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{selected.bio}</p>}

            <div className="flex gap-3">
              <a href={selected._type==='business'?`/client/proximity?category=${selected.business_data?.proximity_category}`:`/client/provider/${selected.user_id}`}
                className="flex-1 py-3 text-white font-semibold rounded-xl text-sm text-center"
                style={{background:selected._type==='business'?'#5B2D8E':'#E25C45'}}>
                {selected._type==='business'?`📦 ${t('mapSendOrderToBusiness')}`:`📋 ${t('mapRequestService')}`}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Lista risultati sotto la mappa */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-4">
        {showProviders && providers.filter(p => filter==='all'||(p.skills??[]).includes(filter)).length > 0 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">👤 {t('mapProvidersOnlineHeading')} ({providers.filter(p=>filter==='all'||(p.skills??[]).includes(filter)).length})</h2>
            <div className="space-y-2">
              {providers.filter(p=>filter==='all'||(p.skills??[]).includes(filter)).slice(0,5).map(p=>(
                <button key={p.user_id} onClick={()=>setSelected({...p,_type:'provider'})}
                  className="w-full card flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                  style={{padding:'0.875rem'}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#eff6ff'}}>👤</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{(p.user as any)?.full_name ?? t('providerFallbackName')}</p>
                    <p className="text-xs text-gray-500 truncate">{(p.skills??[]).slice(0,3).join(' · ') || t('mapNoSkillsSpecified')}</p>
                  </div>
                  <div className="text-right">
                    {p.avg_rating>0&&<p className="text-xs">⭐ {Number(p.avg_rating).toFixed(1)}</p>}
                    {p.hourly_rate&&<p className="text-sm font-bold" style={{color:'#1D9E75'}}>€{p.hourly_rate}/h</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showProximity && businesses.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">🏪 {t('mapProximityBusinessesHeading')} ({businesses.length})</h2>
            <div className="space-y-2">
              {businesses.slice(0,5).map(b=>{
                const bd=b.business_data??{}
                return (
                  <button key={b.user_id} onClick={()=>setSelected({...b,_type:'business'})}
                    className="w-full card flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                    style={{padding:'0.875rem'}}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#f5f3ff'}}>🏪</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{bd.business_name||(b.user as any)?.full_name}</p>
                      {bd.business_address&&<p className="text-xs text-gray-500 truncate">📍 {bd.business_address}</p>}
                    </div>
                    {b.avg_rating>0&&<p className="text-xs">⭐ {Number(b.avg_rating).toFixed(1)}</p>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
