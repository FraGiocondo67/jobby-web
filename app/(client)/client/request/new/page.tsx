'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, apiCall } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { ArrowLeft, Calendar, MapPin, Euro } from 'lucide-react'

interface CategoryQuestion { id: string; text: string; type?: string; options: string[] }
interface Category {
  id: string; slug: string; name_it: string; name_en: string; icon: string | null
  category_type: string; requires_kyc: boolean; questions: CategoryQuestion[]
}

// Fallback se l'utente nega/non fornisce la geolocalizzazione browser (stesso default usato in client/map)
const DEFAULT_CENTER = { lat: 45.6667, lng: 12.2417 }

function NewRequestContent() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category') ?? 'housekeeping'

  const [categories, setCategories] = useState<Category[] | null>(null)
  const cat = categories?.find(c => c.slug === categorySlug)
  const catDisplayName = cat ? (lang === 'it' ? cat.name_it : (cat.name_en || cat.name_it)) : ''

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [address, setAddress] = useState('')
  const [budget, setBudget] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      setUser(u)
    })
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null)
      )
    }
  }, [])

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('id, slug, name_it, name_en, icon, category_type, requires_kyc, questions')
      .eq('is_active', true)
      .order('category_type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name_en', { ascending: true })
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cat) { setError(t('categoryNotFoundError')); return }
    if (!address.trim()) { setError(t('addressRequiredError')); return }
    if (!budget) { setError(t('requestNewBudgetRequiredError')); return }
    if (!dateStr) { setError(t('requestNewDateRequiredError')); return }
    setLoading(true); setError('')
    try {
      const briefSummary = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join(', ')
      const title = `${catDisplayName || categorySlug} — richiesta`
      const coords = userCoords ?? DEFAULT_CENTER
      const result = await apiCall('/missions/create', 'POST', {
        category_id: cat.id,
        title,
        description: [briefSummary, notes].filter(Boolean).join('\n'),
        address: address.trim(),
        price_agreed: parseFloat(budget),
        scheduled_at: new Date(dateStr).toISOString(),
        duration_hours: 2,
        latitude: coords.lat,
        longitude: coords.lng,
      })
      router.push('/client/missions')
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  if (categories === null) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>
  }
  if (!cat) return <div className="card text-center py-12"><p className="text-gray-500">{t('categoryNotFoundError')}</p></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cat.icon} {catDisplayName}</h1>
          <p className="text-gray-500 text-sm">{t('requestNewSubtitle')}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Domande brief */}
        {cat.questions.map(q => (
          <div key={q.id} className="card">
            <p className="font-medium text-gray-900 mb-3">{q.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt: string) => (
                <button key={opt} type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.text]: opt }))}
                  className={`p-3 rounded-xl text-sm text-left border-2 transition-colors
                    ${answers[q.text] === opt ? 'border-accent bg-orange-50 text-accent font-medium' : 'border-gray-100 hover:border-gray-300'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Dettagli */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">📋 {t('requestNewDetailsHeading')}</h2>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MapPin size={14} /> {t('addressLabel')}
            </label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)}
              placeholder={t('addressPlaceholder')} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar size={14} /> {t('dateTimeLabel')}
            </label>
            <input type="datetime-local" className="input" value={dateStr} onChange={e => setDateStr(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Euro size={14} /> {t('requestNewBudgetLabel')}
            </label>
            <input type="number" className="input" value={budget} onChange={e => setBudget(e.target.value)}
              placeholder={t('requestNewBudgetPlaceholder')} min="1" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('providerNotesLabel')}</label>
            <textarea className="input resize-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t('requestNewNotesPlaceholder')} />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-4 text-base" disabled={loading}>
          {loading ? t('requestNewPublishing') : `🚀 ${t('requestNewPublishButton')}`}
        </button>
      </form>
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
      <NewRequestContent />
    </Suspense>
  )
}
