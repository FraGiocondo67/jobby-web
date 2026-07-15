'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MapPin, X } from 'lucide-react'
import type { MapMarker } from '@/components/map/LeafletMap'
import { useLanguage } from '@/lib/i18n'

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-100 rounded-2xl" style={{height:'460px'}}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{borderColor:'#1A73E8',borderTopColor:'transparent'}}/>
    </div>
  )
})

const DEFAULT_CENTER: [number, number] = [45.6667, 12.2417]

const STATUS_COLORS: Record<string,string> = {
  published: '#f59e0b', matched: '#f59e0b', confirmed: '#1A73E8', in_progress: '#1D9E75',
}

export default function ProviderMap() {
  const { t, lang } = useLanguage()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [missions, setMissions] = useState<any[]>([])
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [filter, setFilter] = useState('all')
  const [cats, setCats] = useState<{slug:string; name_it?:string; name_en?:string; icon:string}[]>([{slug:'all',icon:'🗺️'}])

  const catLabel = (c: {slug:string; name_it?:string; name_en?:string}) =>
    c.slug === 'all' ? t('mapAllChipLabel') : (lang === 'it' ? c.name_it : (c.name_en || c.name_it))

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon')
      .eq('is_active', true)
      .eq('category_type', 'standard')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setCats([
          {slug:'all',icon:'🗺️'},
          ...(data ?? []).map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🛠️' })),
        ])
      })
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { const loc:[number,number]=[pos.coords.latitude,pos.coords.longitude]; setUserLocation(loc); setCenter(loc) },
        () => setCenter(DEFAULT_CENTER)
      )
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      if (!u) return
      setUserId(u.id)

      // Missioni aperte vicino al provider
      const { data } = await supabase.from('missions')
        .select(`id, title, status, price_agreed, address, scheduled_at,
          category:service_categories(slug, name_it, icon),
          client:users!missions_client_id_fkey(full_name, trust_score)`)
        .in('status', ['published','matched'])
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(30)
      setMissions(data ?? [])
      setLoading(false)
    })
  }, [])

  const fakeCoords = useCallback((seed: string, base: [number, number]): [number, number] => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    return [
      base[0] + (((hash & 0xFFFF) / 0xFFFF) - 0.5) * 0.06,
      base[1] + ((((hash >> 16) & 0xFFFF) / 0xFFFF) - 0.5) * 0.06,
    ]
  }, [])

  useEffect(() => {
    const base = userLocation ?? DEFAULT_CENTER
    const newMarkers: MapMarker[] = []

    if (userLocation) {
      newMarkers.push({ id:'user', lat:userLocation[0], lng:userLocation[1],
        type:'user', title:t('mapLegendYourLocation'), icon:'⚡', color:'#1A73E8' })
    }

    missions.filter(m => filter==='all' || (m.category as any)?.slug===filter)
      .forEach(m => {
        const [lat, lng] = fakeCoords(m.id, base)
        const color = STATUS_COLORS[m.status] ?? '#666'
        newMarkers.push({
          id: `m-${m.id}`, lat, lng, type:'mission',
          title: m.title,
          subtitle: `${m.address ?? ''} · ${m.price_agreed>0?`€${m.price_agreed}`:t('providerMapBudgetTbd')}`,
          icon: (m.category as any)?.icon ?? '📋',
          color,
          onClick: () => setSelected(m),
        })
      })

    setMarkers(newMarkers)
  }, [missions, userLocation, filter, fakeCoords, t])

  return (
    <div className="space-y-4 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('providerMapTitle')}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={14}/>
            <span>{missions.length} {t('providerMapRequestsSuffix')}</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c=>(
            <button key={c.slug} onClick={()=>setFilter(c.slug)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border-2 transition-all"
              style={filter===c.slug?{background:'#1A73E8',color:'#fff',borderColor:'#1A73E8'}:{background:'#fff',color:'#6b7280',borderColor:'#e5e7eb'}}>
              {c.icon} {catLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <LeafletMap center={center} zoom={13} markers={markers} height="460px"/>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#1A73E8',borderTopColor:'transparent'}}/>
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg text-xs space-y-1.5" style={{zIndex:1000}}>
          <p className="font-semibold text-gray-700 mb-2">{t('mapLegendTitle')}</p>
          {[{color:'#1A73E8',label:t('mapLegendYourLocation')},{color:'#f59e0b',label:t('providerMapLegendAvailable')},{color:'#1D9E75',label:t('missionsFilterInProgress')}].map(l=>(
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{background:l.color}}/>
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista richieste */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="font-bold text-gray-900 mb-3">{t('providerMapAvailableRequestsTitle')}</h2>
        {missions.filter(m=>filter==='all'||(m.category as any)?.slug===filter).length===0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">{t('providerMapEmptyTitle')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('providerMapEmptySubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {missions.filter(m=>filter==='all'||(m.category as any)?.slug===filter).map(m=>(
              <button key={m.id} onClick={()=>setSelected(m)}
                className="w-full card flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                style={{padding:'0.875rem',borderLeft:`4px solid ${STATUS_COLORS[m.status]??'#e5e7eb'}`}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#fffbeb'}}>
                  {(m.category as any)?.icon??'📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-500 truncate">{m.address??t('providerMapNoAddress')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">👤 {(m.client as any)?.full_name}</p>
                </div>
                {m.price_agreed>0&&<p className="font-bold text-green-600 flex-shrink-0">€{m.price_agreed}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scheda missione selezionata */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4" style={{zIndex:2000}}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-lg mx-auto border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:'#fffbeb'}}>
                  {(selected.category as any)?.icon??'📋'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.title}</p>
                  {selected.address&&<p className="text-xs text-gray-500 mt-0.5">📍 {selected.address}</p>}
                  <p className="text-xs text-gray-400">👤 {(selected.client as any)?.full_name}</p>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400"/>
              </button>
            </div>
            {selected.price_agreed>0&&<p className="text-2xl font-bold text-green-600 mb-3">€{selected.price_agreed}</p>}
            <a href="/provider/missions"
              className="block w-full py-3 text-white font-semibold rounded-xl text-center text-sm" style={{background:'#1A73E8'}}>
              {t('providerMapGoToMissions')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
