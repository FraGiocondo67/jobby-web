'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Shield, Star, AlertCircle } from 'lucide-react'
import RoleSection from '@/components/ui/RoleSection'
import AvatarUpload from '@/components/ui/AvatarUpload'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { useLanguage } from '@/lib/i18n'

export default function ClientProfile() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Campi editabili
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState('10')

  // Email change
  const [emailChanged, setEmailChanged] = useState(false)
  const [emailNote, setEmailNote] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      const { data: cp } = await supabase.from('profiles_client').select('*').eq('user_id', u?.id).maybeSingle()
      setUser(u); setProfile(cp)
      setFullName(u?.full_name ?? '')
      setEmail(u?.email ?? '')
      setPhone(u?.phone ?? '')
      setAddress(cp?.address ?? '')
      setRadius(String(cp?.search_radius_km ?? 10))
    })
  }, [])

  const handleSave = async () => {
    if (!user) return
    if (!fullName.trim()) { setError(t('profileNameEmptyError')); return }
    setSaving(true); setError(''); setEmailNote('')

    try {
      // Aggiorna nome e telefono su public.users
      await supabase.from('users').update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      }).eq('id', user.id)

      // Aggiorna email su auth se cambiata
      if (email.trim() !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() })
        if (emailErr) throw new Error(t('profileEmailUpdateErrorPrefix') + emailErr.message)
        setEmailChanged(true)
        setEmailNote(t('profileEmailConfirmSent'))
        // Aggiorna anche su public.users (sarà confermata dopo verifica)
        await supabase.from('users').update({ email: email.trim() }).eq('id', user.id)
      }

      // Aggiorna profilo cliente
      await supabase.from('profiles_client').update({
        address: address.trim() || null,
        search_radius_km: parseInt(radius) || 10,
      }).eq('user_id', user.id)

      setSaving(false); setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const RADII = ['2','5','10','20','50']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('profileTitleClient')}</h1>
        <div className="flex gap-2">
          {!editing
            ? <button onClick={() => { setEditing(true); setError(''); setEmailNote('') }}
                className="btn-outline py-2 px-4">{t('edit')}</button>
            : <>
                <button onClick={() => { setEditing(false); setError('') }} className="btn-outline py-2 px-4">{t('cancel')}</button>
                <button onClick={handleSave} disabled={saving}
                  className="py-2 px-4 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                  style={{background:'#E25C45'}}>
                  <Save size={16}/>{saving ? t('saving') : t('save')}
                </button>
              </>}
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm space-y-1">
          <p>✅ {t('profileUpdatedSuccess')}</p>
          {emailNote && <p className="text-blue-600">📧 {emailNote}</p>}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5"/> {error}
        </div>
      )}

      {/* Avatar e stats */}
      <div className="card flex items-center gap-4">
        <AvatarUpload
          userId={user?.id}
          authId={user?.auth_id}
          avatarUrl={user?.avatar_url}
          fullName={fullName}
          color="#E25C45"
          size={64}
          onUploaded={(url) => setUser((u: any) => ({ ...u, avatar_url: url }))}
        />
        <div className="flex-1">
          <p className="text-xl font-bold text-gray-900">{fullName || '—'}</p>
          <p className="text-gray-500 text-sm">{email}</p>
          <div className="flex items-center gap-4 mt-2">
            {profile?.trust_score != null && (
              <div className="flex items-center gap-1 text-sm" style={{color:'#1A73E8'}}>
                <Shield size={14}/><span className="font-semibold">{Number(profile.trust_score).toFixed(0)}</span>
                <span className="text-gray-400">{t('trustScoreLabel')}</span>
              </div>
            )}
            {profile?.avg_rating != null && (
              <div className="flex items-center gap-1 text-sm">
                <Star size={14} className="fill-yellow-400 text-yellow-400"/>
                <span className="font-semibold">{Number(profile.avg_rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dati personali */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">📋 {t('profilePersonalDataHeading')}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profileFullNameLabel')}</label>
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)}
            disabled={!editing} style={!editing ? {background:'#f9fafb',color:'#6b7280'} : {}}
            placeholder={t('profileFullNamePlaceholder')}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profileEmailLabel')}
            {editing && <span className="text-xs text-amber-600 ml-2">⚠️ {t('profileEmailConfirmWarning')}</span>}
          </label>
          <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)}
            disabled={!editing} style={!editing ? {background:'#f9fafb',color:'#6b7280'} : {}}
            placeholder={t('profileEmailPlaceholder')}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profilePhoneLabel')}</label>
          <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)}
            disabled={!editing} style={!editing ? {background:'#f9fafb',color:'#6b7280'} : {}}
            placeholder={t('profilePhonePlaceholder')}/>
        </div>
      </div>

      {/* Area e raggio */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">📍 {t('profileSearchAreaHeading')}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profileMainAddressLabel')}</label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)}
            disabled={!editing} style={!editing ? {background:'#f9fafb',color:'#6b7280'} : {}}
            placeholder={t('profileMainAddressPlaceholder')}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('profileSearchRadiusLabel')}</label>
          <div className="flex gap-2 flex-wrap">
            {RADII.map(r => (
              <button key={r} type="button" disabled={!editing}
                onClick={() => editing && setRadius(r)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                style={radius === r
                  ? {background:'#E25C45', color:'#fff', borderColor:'#E25C45', boxShadow:'0 4px 12px rgba(226,92,69,0.3)'}
                  : {background:'#fff', color:'#6b7280', borderColor:'#e5e7eb', cursor: editing ? 'pointer' : 'not-allowed', opacity: editing ? 1 : 0.7}}>
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lingua */}
      <LanguageSelector userId={user?.id} accentColor="#E25C45" />

      {/* Ruoli JOBBY */}
      {user && (
        <RoleSection
          currentRole={user.role ?? 'client'}
          userId={user.id}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent">{profile?.total_missions ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">{t('profileServicesReceivedLabel')}</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{color:'#1D9E75'}}>€{Number(profile?.total_spent ?? 0).toFixed(0)}</p>
          <p className="text-sm text-gray-500 mt-1">{t('profileTotalSpentLabel')}</p>
        </div>
      </div>
    </div>
  )
}
