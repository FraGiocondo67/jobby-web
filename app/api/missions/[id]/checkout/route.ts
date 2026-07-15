import { NextRequest } from 'next/server'
import { authHandler, getAdmin, getMission, parseBody, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/checkout
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.provider_id !== auth.userId)
    throw apiError('Non autorizzato', 403)
  if (mission.status !== 'in_progress')
    throw apiError('La missione non è in corso')

  const body = await parseBody(req)
  const paymentOutside = body.payment_outside_platform === true
  const finalPrice = body.price_agreed as number | undefined
  const admin = getAdmin()

  const updates: Record<string, unknown> = {
    status: 'completed',
    checkout_at: new Date().toISOString(),
    payment_outside_platform: paymentOutside,
  }
  if (finalPrice !== undefined && finalPrice > 0) updates.price_agreed = finalPrice

  await admin.from('missions').update(updates).eq('id', ctx!.params.id)

  const priceMsg = finalPrice ? ` — €${finalPrice}` : ''
  await notify(
    mission.client_id, 'mission_completed',
    '✅ Servizio completato!',
    `${mission.title}${priceMsg} — lascia una recensione!`,
    { mission_id: ctx!.params.id }
  )

  return ok({
    message: 'Check-out effettuato',
    status: 'completed',
    payment_outside: paymentOutside,
    ...(finalPrice ? { final_price: finalPrice } : {}),
  })
})
