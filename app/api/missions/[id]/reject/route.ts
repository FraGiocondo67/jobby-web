import { authHandler, getAdmin, getMission, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/reject — il fornitore assegnato rifiuta una missione
// (richiesta diretta: attività di prossimità o ordine diretto a fornitore standard, Fase 4).
// Riporta la missione allo stato "published" e libera il provider_id, così può
// essere ripresa in carico da qualcun altro (via matching o un nuovo ordine diretto).
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.provider_id !== auth.userId)
    throw apiError('Non sei il fornitore assegnato a questa missione', 403)
  if (mission.status !== 'matched')
    throw apiError('La missione non è in stato "matched"')

  const admin = getAdmin()
  const { error } = await admin.from('missions')
    .update({ status: 'published', provider_id: null })
    .eq('id', ctx!.params.id)
  if (error) throw apiError('Errore aggiornamento', 500, error.message)

  await notify(
    mission.client_id, 'provider_rejected',
    '❌ Fornitore non disponibile',
    `${(mission.provider as any)?.full_name ?? 'Il fornitore'} non può occuparsi di: ${mission.title}`,
    { mission_id: ctx!.params.id }
  )

  return ok({ message: 'Missione rifiutata', status: 'published' })
})
