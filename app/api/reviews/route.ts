import { NextRequest } from 'next/server'
import { authHandler, handler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

// GET /api/reviews?user_id=X — recensioni pubbliche per un utente
export const GET = handler(async (req) => {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const reviewerType = searchParams.get('reviewer_type') // client | provider
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  if (!userId) throw apiError('user_id obbligatorio')

  const admin = getAdmin()
  let query = admin.from('reviews')
    .select(`
      id, rating, comment, created_at, reviewer_type,
      reviewer:users!reviews_reviewer_id_fkey(full_name),
      mission:missions!reviews_mission_id_fkey(title)
    `)
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (reviewerType) query = query.eq('reviewer_type', reviewerType)

  const { data, error } = await query
  if (error) throw apiError('Errore caricamento recensioni', 500, error.message)

  // Calcola media
  const reviews = data ?? []
  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  return ok({ reviews, avg_rating: avg ? Math.round(avg * 10) / 10 : null, count: reviews.length })
})
