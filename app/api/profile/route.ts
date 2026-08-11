import { NextRequest } from 'next/server'
import { authHandler, backendFetch, ok } from '@/lib/api'

// BLOCCO 7b (jobby-web -> client puro): GET riusa il backend GET /auth/me
// (stesso dato, jobby-web lo esponeva già una seconda volta identico su
// questo path); PATCH usa il nuovo PATCH /profile del backend (stessi campi
// esatti gestiti prima qui direttamente via Supabase).

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

export const PATCH = authHandler(async (req, auth) => {
  const body = await req.json().catch(() => ({}))
  const data = await backendFetch<{ message: string }>('/profile', auth.token, {
    method: 'PATCH',
    body,
  })
  return ok({ message: data.message })
})
