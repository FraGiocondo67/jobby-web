import { authHandler, getAdmin, getMission, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/checkin
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.provider_id !== auth.userId)
    throw apiError('Non autorizzato', 403)
  if (mission.status !== 'confirmed')
    throw apiError('La missione deve essere confermata prima del check-in')

  const admin = getAdmin()
  await admin.from('missions')
    .update({ status: 'in_progress', checkin_at: new Date().toISOString() })
    .eq('id', ctx!.params.id)

  await notify(
    mission.client_id, 'provider_checkin',
    '🚀 Il fornitore è arrivato!',
    `Check-in effettuato per: ${mission.title}`,
    { mission_id: ctx!.params.id }
  )

  return ok({ message: 'Check-in effettuato', status: 'in_progress' })
})
