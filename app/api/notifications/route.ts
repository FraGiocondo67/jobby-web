import { NextRequest } from 'next/server'
import { authHandler, backendFetch, parseBody, ok, apiError } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): notifiche (lettura, marcatura come
// lette, cancellazione) ora passano dal backend condiviso invece di leggere/
// scrivere `public.notifications` direttamente via Supabase — chiude anche
// un gap reale: il backend tiene allineate sia `is_read` che `read_at`,
// prima jobby-web scriveva solo `read_at` lasciando `is_read` disallineato.

// GET /api/notifications — remap items/unread (backend) -> notifications/unread_count (contratto storico di questa route).
export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
  const unreadOnly = searchParams.get('unread') === 'true'

  const data = await backendFetch<{ items: any[]; unread: number }>(
    `/notifications?limit=${limit}&unread=${unreadOnly}`,
    auth.token,
  )
  return ok({ notifications: data.items ?? [], unread_count: data.unread ?? 0 })
})

// PATCH /api/notifications — segna come lette. Contratto storico: `{id}`
// singola, oppure nessun campo per "segna tutte". Il chiamante reale in
// lib/client-api.ts (Notifications.markRead) manda però `{ids: string[]}`
// (array) — un disallineamento pre-esistente per cui quella chiamata finiva
// sempre nel ramo "segna tutte" invece che sulle sole id passate. Corretto
// qui supportando anche `ids[]`, chiamando il backend una volta per id
// (non esiste un endpoint di marcatura bulk lato backend).
export const PATCH = authHandler(async (req, auth) => {
  const body = await parseBody(req)

  if (body.id) {
    await backendFetch(`/notifications/${body.id}/read`, auth.token, { method: 'POST' })
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    for (const id of body.ids as string[]) {
      await backendFetch(`/notifications/${id}/read`, auth.token, { method: 'POST' })
    }
  } else {
    await backendFetch('/notifications/read-all', auth.token, { method: 'POST' })
  }

  return ok({ message: 'Notifiche aggiornate' })
})

// DELETE /api/notifications — elimina notifica.
export const DELETE = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  if (!body.id) throw apiError('ID notifica obbligatorio')

  await backendFetch(`/notifications/${body.id}`, auth.token, { method: 'DELETE' })
  return ok({ message: 'Notifica eliminata' })
})
