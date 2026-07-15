import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok } from '@/lib/api'

export const GET = authHandler(async (req, auth) => {
  const admin = getAdmin()

  const { data: user } = await admin
    .from('users')
    .select('id, email, full_name, phone, role, status, preferred_lang, created_at')
    .eq('id', auth.userId)
    .single()

  // Carica profilo specifico per ruolo
  let clientProfile = null
  let providerProfile = null

  if (auth.role === 'client' || auth.role === 'both') {
    const { data } = await admin.from('profiles_client')
      .select('search_radius_km, total_spent, total_missions, avg_rating, trust_score, preferred_categories, address')
      .eq('user_id', auth.userId).maybeSingle()
    clientProfile = data
  }

  if (auth.role === 'provider' || auth.role === 'both') {
    const { data } = await admin.from('profiles_provider')
      .select(`id, skills, hourly_rate, operational_radius_km, availability_status,
        kyc_status, trust_score, avg_rating, completed_missions, total_missions,
        bio, is_proximity_business, business_data, payout_details`)
      .eq('user_id', auth.userId).maybeSingle()
    providerProfile = data
  }

  return ok({ user, clientProfile, providerProfile })
})
