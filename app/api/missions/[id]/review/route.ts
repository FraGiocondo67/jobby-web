import { NextRequest } from 'next/server'
import { authHandler, getAdmin, getMission, parseBody, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/review
// Body: { rating: 1-5, comment?: string, reviewer_type: 'client' | 'provider' }
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  const body = await parseBody(req)
  const rating = body.rating as number
  const comment = body.comment as string | undefined
  const reviewerType = body.reviewer_type as 'client' | 'provider'

  if (!rating || rating < 1 || rating > 5)
    throw apiError('Rating non valido: deve essere tra 1 e 5')
  if (!['client', 'provider'].includes(reviewerType))
    throw apiError('reviewer_type deve essere client o provider')

  // Verifica che chi recensisce sia la persona giusta
  if (reviewerType === 'client' && mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può lasciare questa recensione', 403)
  if (reviewerType === 'provider' && mission.provider_id !== auth.userId)
    throw apiError('Solo il fornitore può lasciare questa recensione', 403)

  if (!['completed', 'reviewed'].includes(mission.status))
    throw apiError('La missione deve essere completata per lasciare una recensione')
  if (mission.payment_outside_platform)
    throw apiError('Le recensioni non sono disponibili per pagamenti esterni')

  const reviewedId = reviewerType === 'client' ? mission.provider_id : mission.client_id
  if (!reviewedId) throw apiError('Destinatario recensione non trovato')

  const admin = getAdmin()

  // Verifica che non esista già una recensione dello stesso tipo
  const { data: existing } = await admin.from('reviews')
    .select('id').eq('mission_id', ctx!.params.id)
    .eq('reviewer_id', auth.userId).maybeSingle()
  if (existing) throw apiError('Hai già lasciato una recensione per questa missione')

  await admin.from('reviews').insert({
    mission_id: ctx!.params.id,
    reviewer_id: auth.userId,
    reviewed_id: reviewedId,
    rating, comment: comment?.trim() ?? null,
    reviewer_type: reviewerType,
  })

  await admin.from('missions').update({ status: 'reviewed' }).eq('id', ctx!.params.id)

  await notify(
    reviewedId, 'new_review',
    '⭐ Nuova recensione!',
    `Hai ricevuto ${rating} stelle per: ${mission.title}`,
    { mission_id: ctx!.params.id, rating }
  )

  return ok({ message: 'Recensione inviata', rating })
})
