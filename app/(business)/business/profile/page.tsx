'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Plus, X, Clock, Trash2 } from 'lucide-react'
import RoleSection from '@/components/ui/RoleSection'
import AvatarUpload from '@/components/ui/AvatarUpload'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { useLanguage } from '@/lib/i18n'

// Categorie ATTIVITÀ DI PROSSIMITÀ — caricate dinamicamente da /api/categories
// (fonte unica: tabella `service_categories`, gestita da JOBBY Admin/Retool).
interface ProximityCategory { slug: string; name_it: string; name_en: string; icon: string }

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABEL_KEYS = ['dayMon','dayTue','dayWed','dayThu','dayFri','daySat','daySun']
const RADII = ['2','5','10','20']
const UNITS = ['intervento','pezzo','ora','kg','servizio','mq']
const UNIT_LABEL_KEYS: Record<string,string> = {
  intervento:'unitIntervento', pezzo:'unitPezzo', ora:'unitOra', kg:'unitKg', servizio:'unitServizio', mq:'unitMq',
}

interface PriceItem { id:string; name:string; price:number; unit:string; description?:string }
interface TimeSlot { from:string; to:string }
interface DaySchedule { closed:boolean; slots:TimeSlot[] }

const SEL_PURPLE = { background:'#5B2D8E', color:'#fff', borderColor:'#5B2D8E', boxShadow:'0 4px 12px rgba(91,45,142,0.3)' }
const UNSEL = { background:'#fff', color:'#6b7280', borderColor:'#e5e7eb' }

