import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

// GET /api/notifications — lista notifiche utente
export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
  const unreadOnly = searchParams.get('unread') === 'true'

  const admin = getAdmin()
  let query = admin.from('notifications')
    .select('id, type, title, body, data, read_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.is('read_at', null)

  const { data, error } = await query
  if (error) throw apiError('Errore caricamento notifiche', 500, error.message)

  const { count: unreadCount } = await admin.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .is('read_at', null)

  return ok({ notifications: data ?? [], unread_count: unreadCount ?? 0 })
})

// PATCH /api/notifications — segna tutte come lette (o una specifica)
export const PATCH = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  const admin = getAdmin()
  const now = new Date().toISOString()

  if (body.id) {
    // Segna una notifica specifica
    await admin.from('notifications')
      .update({ read_at: now })
      .eq('id', body.id as string)
      .eq('user_id', auth.userId)
  } else {
    // Segna tutte come lette
    await admin.from('notifications')
      .update({ read_at: now })
      .eq('user_id', auth.userId)
      .is('read_at', null)
  }

  return ok({ message: 'Notifiche aggiornate' })
})

// DELETE /api/notifications — elimina notifica
export const DELETE = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  if (!body.id) throw apiError('ID notifica obbligatorio')

  const admin = getAdmin()
  await admin.from('notifications')
    .delete()
    .eq('id', body.id as string)
    .eq('user_id', auth.userId)

  return ok({ message: 'Notifica eliminata' })
})
