import { NextRequest } from 'next/server'
import { authHandler, backendFetch, getMission, parseBody, requireField, created, apiError, ApiError } from '@/lib/api'

// Il backend usa codici brevi per `detail` (serve anche mobile/Retool, che
// localizzano da soli) — jobby-web mostrava invece frasi complete in
// italiano direttamente all'utente: mappiamo qui i pochi codici noti così
// non si perde il messaggio leggibile per chi usa già questa route.
const FRIENDLY_MESSAGES: Record<string, string> = {
  claim_already_open: 'Hai già una segnalazione aperta per questa missione',
  mission_not_found: 'Missione non trovata',
  forbidden: 'Non sei autorizzato a compiere questa azione',
}

// POST /api/claims/create — il cliente segnala un problema su una propria missione.
// BLOCCO 7b (jobby-web -> client puro): la derivazione della `phase` e la
// finestra di 2 ore per segnalare un problema post-esecuzione sono state
// spostate nel backend (POST /claims, routers/disputes.py) così le usano
// anche mobile/Retool/pannello admin — prima vivevano solo qui. Il backend
// ignora comunque un eventuale `phase` mandato dal chiamante e la ricalcola
// sempre da solo, quindi qui non lo mandiamo nemmeno più.
export const POST = authHandler(async (req, auth) => {
  if (auth.role !== 'client' && auth.role !== 'both')
    throw apiError('Solo i clienti possono aprire una segnalazione', 403)

  const body = await parseBody(req)
  const missionId = requireField<string>(body, 'mission_id')
  const reason = requireField<string>(body, 'reason').trim()
  const description = (body.description as string | undefined)?.trim() || undefined

  // Verifica di appartenenza mantenuta qui (lettura, non scrittura) per un
  // messaggio d'errore immediato lato UI prima di chiamare il backend, che
  // comunque la riverifica indipendentemente (_load_mission + client_id).
  const mission = await getMission(missionId)
  if (mission.client_id !== auth.userId)
    throw apiError('Puoi segnalare un problema solo sulle tue richieste', 403)

  let claim: any
  try {
    claim = await backendFetch<any>('/claims', auth.token, {
      method: 'POST',
      body: { mission_id: missionId, reason, description },
    })
  } catch (err) {
    if (err instanceof ApiError && FRIENDLY_MESSAGES[err.message])
      throw apiError(FRIENDLY_MESSAGES[err.message], err.status)
    throw err
  }

  return created({ claim, message: 'Segnalazione inviata. Il nostro team la esaminerà a breve.' })
})
