import { NextRequest } from 'next/server'
import { handler, getAdmin, parseBody, requireField, created, apiError } from '@/lib/api'

export const POST = handler(async (req) => {
  const body = await parseBody(req)
  const email = requireField<string>(body, 'email')
  const password = requireField<string>(body, 'password')
  const fullName = requireField<string>(body, 'full_name')
  const role = requireField<string>(body, 'role')

  if (!['client', 'provider', 'both'].includes(role))
    throw apiError('Ruolo non valido: client | provider | both')
  if (password.length < 8)
    throw apiError('Password deve avere almeno 8 caratteri')

  const phone = body.phone as string | undefined
  const preferredLang = (body.preferred_lang as string) ?? 'it'
  const isProximity = body.is_proximity_business === true
  const businessData = body.business_data ?? null

  const admin = getAdmin()

  // 1. Crea utente Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: false,
    user_metadata: { full_name: fullName, role },
  })
  if (authError) {
    if (authError.message.includes('already registered'))
      throw apiError('Email già registrata', 409)
    throw apiError('Errore creazione account', 500, authError.message)
  }
  const authUser = authData.user
  if (!authUser) throw apiError('Errore creazione utente', 500)

  // 2. Inserisce in public.users
  const { data: jobbyUser, error: userErr } = await admin.from('users').insert({
    auth_id: authUser.id, email, phone: phone ?? null, full_name: fullName,
    role, status: role === 'client' ? 'active' : 'pending',
    preferred_lang: preferredLang, is_email_verified: false,
  }).select('id, email, role, status').single()

  if (userErr) {
    await admin.auth.admin.deleteUser(authUser.id)
    throw apiError('Errore creazione profilo', 500, userErr.message)
  }
  const userId = jobbyUser.id

  // 3. Profilo cliente
  if (role === 'client' || role === 'both') {
    const { error: cpErr } = await admin.from('profiles_client').insert({
      user_id: userId,
      search_radius_km: (body.search_radius_km as number) ?? 10,
    })
    if (cpErr) throw apiError('Errore profilo cliente', 500, cpErr.message)
  }

  // 4. Profilo fornitore / attività
  if (role === 'provider' || role === 'both') {
    const { error: ppErr } = await admin.from('profiles_provider').insert({
      user_id: userId,
      skills: isProximity && businessData?.proximity_category
        ? [businessData.proximity_category] : (body.skills as string[]) ?? [],
      hourly_rate: (body.hourly_rate as number) ?? null,
      operational_radius_km: isProximity
        ? (businessData?.travel_radius_km ?? 5)
        : (body.operational_radius_km as number) ?? 10,
      availability_status: 'offline',
      kyc_status: 'not_started',
      trust_score: 0,
      is_proximity_business: isProximity,
      business_data: isProximity ? businessData : null,
    })
    if (ppErr) throw apiError('Errore profilo fornitore', 500, ppErr.message)
  }

  // 5. Notifica benvenuto (non bloccante)
  await admin.from('notifications').insert({
    user_id: userId, type: 'system',
    title: role === 'client' ? 'Benvenuto su JOBBY!' : 'Account creato',
    body: role === 'client'
      ? 'Inizia a cercare servizi vicino a te.'
      : 'Completa la verifica identità per iniziare.',
    data: { role },
  }).then(({ error }) => { if (error) console.error("Notification error:", error) })

  return created({
    user: { id: userId, email, role, status: jobbyUser.status },
    message: role === 'client'
      ? 'Account creato. Controlla l\'email per confermare.'
      : 'Account creato. Verifica email e completa il KYC.',
  })
})
