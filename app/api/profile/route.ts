import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

// GET /api/profile — profilo completo utente corrente
export const GET = authHandler(async (req, auth) => {
  const admin = getAdmin()
  const { data: user, error } = await admin.from('users')
    .select('id, email, full_name, phone, role, status, preferred_lang, created_at')
    .eq('id', auth.userId).single()
  if (error || !user) throw apiError('Utente non trovato', 404)

  let clientProfile = null
  let providerProfile = null

  if (auth.role === 'client' || auth.role === 'both') {
    const { data } = await admin.from('profiles_client')
      .select('*').eq('user_id', auth.userId).maybeSingle()
    clientProfile = data
  }
  if (auth.role === 'provider' || auth.role === 'both') {
    const { data } = await admin.from('profiles_provider')
      .select('*').eq('user_id', auth.userId).maybeSingle()
    providerProfile = data
  }

  return ok({ user, clientProfile, providerProfile })
})

// PATCH /api/profile — aggiorna profilo
export const PATCH = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  const admin = getAdmin()

  // Campi users
  const userUpdates: Record<string, unknown> = {}
  if (body.full_name !== undefined) userUpdates.full_name = (body.full_name as string).trim()
  if (body.phone !== undefined) userUpdates.phone = body.phone || null
  if (body.preferred_lang !== undefined) userUpdates.preferred_lang = body.preferred_lang

  if (Object.keys(userUpdates).length > 0) {
    const { error } = await admin.from('users').update(userUpdates).eq('id', auth.userId)
    if (error) throw apiError('Errore aggiornamento utente', 500, error.message)
  }

  // Campi profiles_client
  if (auth.role === 'client' || auth.role === 'both') {
    const cpUpdates: Record<string, unknown> = {}
    if (body.address !== undefined) cpUpdates.address = body.address
    if (body.search_radius_km !== undefined) cpUpdates.search_radius_km = body.search_radius_km
    if (body.preferred_categories !== undefined) cpUpdates.preferred_categories = body.preferred_categories
    if (Object.keys(cpUpdates).length > 0)
      await admin.from('profiles_client').update(cpUpdates).eq('user_id', auth.userId)
  }

  // Campi profiles_provider
  if (auth.role === 'provider' || auth.role === 'both') {
    const ppUpdates: Record<string, unknown> = {}
    if (body.bio !== undefined) ppUpdates.bio = body.bio
    if (body.hourly_rate !== undefined) ppUpdates.hourly_rate = body.hourly_rate
    if (body.skills !== undefined) ppUpdates.skills = body.skills
    if (body.operational_radius_km !== undefined) ppUpdates.operational_radius_km = body.operational_radius_km
    if (body.availability_status !== undefined) ppUpdates.availability_status = body.availability_status
    if (body.payout_details !== undefined) ppUpdates.payout_details = body.payout_details
    if (body.business_data !== undefined) ppUpdates.business_data = body.business_data
    if (Object.keys(ppUpdates).length > 0)
      await admin.from('profiles_provider').update(ppUpdates).eq('user_id', auth.userId)
  }

  return ok({ message: 'Profilo aggiornato con successo' })
})
