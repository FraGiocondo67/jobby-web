import { NextRequest } from 'next/server'
import { handler, getAdmin, ok, apiError } from '@/lib/api'

// GET /api/providers/[id] — profilo pubblico fornitore
export const GET = handler(async (req, ctx) => {
  const admin = getAdmin()
  const { data, error } = await admin.from('profiles_provider')
    .select(`
      user_id, bio, skills, hourly_rate, operational_radius_km,
      avg_rating, trust_score, completed_missions, availability_status,
      is_proximity_business, business_data,
      user:users!profiles_provider_user_id_fkey(id, full_name)
    `)
    .eq('user_id', ctx!.params.id)
    .single()

  if (error || !data) throw apiError('Fornitore non trovato', 404)

  // Carica ultime recensioni
  const { data: reviews } = await admin.from('reviews')
    .select('rating, comment, created_at, reviewer:users!reviews_reviewer_id_fkey(full_name)')
    .eq('reviewed_id', ctx!.params.id)
    .eq('reviewer_type', 'client')
    .order('created_at', { ascending: false })
    .limit(5)

  return ok({ provider: data, reviews: reviews ?? [] })
})
