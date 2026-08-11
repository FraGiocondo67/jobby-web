import { NextRequest } from 'next/server'
import { authHandler, getMission, backendFetch, parseBody, requireField, ok, created, apiError } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): i messaggi (lettura, invio, marcatura
// come letti) passano ora dal backend condiviso (GET/POST /chat/{mission_id}),
// stesso usato da app mobile/Retool/pannello admin — prima leggevano/
// scrivevano `public.messages` direttamente via Supabase.
//
// getMission() resta una lettura diretta Supabase, deliberatamente: qui
// serve solo per arricchire la risposta con titolo/stato/categoria della
// missione e i dati dell'altro partecipante (nome/telefono) — non è "dato di
// chat", è metadata di missione già disponibile via join. Convertirla
// richiederebbe un endpoint backend generico "dettaglio missione" che oggi
// non esiste per nessuna delle 4 verticali (stesso gap già segnalato nello
// spec di mappatura per il redesign missioni, Blocco 8) — fuori scope qui.
export const GET = authHandler(async (req, auth, ctx) => {
  const missionId = ctx!.params.missionId
  const mission = await getMission(missionId, auth.userId)
  const messages = await backendFetch<any[]>(`/chat/${missionId}`, auth.token)

  const otherUserId = auth.userId === mission.client_id ? mission.provider_id : mission.client_id
  const otherUser =
    otherUserId && (mission as any).provider?.id === otherUserId
      ? (mission as any).provider
      : otherUserId && (mission as any).client?.id === otherUserId
        ? (mission as any).client
        : null

  return ok({
    messages: messages ?? [],
    mission: {
      id: mission.id, title: mission.title, status: mission.status,
      category: (mission as any).category,
    },
    otherUser,
  })
})

export const POST = authHandler(async (req, auth, ctx) => {
  const missionId = ctx!.params.missionId
  const mission = await getMission(missionId, auth.userId)

  // Regola UX preesistente non ancora portata nel backend (chat.py non
  // applica alcuna restrizione di stato, solo che il mittente sia
  // client/provider della missione) — tenuta qui lato proxy per non perdere
  // comportamento; da valutare se spostarla server-side in futuro.
  if (!['matched', 'confirmed', 'in_progress', 'completed', 'reviewed'].includes(mission.status))
    throw apiError('Non puoi inviare messaggi per questa missione')

  const body = await parseBody(req)
  const content = requireField<string>(body, 'content').trim()
  if (content.length === 0) throw apiError('Il messaggio non può essere vuoto')
  if (content.length > 2000) throw apiError('Messaggio troppo lungo (max 2000 caratteri)')

  const message = await backendFetch<any>(`/chat/${missionId}`, auth.token, {
    method: 'POST',
    body: { content },
  })
  return created({ message })
})
