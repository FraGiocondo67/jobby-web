import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok, apiError } from '@/lib/api'

// GET /api/proximity?category=laundry — lista esercizi per categoria
export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  if (!category) throw apiError('Parametro category obbligatorio')

  const admin = getAdmin()
  const { data, error } = await admin.from('profiles_provider')
    .select(`
      user_id, bio, skills, avg_rating, trust_score, operational_radius_km,
      business_data,
      user:users!profiles_provider_user_id_fkey(id, full_name, phone)
    `)
    .eq('is_proximity_business', true)
    .contains('skills', [category])
    .eq('kyc_status', 'approved')
    .limit(30)

  if (error) throw apiError('Errore DB', 500, error.message)

  return ok({
    businesses: data ?? [],
    count: data?.length ?? 0,
    category,
  })
})
