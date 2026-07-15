import { authHandler, getAdmin, getMission, parseBody, ok, apiError, notify } from '@/lib/api'

// POST /api/missions/[id]/accept — provider accetta la missione
// Body opzionale: { price_agreed } — usato dalle attività di prossimità per
// indicare un prezzo indicativo al momento dell'accettazione.
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.provider_id !== auth.userId)
    throw apiError('Non sei il fornitore assegnato a questa missione', 403)
  if (mission.status !== 'matched')
    throw apiError('La missione non è in stato "matched"')

  const body = await parseBody(req).catch(() => ({} as Record<string, any>))
  const priceAgreed = body?.price_agreed as number | undefined

  const admin = getAdmin()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = { status: 'confirmed', confirmed_at: now }
  if (priceAgreed !== undefined && priceAgreed > 0) updates.price_agreed = priceAgreed

  const { error } = await admin.from('missions')
    .update(updates)
    .eq('id', ctx!.params.id)
  if (error) throw apiError('Errore aggiornamento', 500, error.message)

  await notify(
    mission.client_id, 'mission_confirmed',
    '✅ Fornitore confermato!',
    `${(mission.provider as any)?.full_name ?? 'Il fornitore'} ha accettato: ${mission.title}`,
    { mission_id: ctx!.params.id }
  )

  return ok({ message: 'Missione confermata', status: 'confirmed' })
})
