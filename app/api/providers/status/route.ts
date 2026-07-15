import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

export const PATCH = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  const status = body.status as string
  if (!['online', 'offline', 'busy'].includes(status)) throw apiError('Status non valido')
  const admin = getAdmin()
  await admin.from('profiles_provider').update({ availability_status: status }).eq('user_id', auth.userId)
  return ok({ availability_status: status })
})
