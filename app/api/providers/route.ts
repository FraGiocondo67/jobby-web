import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok } from '@/lib/api'

// GET /api/providers — cerca fornitori
// Query params: category, proximity, lat, lng, radius_km, limit
export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const isProximity = searchParams.get('proximity') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const admin = getAdmin()
  let query = admin.from('profiles_provider')
    .select(`
      user_id, bio, skills, hourly_rate, operational_radius_km,
      avg_rating, trust_score, availability_status,
      is_proximity_business, business_data,
      user:users!profiles_provider_user_id_fkey(id, full_name, phone)
    `)
    .neq('kyc_status', 'rejected')
    .neq('user_id', auth.userId) // Esclude se stesso
    .limit(limit)

  if (!isProximity) query = query.eq('availability_status', 'online')
  if (isProximity) query = query.eq('is_proximity_business', true)
  else query = query.eq('is_proximity_business', false)

  if (category) query = query.contains('skills', [category])

  const { data, error } = await query
  if (error) throw error

  return ok({ providers: data ?? [], count: data?.length ?? 0 })
})
