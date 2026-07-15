import { authHandler, getAdmin, getMission, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/confirm-provider — il cliente conferma il fornitore
// proposto dal matching (flusso standard "richiesta aperta" con provider_id
// assegnato ma non ancora confermato dal cliente).
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può confermare il fornitore', 403)
  if (mission.status !== 'matched')
    throw apiError('La missione non è in stato "matched"')
  if (!mission.provider_id)
    throw apiError('Nessun fornitore proposto da confermare')

  const admin = getAdmin()
  const now = new Date().toISOString()
  const { error } = await admin.from('missions')
    .update({ status: 'confirmed', confirmed_at: now })
    .eq('id', ctx!.params.id)
  if (error) throw apiError('Errore aggiornamento', 500, error.message)

  await notify(
    mission.provider_id, 'client_confirmed',
    '✅ Cliente ha confermato!',
    `Il cliente ha confermato la tua proposta per: ${mission.title}`,
    { mission_id: ctx!.params.id }
  )

  return ok({ message: 'Fornitore confermato', status: 'confirmed' })
})
