import { NextRequest } from 'next/server'
import { authHandler, backendFetch, parseBody, ok, apiError } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): proxy verso PATCH /provider/availability
// (routers/provider_onboarding.py) — stesso backend condiviso già usato da
// app/api/providers/status (le due route erano già praticamente duplicate).
export const PATCH = authHandler(async (req, auth) => {
  if (auth.role !== 'provider' && auth.role !== 'both')
    throw apiError('Solo i fornitori possono cambiare disponibilità', 403)

  const body = await parseBody(req)
  const status = body.status as string
  if (!['online', 'offline', 'busy'].includes(status))
    throw apiError('Status non valido: online | offline | busy')

  const data = await backendFetch<{ availability_status: string }>('/provider/availability', auth.token, {
    method: 'PATCH',
    body: { status },
  })
  return ok({ availability_status: data.availability_status })
})
