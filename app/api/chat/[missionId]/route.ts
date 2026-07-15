import { NextRequest } from 'next/server'
import { authHandler, getAdmin, getMission, parseBody, requireField, ok, created, apiError } from '@/lib/api'

// GET /api/chat/[missionId] — carica messaggi + info conversazione
export const GET = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.missionId, auth.userId)
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)
  const before = searchParams.get('before') // cursore per paginazione

  const admin = getAdmin()
  let query = admin.from('messages')
    .select('id, sender_id, receiver_id, content, created_at, read_at')
    .eq('mission_id', ctx!.params.missionId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data: messages, error } = await query
  if (error) throw apiError('Errore caricamento messaggi', 500, error.message)

  // Segna come letti i messaggi ricevuti
  await admin.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('mission_id', ctx!.params.missionId)
    .eq('receiver_id', auth.userId)
    .is('read_at', null)

  // Info sull'altro partecipante
  const otherUserId = auth.userId === mission.client_id ? mission.provider_id : mission.client_id
  const { data: otherUser } = await admin.from('users')
    .select('id, full_name').eq('id', otherUserId!).maybeSingle()

  return ok({
    messages: messages ?? [],
    mission: {
      id: mission.id, title: mission.title, status: mission.status,
      category: mission.category,
    },
    otherUser,
  })
})

// POST /api/chat/[missionId] — invia messaggio
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.missionId, auth.userId)

  if (!['matched', 'confirmed', 'in_progress', 'completed', 'reviewed'].includes(mission.status))
    throw apiError('Non puoi inviare messaggi per questa missione')

  const body = await parseBody(req)
  const content = requireField<string>(body, 'content').trim()
  if (content.length === 0) throw apiError('Il messaggio non può essere vuoto')
  if (content.length > 2000) throw apiError('Messaggio troppo lungo (max 2000 caratteri)')

  const receiverId = auth.userId === mission.client_id ? mission.provider_id : mission.client_id
  if (!receiverId) throw apiError('Destinatario non trovato')

  const admin = getAdmin()
  const { data: message, error } = await admin.from('messages').insert({
    mission_id: ctx!.params.missionId,
    sender_id: auth.userId,
    receiver_id: receiverId,
    content,
  }).select('id, sender_id, receiver_id, content, created_at, read_at').single()

  if (error) throw apiError('Errore invio messaggio', 500, error.message)

  return created({ message })
})
