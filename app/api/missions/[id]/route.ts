import { NextRequest } from 'next/server'
import { authHandler, getAdmin, getMission, parseBody, ok, apiError } from '@/lib/api'

// GET /api/missions/[id]
export const GET = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  return ok({ mission })
})

// PATCH /api/missions/[id] — aggiorna campi modificabili
export const PATCH = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  const body = await parseBody(req)
  const admin = getAdmin()

  // Solo il cliente può modificare la missione e solo in certi stati
  if (mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può modificare la missione', 403)
  if (!['published', 'matched'].includes(mission.status))
    throw apiError('Non puoi modificare una missione in questo stato')

  const allowed = ['title', 'description', 'address', 'price_agreed', 'scheduled_at']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) throw apiError('Nessun campo da aggiornare')

  const { data, error } = await admin.from('missions')
    .update(updates).eq('id', ctx!.params.id).select().single()
  if (error) throw apiError('Errore aggiornamento', 500, error.message)

  return ok({ mission: data })
})

// DELETE /api/missions/[id] — cancella (solo published o matched)
export const DELETE = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può cancellare la missione', 403)
  if (!['published', 'matched'].includes(mission.status))
    throw apiError('Non puoi cancellare una missione in questo stato')

  const admin = getAdmin()
  await admin.from('missions').update({ status: 'cancelled' }).eq('id', ctx!.params.id)

  // Notifica provider se era già assegnato
  if (mission.provider_id) {
    await admin.from('notifications').insert({
      user_id: mission.provider_id, type: 'mission_cancelled',
      title: '❌ Missione cancellata',
      body: `Il cliente ha cancellato: ${mission.title}`,
      data: { mission_id: ctx!.params.id },
    })
  }

  return ok({ message: 'Missione cancellata' })
})