export default function BusinessProfile() {
  const { t, lang } = useLanguage()
  const catName = (c?: ProximityCategory | null) => c ? (lang === 'it' ? c.name_it : (c.name_en || c.name_it)) : ''
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHours, setShowHours] = useState(false)
  const [showPriceList, setShowPriceList] = useState(false)

  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [canTravel, setCanTravel] = useState(true)
  const [travelRadius, setTravelRadius] = useState('5')

  // Dati fiscali
  const [vatNumber, setVatNumber] = useState('')
  const [cciaaNumber, setCciaaNumber] = useState('')
  const [atecoCode, setAtecoCode] = useState('')
  const [legalName, setLegalName] = useState('')

  const [timeSlots, setTimeSlots] = useState<Record<string,DaySchedule>>({})
  const [priceList, setPriceList] = useState<PriceItem[]>([])
  const [newItem, setNewItem] = useState<Partial<PriceItem>>({ unit:'intervento' })
  const [proximityCategories, setProximityCategories] = useState<ProximityCategory[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(pp); setPhone(u?.phone ?? '')
      if (pp) {
        setBio(pp.bio ?? ''); setPriceList(pp.price_list ?? []); setTimeSlots(pp.time_slots ?? {})
        const bd = pp.business_data ?? {}
        setBusinessName(bd.business_name ?? ''); setCategory(bd.proximity_category ?? pp.skills?.[0] ?? '')
        setBusinessAddress(bd.business_address ?? ''); setCanTravel(bd.can_travel ?? true)
        setTravelRadius(String(bd.travel_radius_km ?? 5))
        const fd = pp.fiscal_data ?? {}
        setVatNumber(fd.vat_number ?? bd.vat_number ?? ''); setCciaaNumber(fd.cciaa_number ?? '')
        setAtecoCode(fd.ateco_code ?? ''); setLegalName(fd.legal_name ?? '')
      }
    })
  }, [])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon, category_type')
      .eq('is_active', true)
      .eq('category_type', 'proximity')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setProximityCategories((data ?? []).map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🏪' })))
      })
  }, [])

  const addSlot = (key:string) => setTimeSlots(prev=>({...prev,[key]:{closed:false,slots:[...(prev[key]?.slots??[]),{from:'09:00',to:'13:00'}]}}))
  const removeSlot = (key:string,idx:number) => setTimeSlots(prev=>({...prev,[key]:{...prev[key],slots:prev[key].slots.filter((_:any,i:number)=>i!==idx)}}))
  const updateSlot = (key:string,idx:number,field:'from'|'to',val:string) => setTimeSlots(prev=>({...prev,[key]:{...prev[key],slots:prev[key].slots.map((s:TimeSlot,i:number)=>i===idx?{...s,[field]:val}:s)}}))
  const toggleClosed = (key:string) => setTimeSlots(prev=>({...prev,[key]:{...(prev[key]??{slots:[]}),closed:!prev[key]?.closed}}))

  const addPriceItem = () => {
    if (!newItem.name||!newItem.price) return
    setPriceList(prev=>[...prev,{id:Date.now().toString(),name:newItem.name!,price:Number(newItem.price),unit:newItem.unit??'intervento',description:newItem.description}])
    setNewItem({unit:'intervento'})
  }

  const handleSave = async () => {
    if (!user) return; setSaving(true)
    await supabase.from('users').update({phone:phone.trim()||null}).eq('id',user.id)
    await supabase.from('profiles_provider').update({
      bio:bio.trim()||null, skills:category?[category]:[],
      operational_radius_km:canTravel?parseInt(travelRadius)||5:0,
      price_list:priceList, time_slots:timeSlots,
      fiscal_data:{vat_number:vatNumber.trim(),cciaa_number:cciaaNumber.trim(),ateco_code:atecoCode.trim(),legal_name:legalName.trim()},
      business_data:{...profile?.business_data,business_name:businessName.trim(),business_address:businessAddress.trim(),can_travel:canTravel,travel_radius_km:parseInt(travelRadius)||5,proximity_category:category},
    }).eq('user_id',user.id)
    setSaving(false); setEditing(false); setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  const catMeta = proximityCategories.find(c=>c.slug===category)
  const kyc = profile?.kyc_status ?? 'not_started'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('profileTitleBusiness')}</h1>
        <div className="flex gap-2">
          {!editing?<button onClick={()=>setEditing(true)} className="btn-outline py-2 px-4">{t('edit')}</button>
            :<><button onClick={()=>setEditing(false)} className="btn-outline py-2 px-4">{t('cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="py-2 px-4 text-white rounded-xl font-semibold flex items-center gap-2" style={{background:'#5B2D8E'}}>
                <Save size={16}/>{saving?t('saving'):t('save')}</button></>}
        </div>
      </div>

      {saved&&<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{t('profileUpdatedSuccess')}</div>}

      {/* Header */}
      <div className="card text-white" style={{background:'linear-gradient(135deg,#5B2D8E,#7C3FC4)',border:'none'}}>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <AvatarUpload
              userId={user?.id}
              authId={user?.auth_id}
              avatarUrl={user?.avatar_url}
              fullName={businessName || user?.full_name}
              color="#2D1750"
              size={64}
              onUploaded={(url) => setUser((u: any) => ({ ...u, avatar_url: url }))}
            />
            {!user?.avatar_url && (
              <span className="absolute -bottom-1 -right-1 text-lg">{catMeta?.icon ?? '🏪'}</span>
            )}
          </div>
          <div>
            <p className="text-xl font-bold">{businessName||user?.full_name}</p>
            {businessAddress&&<p className="text-purple-200 text-sm mt-0.5">📍 {businessAddress}</p>}
            {catMeta&&<span className="inline-block mt-1 text-xs bg-white/20 px-2 py-0.5 rounded-full text-purple-100">{catName(catMeta)}</span>}
          </div>
        </div>
      </div>

      {/* Identità — READ ONLY */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold text-gray-900">{t('bizProfileIdentityTitle')}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#f3f4f6',color:'#9ca3af'}}>{t('bizProfileNotEditable')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{label:t('bizProfileFieldName'),val:user?.full_name},{label:t('profileEmailLabel'),val:user?.email}].map(f=>(
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{f.label}</label>
              <div className="px-4 py-2.5 rounded-xl text-sm text-gray-600 border" style={{background:'#f9fafb',borderColor:'#f3f4f6'}}>{f.val??'—'}</div>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profilePhoneLabel')}</label>
          <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} disabled={!editing}
            style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}} placeholder={t('profilePhonePlaceholder')}/>
        </div>
      </div>

      {/* Tipo attività */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">{t('bizProfileTypeTitle')}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'#f5f3ff',color:'#5B2D8E'}}>{t('bizProfileJobbyList')}</span>
        </div>
        <p className="text-sm text-gray-500">{editing?t('bizProfileSelectCategoryEditing'):t('bizProfileCurrentCategory')}</p>
        <div className="flex flex-wrap gap-2">
          {proximityCategories.map(cat=>{
            const sel = category===cat.slug
            return (
              <button key={cat.slug} type="button" onClick={()=>editing&&setCategory(cat.slug)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                style={sel?SEL_PURPLE:{...UNSEL,cursor:editing?'pointer':'default',opacity:editing||sel?1:0.65}}>
                {cat.icon} {catName(cat)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dati commerciali */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">🏪 {t('bizProfileCommercialDataTitle')}</h2>
        {[
          {label:t('bizProfileBusinessNameLabel'),val:businessName,set:setBusinessName,ph:t('bizProfileBusinessNamePh')},
          {label:t('bizProfileAddressLabel'),val:businessAddress,set:setBusinessAddress,ph:t('profileMainAddressPlaceholder')},
        ].map(f=>(
          <div key={f.label}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input className="input" value={f.val} onChange={e=>f.set(e.target.value)} disabled={!editing}
              style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}} placeholder={f.ph}/>
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('bizProfileDescriptionLabel')}</label>
          <textarea className="input resize-none" rows={3} value={bio} onChange={e=>setBio(e.target.value)}
            disabled={!editing} style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}} placeholder={t('bizProfileDescriptionPh')}/>
        </div>
      </div>

      {/* Dati fiscali */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">📋 {t('bizProfileFiscalDataTitle')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {label:t('bizProfileLegalNameLabel'),val:legalName,set:setLegalName,ph:t('bizProfileLegalNamePh'),full:true},
            {label:t('bizProfileVatLabel'),val:vatNumber,set:setVatNumber,ph:t('bizProfileVatPh')},
            {label:t('bizProfileCciaaLabel'),val:cciaaNumber,set:setCciaaNumber,ph:t('bizProfileCciaaPh')},
            {label:t('bizProfileAtecoLabel'),val:atecoCode,set:setAtecoCode,ph:t('bizProfileAtecoPh')},
          ].map(f=>(
            <div key={f.label} className={f.full?'col-span-2':''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input className="input" value={f.val} onChange={e=>f.set(e.target.value)} disabled={!editing}
                style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}} placeholder={f.ph}/>
            </div>
          ))}
        </div>
      </div>

      {/* Servizio a domicilio */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">🚗 {t('bizProfileHomeServiceTitle')}</h2>
        <div className="flex gap-3">
          {[{val:true,label:`🚗 ${t('bizProfileTravelYes')}`},{val:false,label:`🏪 ${t('bizProfileTravelNo')}`}].map(opt=>(
            <button key={String(opt.val)} type="button" disabled={!editing} onClick={()=>editing&&setCanTravel(opt.val)}
              className="flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
              style={canTravel===opt.val?SEL_PURPLE:{...UNSEL,cursor:editing?'pointer':'not-allowed',opacity:editing?1:0.7}}>
              {opt.label}
            </button>
          ))}
        </div>
        {canTravel&&(
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('bizProfileMaxRadiusLabel')}</label>
            <div className="flex gap-2">
              {RADII.map(r=>(
                <button key={r} type="button" disabled={!editing} onClick={()=>editing&&setTravelRadius(r)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={travelRadius===r?SEL_PURPLE:{...UNSEL,cursor:editing?'pointer':'not-allowed',opacity:editing?1:0.7}}>
                  {r} km
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orari apertura */}
      <div className="card space-y-4">
        <button onClick={()=>setShowHours(!showHours)} className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={18}/>{t('bizProfileOpeningHoursTitle')}</h2>
          <span className="text-sm font-medium" style={{color:'#5B2D8E'}}>{showHours?t('bizProfileCloseToggle'):t('bizProfileManageToggle')}</span>
        </button>
        {showHours&&(
          <div className="space-y-3">
            {DAY_LABEL_KEYS.map((dayKey,i)=>{
              const key=DAY_KEYS[i]; const schedule:DaySchedule=timeSlots[key]??{closed:false,slots:[]}
              return (
                <div key={key} className="p-3 rounded-xl border-2"
                  style={{borderColor:schedule.closed?'#f3f4f6':'#e9d5ff',background:schedule.closed?'#f9fafb':'#faf5ff'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{t(dayKey)}</span>
                    <div className="flex items-center gap-2">
                      {editing&&!schedule.closed&&(
                        <button onClick={()=>addSlot(key)} className="text-xs font-medium flex items-center gap-1" style={{color:'#5B2D8E'}}>
                          <Plus size={12}/>{t('bizProfileAddSlotLabel')}
                        </button>
                      )}
                      {editing&&(
                        <button onClick={()=>toggleClosed(key)}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={schedule.closed?{background:'#d1fae5',color:'#065f46'}:{background:'#fee2e2',color:'#991b1b'}}>
                          {schedule.closed?t('bizProfileOpenBadge'):t('bizProfileClosedBadge')}
                        </button>
                      )}
                      {!editing&&(
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={schedule.closed?{background:'#f3f4f6',color:'#6b7280'}:{background:'#d1fae5',color:'#065f46'}}>
                          {schedule.closed?t('bizProfileClosedBadge'):t('bizProfileOpenBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!schedule.closed&&(
                    schedule.slots.length===0
                      ?<p className="text-xs text-gray-400 italic">{t('bizProfileNoSlotsDefined')}</p>
                      :schedule.slots.map((slot:TimeSlot,idx:number)=>(
                        <div key={idx} className="flex items-center gap-2 mb-1.5">
                          <input type="time" value={slot.from} disabled={!editing} onChange={e=>updateSlot(key,idx,'from',e.target.value)} className="input py-1.5 text-sm" style={{width:'7rem'}}/>
                          <span className="text-gray-400">→</span>
                          <input type="time" value={slot.to} disabled={!editing} onChange={e=>updateSlot(key,idx,'to',e.target.value)} className="input py-1.5 text-sm" style={{width:'7rem'}}/>
                          {editing&&<button onClick={()=>removeSlot(key,idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>}
                        </div>
                      ))
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Listino prezzi */}
      <div className="card space-y-4">
        <button onClick={()=>setShowPriceList(!showPriceList)} className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-gray-900">💰 {t('priceListLabel')}</h2>
          <span className="text-sm font-medium" style={{color:'#5B2D8E'}}>{showPriceList?t('bizProfileCloseToggle'):`${priceList.length} ${t('bizProfileEntriesSuffix')} ▼`}</span>
        </button>
        {showPriceList&&(
          <>
            {priceList.length===0?<p className="text-sm text-gray-400 italic text-center py-4">{t('bizProfileNoEntriesYet')}</p>:(
              <div className="space-y-2">
                {priceList.map(item=>(
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{background:'#faf5ff',borderColor:'#e9d5ff'}}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                      {item.description&&<p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold" style={{color:'#1D9E75'}}>€{item.price}</span>
                        <span className="text-xs text-gray-400">/ {UNIT_LABEL_KEYS[item.unit] ? t(UNIT_LABEL_KEYS[item.unit]) : item.unit}</span>
                      </div>
                    </div>
                    {editing&&<button onClick={()=>setPriceList(p=>p.filter(x=>x.id!==item.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}
                  </div>
                ))}
              </div>
            )}
            {editing&&(
              <div className="rounded-xl p-4 space-y-3 border-2 border-dashed" style={{borderColor:'#d8b4fe'}}>
                <p className="text-sm font-semibold" style={{color:'#5B2D8E'}}>➕ {t('bizProfileNewEntryLabel')}</p>
                <input className="input" value={newItem.name??''} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} placeholder={t('bizProfileItemNamePh')}/>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('bizProfilePriceEuroLabel')}</label>
                    <input type="number" className="input" value={newItem.price??''} onChange={e=>setNewItem(p=>({...p,price:Number(e.target.value)}))} placeholder="5.00"/></div>
                  <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('bizProfileUnitLabel')}</label>
                    <select className="input" value={newItem.unit??'intervento'} onChange={e=>setNewItem(p=>({...p,unit:e.target.value}))}>
                      {UNITS.map(u=><option key={u} value={u}>{t(UNIT_LABEL_KEYS[u])}</option>)}</select></div>
                </div>
                <input className="input" value={newItem.description??''} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))} placeholder={t('bizProfileItemNotesPh')}/>
                <button onClick={addPriceItem} disabled={!newItem.name||!newItem.price} className="w-full py-2.5 text-white font-semibold rounded-xl disabled:opacity-40" style={{background:'#5B2D8E'}}>
                  ➕ {t('bizProfileAddToPriceListLabel')}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lingua */}
      <LanguageSelector userId={user?.id} accentColor="#5B2D8E" />

      {/* Ruoli JOBBY */}
      {user && (
        <RoleSection
          currentRole={user.role ?? 'provider'}
          userId={user.id}
          isProximity={true}
        />
      )}

      {/* KYC */}
      <div className="card border-2" style={{borderColor:kyc==='approved'?'#bbf7d0':'#fde68a'}}>
        <h2 className="font-semibold text-gray-900 mb-3">🪪 {t('bizProfileKycTitle')}</h2>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{background:kyc==='approved'?'#f0fdf4':'#fffbeb'}}>
          <span className="text-2xl">{kyc==='approved'?'✅':kyc==='pending'?'⏳':'⚠️'}</span>
          <div>
            <p className="font-semibold" style={{color:kyc==='approved'?'#166534':'#92400e'}}>
              {kyc==='approved'?t('bizProfileKycApproved'):kyc==='pending'?t('bizProfileKycPending'):t('bizProfileKycNotStarted')}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{kyc==='approved'?t('bizProfileKycApprovedDesc'):t('bizProfileKycOtherDesc')}</p>
          </div>
        </div>
        {kyc!=='approved'&&<button className="mt-3 w-full py-3 text-white font-semibold rounded-xl" style={{background:'#5B2D8E'}}>🪪 {t('bizProfileKycStartButton')}</button>}
      </div>
    </div>
  )
}
