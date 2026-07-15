import { authHandler, getAdmin, getMission, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/reject-provider — il cliente rifiuta il fornitore
// proposto dal matching. La missione resta "matched" ma senza provider_id,
// così l'utente può rilanciare la ricerca (stesso stato che la pagina già
// gestisce con il bottone "Cerca di nuovo").
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può rifiutare il fornitore', 403)
  if (mission.status !== 'matched')
    throw apiError('La missione non è in stato "matched"')
  if (!mission.provider_id)
    throw apiError('Nessun fornitore proposto da rifiutare')

  const rejectedProviderId = mission.provider_id
  const admin = getAdmin()
  const { error } = await admin.from('missions')
    .update({ provider_id: null })
    .eq('id', ctx!.params.id)
  if (error) throw apiError('Errore aggiornamento', 500, error.message)

  await notify(
    rejectedProviderId, 'client_rejected_proposal',
    '❌ Proposta non confermata',
    `Il cliente non ha confermato la tua proposta per: ${mission.title}`,
    { mission_id: ctx!.params.id }
  )

  return ok({ message: 'Fornitore rifiutato', status: 'matched' })
})
