'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Plus, X, Clock, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import RoleSection from '@/components/ui/RoleSection'
import AvatarUpload from '@/components/ui/AvatarUpload'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { useLanguage } from '@/lib/i18n'

// Categorie PROVIDER — caricate dinamicamente da /api/categories
// (fonte unica: tabella `service_categories`, gestita da JOBBY Admin/Retool).
interface ProviderCategory { slug: string; name_it: string; name_en?: string; icon: string }

const DAYS = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const RADII = ['5','10','20','30','50']
const UNITS = ['ora','intervento','pezzo','mq','km','giorno']

interface PriceItem { id:string; name:string; price:number; unit:string; duration?:string; description?:string }
interface TimeSlot { from:string; to:string }
interface DaySchedule { closed:boolean; slots:TimeSlot[] }

const SEL_BLUE = { background:'#1A73E8', color:'#fff', borderColor:'#1A73E8', boxShadow:'0 4px 12px rgba(26,115,232,0.3)' }
const SEL_GREEN = { background:'#1D9E75', color:'#fff', borderColor:'#1D9E75', boxShadow:'0 4px 12px rgba(29,158,117,0.3)' }
const UNSEL = { background:'#fff', color:'#6b7280', borderColor:'#e5e7eb' }

export default function ProviderProfile() {
  const { t, lang } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [radius, setRadius] = useState('10')
  const [availStatus, setAvailStatus] = useState('offline')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [extraSkills, setExtraSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<Record<string,DaySchedule>>({})
  const [showHours, setShowHours] = useState(false)
  const [priceList, setPriceList] = useState<PriceItem[]>([])
  const [showPriceList, setShowPriceList] = useState(false)
  const [newItem, setNewItem] = useState<Partial<PriceItem>>({ unit:'ora' })
  const [providerCategories, setProviderCategories] = useState<ProviderCategory[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      const { data: pp } = await supabase.from('profiles_provider').select('*').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(pp)
      setPhone(u?.phone ?? '')
      if (pp) {
        setBio(pp.bio ?? ''); setHourlyRate(pp.hourly_rate ? String(pp.hourly_rate) : '')
        setRadius(String(pp.operational_radius_km ?? 10)); setAvailStatus(pp.availability_status ?? 'offline')
        setSelectedCats(pp.skills ?? []); setExtraSkills(pp.extra_skills ?? [])
        setActiveDays(pp.payout_details?.active_days ?? [])
        setPriceList(pp.price_list ?? []); setTimeSlots(pp.time_slots ?? {})
      }
    })
  }, [])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('slug, name_it, name_en, icon, category_type')
      .eq('is_active', true)
      .eq('category_type', 'standard')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setProviderCategories((data ?? []).map((c: any) => ({ slug: c.slug, name_it: c.name_it, name_en: c.name_en, icon: c.icon ?? '🛠️' })))
      })
  }, [])

  const toggleAvailability = async () => {
    const next = availStatus === 'online' ? 'offline' : 'online'
    setAvailStatus(next)
    if (user) await supabase.from('profiles_provider').update({ availability_status: next }).eq('user_id', user.id)
  }

  const toggleCat = (slug:string) => editing && setSelectedCats(prev => prev.includes(slug) ? prev.filter(s=>s!==slug) : [...prev,slug])
  const toggleDay = (day:string) => editing && setActiveDays(prev => prev.includes(day) ? prev.filter(d=>d!==day) : [...prev,day])

  const addSlot = (key:string) => setTimeSlots(prev => ({...prev,[key]:{closed:false,slots:[...(prev[key]?.slots??[]),{from:'09:00',to:'18:00'}]}}))
  const removeSlot = (key:string,idx:number) => setTimeSlots(prev => ({...prev,[key]:{...prev[key],slots:prev[key].slots.filter((_:any,i:number)=>i!==idx)}}))
  const updateSlot = (key:string,idx:number,field:'from'|'to',val:string) => setTimeSlots(prev => ({...prev,[key]:{...prev[key],slots:prev[key].slots.map((s:TimeSlot,i:number)=>i===idx?{...s,[field]:val}:s)}}))

  const addPriceItem = () => {
    if (!newItem.name||!newItem.price) return
    setPriceList(prev=>[...prev,{id:Date.now().toString(),name:newItem.name!,price:Number(newItem.price),unit:newItem.unit??'ora',duration:newItem.duration,description:newItem.description}])
    setNewItem({unit:'ora'})
  }

  const handleSave = async () => {
    if (!user) return; setSaving(true)
    await supabase.from('users').update({phone:phone.trim()||null}).eq('id',user.id)
    await supabase.from('profiles_provider').update({
      bio:bio.trim()||null, hourly_rate:parseFloat(hourlyRate)||null,
      operational_radius_km:parseInt(radius)||10, skills:selectedCats,
      extra_skills:extraSkills, price_list:priceList, time_slots:timeSlots,
      payout_details:{...profile?.payout_details,active_days:activeDays},
    }).eq('user_id',user.id)
    setSaving(false); setEditing(false); setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  const kyc = profile?.kyc_status ?? 'not_started'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('profileTitleProvider')}</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={toggleAvailability} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
            style={availStatus==='online'?{background:'#f0fdf4',color:'#166534',borderColor:'#86efac'}:{background:'#f9fafb',color:'#6b7280',borderColor:'#e5e7eb'}}>
            {availStatus==='online'?<><ToggleRight size={18}/>{t('statusOnline')}</>:<><ToggleLeft size={18}/>{t('statusOffline')}</>}
          </button>
          {!editing ? <button onClick={()=>setEditing(true)} className="btn-outline py-2 px-4">{t('edit')}</button>
            : <><button onClick={()=>setEditing(false)} className="btn-outline py-2 px-4">{t('cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="py-2 px-4 text-white rounded-xl font-semibold flex items-center gap-2" style={{background:'#1A73E8'}}>
                <Save size={16}/>{saving?t('saving'):t('save')}</button></>}
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">✅ {t('profileUpdatedSuccess')}</div>}

      {/* Identità — READ ONLY */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold text-gray-900">👤 {t('providerProfileIdentityHeading')}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#f3f4f6',color:'#9ca3af'}}>{t('providerProfileNotEditable')}</span>
        </div>
        <div className="flex justify-center sm:justify-start mb-1">
          <AvatarUpload
            userId={user?.id}
            authId={user?.auth_id}
            avatarUrl={user?.avatar_url}
            fullName={user?.full_name}
            color="#1A73E8"
            size={72}
            onUploaded={(url) => setUser((u: any) => ({ ...u, avatar_url: url }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{label:t('profileFullNameLabel'),val:user?.full_name},{label:t('profileEmailLabel'),val:user?.email}].map(f=>(
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{val:profile?.completed_missions??0,label:t('providerProfileStatMissions'),color:'#1A73E8'},
          {val:profile?.avg_rating?Number(profile.avg_rating).toFixed(1):'—',label:`⭐ ${t('statRatingLabel')}`,color:'#F59E0B'},
          {val:profile?.trust_score??0,label:`🛡️ ${t('providerTrustPrefix')}`,color:'#1D9E75'}].map(s=>(
          <div key={s.label} className="card text-center p-4">
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900">📝 {t('providerProfileBioHeading')}</h2>
        <textarea className="input resize-none" rows={4} value={bio} onChange={e=>setBio(e.target.value)}
          disabled={!editing} style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}}
          placeholder={t('providerProfileBioPlaceholder')}/>
        {editing&&<p className="text-xs text-gray-400 text-right">{bio.length}/500</p>}
      </div>

      {/* Categorie JOBBY */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">🎯 {t('providerProfileCategoriesHeading')}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'#eff6ff',color:'#1A73E8'}}>{t('providerProfileJobbyListBadge')}</span>
        </div>
        <p className="text-sm text-gray-500">{editing?t('providerProfileCategoriesEditingHint'):t('providerProfileCategoriesViewHint')}</p>
        <div className="flex flex-wrap gap-2">
          {providerCategories.map(cat=>{
            const sel = selectedCats.includes(cat.slug)
            return (
              <button key={cat.slug} type="button" onClick={()=>toggleCat(cat.slug)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                style={sel?SEL_BLUE:{...UNSEL,cursor:editing?'pointer':'default',opacity:editing||sel?1:0.75}}>
                {cat.icon} {lang === 'it' ? cat.name_it : (cat.name_en || cat.name_it)}
              </button>
            )
          })}
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('providerProfileExtraSkillsHeading')}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {extraSkills.map(s=>(
              <span key={s} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{background:'#faf5ff',color:'#6d28d9',borderColor:'#e9d5ff'}}>
                {s}{editing&&<button onClick={()=>setExtraSkills(prev=>prev.filter(x=>x!==s))}><X size={12}/></button>}
              </span>
            ))}
            {extraSkills.length===0&&!editing&&<p className="text-sm text-gray-400 italic">{t('providerProfileNoExtraSkills')}</p>}
          </div>
          {editing&&(
            <div className="flex gap-2">
              <input className="input flex-1" value={newSkill} onChange={e=>setNewSkill(e.target.value)}
                placeholder={t('providerProfileExtraSkillPlaceholder')}
                onKeyDown={e=>{if(e.key==='Enter'&&newSkill.trim()){setExtraSkills(p=>[...p,newSkill.trim()]);setNewSkill('')}}}/>
              <button onClick={()=>{if(newSkill.trim()){setExtraSkills(p=>[...p,newSkill.trim()]);setNewSkill('')}}}
                className="px-4 py-2 text-white rounded-xl" style={{background:'#1A73E8'}}><Plus size={18}/></button>
            </div>
          )}
        </div>
      </div>

      {/* Tariffe e raggio */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">💶 {t('providerProfileRateRadiusHeading')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('providerProfileHourlyRateLabel')}</label>
          <input type="number" className="input" value={hourlyRate} onChange={e=>setHourlyRate(e.target.value)}
            disabled={!editing} style={!editing?{background:'#f9fafb',color:'#9ca3af'}:{}} placeholder={t('providerProfileHourlyRatePlaceholder')}/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('providerProfileRadiusLabel')}</label>
          <div className="flex gap-2 flex-wrap">
            {RADII.map(r=>(
              <button key={r} type="button" onClick={()=>editing&&setRadius(r)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                style={radius===r?SEL_BLUE:{...UNSEL,cursor:editing?'pointer':'not-allowed',opacity:editing?1:0.7}}>
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disponibilità */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">📅 {t('providerProfileAvailableDaysHeading')}</h2>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(day=>(
            <button key={day} type="button" onClick={()=>toggleDay(day)}
              className="w-13 h-13 rounded-xl text-sm font-bold border-2 transition-all"
              style={{width:'3rem',height:'3rem',...(activeDays.includes(day)?SEL_GREEN:{...UNSEL,cursor:editing?'pointer':'not-allowed',opacity:editing?1:0.7})}}>
              {day}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowHours(!showHours)} className="flex items-center gap-2 text-sm font-medium" style={{color:'#1A73E8'}}>
          <Clock size={16}/>{showHours?`${t('providerProfileHideVerb')} ${t('providerProfileHoursLabel')} ▲`:`${t('providerHomeManage')} ${t('providerProfileHoursLabel')} ▼`}
        </button>
        {showHours&&(
          <div className="space-y-3">
            {DAYS.map((day,i)=>{
              const key=DAY_KEYS[i]; const schedule:DaySchedule=timeSlots[key]??{closed:false,slots:[]}; const isActive=activeDays.includes(day)
              return (
                <div key={key} className="p-3 rounded-xl border-2"
                  style={{borderColor:isActive?'#bfdbfe':'#f3f4f6',background:isActive?'#eff6ff':'#f9fafb',opacity:isActive?1:0.5}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{day}</span>
                    {editing&&isActive&&(
                      <button onClick={()=>addSlot(key)} className="text-xs font-medium flex items-center gap-1" style={{color:'#1A73E8'}}>
                        <Plus size={12}/>{t('providerProfileAddSlotLabel')}
                      </button>
                    )}
                  </div>
                  {schedule.slots.length===0
                    ?<p className="text-xs text-gray-400 italic">{isActive?t('providerProfileNoSlotsYet'):t('providerProfileDayUnavailable')}</p>
                    :schedule.slots.map((slot:TimeSlot,idx:number)=>(
                      <div key={idx} className="flex items-center gap-2 mb-1.5">
                        <input type="time" value={slot.from} disabled={!editing} onChange={e=>updateSlot(key,idx,'from',e.target.value)} className="input py-1.5 text-sm" style={{width:'7rem'}}/>
                        <span className="text-gray-400">→</span>
                        <input type="time" value={slot.to} disabled={!editing} onChange={e=>updateSlot(key,idx,'to',e.target.value)} className="input py-1.5 text-sm" style={{width:'7rem'}}/>
                        {editing&&<button onClick={()=>removeSlot(key,idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>}
                      </div>
                    ))}
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
          <span className="text-sm font-medium" style={{color:'#1A73E8'}}>{showPriceList?`${t('close')} ▲`:`${priceList.length} ${t('providerProfileEntriesSuffix')} ▼`}</span>
        </button>
        {showPriceList&&(
          <>
            {priceList.length===0?<p className="text-sm text-gray-400 italic text-center py-4">{t('providerProfileNoPriceItems')}</p>:(
              <div className="space-y-2">
                {priceList.map(item=>(
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{background:'#f9fafb',borderColor:'#e5e7eb'}}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                      {item.description&&<p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold" style={{color:'#1D9E75'}}>€{item.price}</span>
                        <span className="text-xs text-gray-400">/ {item.unit}</span>
                        {item.duration&&<span className="text-xs text-gray-400">· {item.duration}</span>}
                      </div>
                    </div>
                    {editing&&<button onClick={()=>setPriceList(p=>p.filter(x=>x.id!==item.id))} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={16}/></button>}
                  </div>
                ))}
              </div>
            )}
            {editing&&(
              <div className="rounded-xl p-4 space-y-3 border-2 border-dashed" style={{borderColor:'#bfdbfe'}}>
                <p className="text-sm font-semibold" style={{color:'#1A73E8'}}>➕ {t('providerProfileNewItem')}</p>
                <input className="input" value={newItem.name??''} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} placeholder={t('providerProfileServiceNamePlaceholder')}/>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('providerProfilePriceLabel')}</label>
                    <input type="number" className="input" value={newItem.price??''} onChange={e=>setNewItem(p=>({...p,price:Number(e.target.value)}))} placeholder="50"/></div>
                  <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('providerProfileUnitLabel')}</label>
                    <select className="input" value={newItem.unit??'ora'} onChange={e=>setNewItem(p=>({...p,unit:e.target.value}))}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                  <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('providerProfileDurationLabel')}</label>
                    <input className="input" value={newItem.duration??''} onChange={e=>setNewItem(p=>({...p,duration:e.target.value}))} placeholder="2h"/></div>
                </div>
                <input className="input" value={newItem.description??''} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))} placeholder={t('providerProfileOptionalNotesPlaceholder')}/>
                <button onClick={addPriceItem} disabled={!newItem.name||!newItem.price} className="w-full py-2.5 text-white font-semibold rounded-xl disabled:opacity-40" style={{background:'#1A73E8'}}>
                  ➕ {t('providerProfileAddToPriceList')}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lingua */}
      <LanguageSelector userId={user?.id} accentColor="#1A73E8" />

      {/* Ruoli JOBBY */}
      {user && (
        <RoleSection
          currentRole={user.role ?? 'provider'}
          userId={user.id}
          isProximity={false}
        />
      )}

      {/* KYC */}
      <div className="card border-2" style={{borderColor:kyc==='approved'?'#bbf7d0':'#fde68a'}}>
        <h2 className="font-semibold text-gray-900 mb-3">🪪 {t('providerProfileKycHeading')}</h2>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{background:kyc==='approved'?'#f0fdf4':'#fffbeb'}}>
          <span className="text-2xl">{kyc==='approved'?'✅':kyc==='pending'?'⏳':'⚠️'}</span>
          <div>
            <p className="font-semibold" style={{color:kyc==='approved'?'#166534':'#92400e'}}>
              {kyc==='approved'?t('providerProfileKycApproved'):kyc==='pending'?t('providerProfileKycPending'):t('providerProfileKycNotVerified')}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{kyc==='approved'?t('providerProfileKycApprovedDesc'):t('providerProfileKycIncompleteDesc')}</p>
          </div>
        </div>
        {kyc!=='approved'&&<button className="mt-3 w-full py-3 text-white font-semibold rounded-xl" style={{background:'#1A73E8'}}>🪪 {t('providerProfileStartKyc')}</button>}
      </div>
    </div>
  )
}
