import { NextRequest } from 'next/server'
import { authHandler, backendFetch, ok } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): prima leggeva Supabase direttamente
// (service role), ora proxy verso il backend condiviso (GET /auth/me, stesso
// usato da app mobile/Retool/pannello admin). Remap client_profile/
// provider_profile (snake_case lato backend) -> clientProfile/providerProfile
// (contratto storico di questa route, da cui dipendono le pagine esistenti).
export const GET = authHandler(async (req, auth) => {
  const data = await backendFetch<{ user: any; client_profile?: any; provider_profile?: any }>(
    '/auth/me',
    auth.token,
  )
  return ok({
    user: data.user,
    clientProfile: data.client_profile ?? null,
    providerProfile: data.provider_profile ?? null,
  })
})
