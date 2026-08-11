import { NextRequest } from 'next/server'
import { authHandler, backendFetch, parseBody, ok, apiError } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): proxy verso PATCH /provider/availability
// (routers/provider_onboarding.py) invece di scrivere `profiles_provider`
// direttamente via Supabase. Nota: il backend richiede role provider/both
// (403 altrimenti) — questa route qui non aveva mai fatto quel controllo
// esplicitamente (per un client sarebbe stato comunque un no-op silenzioso,
// nessuna riga profiles_provider da aggiornare): con la conversione un
// client che la chiamasse per errore ora riceve un 403 esplicito invece di
// un finto successo, comportamento più corretto.
export const PATCH = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  const status = body.status as string
  if (!['online', 'offline', 'busy'].includes(status)) throw apiError('Status non valido')

  const data = await backendFetch<{ availability_status: string }>('/provider/availability', auth.token, {
    method: 'PATCH',
    body: { status },
  })
  return ok({ availability_status: data.availability_status })
})
