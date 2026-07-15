import { NextRequest } from 'next/server'
import { authHandler, getAdmin, getMission, parseBody, requireField, created, apiError } from '@/lib/api'

// Finestra massima per aprire una segnalazione dopo l'esecuzione del servizio.
// Deve restare allineata alla stessa soglia usata da create_payout_request (Supabase)
// per l'esclusione delle missioni con claim/dispute aperti dal calcolo del payout.
const CLAIM_WINDOW_HOURS = 2

// POST /api/claims/create — il cliente segnala un problema su una propria missione.
// Backend condiviso: questa route serve sia jobby-web (via lib/client-api.ts) sia
// jobby-clean (via apiCall assoluto verso lo stesso deploy Netlify).
export const POST = authHandler(async (req, auth) => {
  if (auth.role !== 'client' && auth.role !== 'both')
    throw apiError('Solo i clienti possono aprire una segnalazione', 403)

  const body = await parseBody(req)
  const missionId = requireField<string>(body, 'mission_id')
  const reason = requireField<string>(body, 'reason').trim()
  const description = (body.description as string | undefined)?.trim() || null

  const admin = getAdmin()
  const mission = await getMission(missionId)

  if (mission.client_id !== auth.userId)
    throw apiError('Puoi segnalare un problema solo sulle tue richieste', 403)

  // Determina la fase del claim dallo stato reale della missione (non ci si fida di un
  // valore inviato dal client) e applica la finestra dei 2h per le missioni concluse.
  let phase: string
  if (['published', 'matched', 'confirmed'].includes(mission.status)) {
    phase = 'pre_execution'
  } else if (mission.status === 'in_progress') {
    phase = 'during_execution'
  } else if (['completed', 'reviewed'].includes(mission.status)) {
    const executedAt = mission.checkout_at ?? mission.confirmed_at
    const hoursSince = executedAt ? (Date.now() - new Date(executedAt).getTime()) / 36e5 : Infinity
    if (hoursSince > CLAIM_WINDOW_HOURS)
      throw apiError(
        `Il tempo per segnalare un problema su questa missione è scaduto (max ${CLAIM_WINDOW_HOURS} ore dalla fine del servizio).`,
        400,
      )
    phase = 'post_execution_unpaid'
  } else {
    throw apiError('Non puoi segnalare un problema su una missione in questo stato', 400)
  }

  // Evita segnalazioni duplicate: una sola segnalazione attiva per missione alla volta.
  const { data: existing } = await admin
    .from('claims')
    .select('id')
    .eq('mission_id', missionId)
    .in('status', ['open', 'under_review', 'escalated'])
    .maybeSingle()
  if (existing) throw apiError('Hai già una segnalazione aperta per questa missione', 409)

  const { data: claim, error } = await admin
    .from('claims')
    .insert({ mission_id: missionId, phase, reason, description, status: 'open' })
    .select('id, mission_id, phase, reason, description, status, created_at')
    .single()

  if (error) throw apiError('Errore creazione segnalazione', 500, error.message)

  if (mission.provider_id) {
    await admin.from('notifications').insert({
      user_id: mission.provider_id,
      type: 'claim_opened',
      title: '⚠️ Segnalazione aperta su una missione',
      body: `Il cliente ha segnalato un problema: ${reason}`,
      data: { mission_id: missionId, claim_id: claim.id },
    })
  }

  return created({ claim, message: 'Segnalazione inviata. Il nostro team la esaminerà a breve.' })
})
