import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

// PATCH /api/providers/availability — toggle online/offline
export const PATCH = authHandler(async (req, auth) => {
  if (auth.role !== 'provider' && auth.role !== 'both')
    throw apiError('Solo i fornitori possono cambiare disponibilità', 403)

  const body = await parseBody(req)
  const status = body.status as string
  if (!['online', 'offline', 'busy'].includes(status))
    throw apiError('Status non valido: online | offline | busy')

  const admin = getAdmin()
  await admin.from('profiles_provider')
    .update({ availability_status: status })
    .eq('user_id', auth.userId)

  return ok({ availability_status: status })
})
