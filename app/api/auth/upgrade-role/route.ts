import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, ok, apiError } from '@/lib/api'

// POST /api/auth/upgrade-role
// Permette a un cliente di diventare anche fornitore, o viceversa
export const POST = authHandler(async (req, auth) => {
  const body = await parseBody(req)
  const targetRole = body.role as string // 'both'

  if (targetRole !== 'both') throw apiError('Solo il ruolo "both" è supportato')
  if (auth.role === 'both') throw apiError('Sei già registrato con entrambi i ruoli')

  const admin = getAdmin()

  // Aggiorna il ruolo su public.users
  const { error: roleErr } = await admin.from('users')
    .update({ role: 'both' })
    .eq('id', auth.userId)
  if (roleErr) throw apiError('Errore aggiornamento ruolo', 500, roleErr.message)

  // Se era solo cliente → crea profilo fornitore
  if (auth.role === 'client') {
    const { data: existing } = await admin.from('profiles_provider')
      .select('id').eq('user_id', auth.userId).maybeSingle()

    if (!existing) {
      const { error: ppErr } = await admin.from('profiles_provider').insert({
        user_id: auth.userId,
        skills: [],
        operational_radius_km: 10,
        availability_status: 'offline',
        kyc_status: 'not_started',
        trust_score: 0,
        is_proximity_business: false,
      })
      if (ppErr) throw apiError('Errore creazione profilo fornitore', 500, ppErr.message)
    }

    await admin.from('notifications').insert({
      user_id: auth.userId,
      type: 'role_upgrade',
      title: '⚡ Ora sei anche Fornitore!',
      body: 'Completa il tuo profilo fornitore e inizia ad offrire i tuoi servizi.',
      data: { new_role: 'both' },
    })
  }

  // Se era solo fornitore → crea profilo cliente
  if (auth.role === 'provider') {
    const { data: existing } = await admin.from('profiles_client')
      .select('id').eq('user_id', auth.userId).maybeSingle()

    if (!existing) {
      const { error: cpErr } = await admin.from('profiles_client').insert({
        user_id: auth.userId,
        search_radius_km: 10,
      })
      if (cpErr) throw apiError('Errore creazione profilo cliente', 500, cpErr.message)
    }

    await admin.from('notifications').insert({
      user_id: auth.userId,
      type: 'role_upgrade',
      title: '🔍 Ora sei anche Cliente!',
      body: 'Puoi ora cercare servizi e richiedere professionisti vicino a te.',
      data: { new_role: 'both' },
    })
  }

  return ok({
    message: `Ruolo aggiornato a "${targetRole}"`,
    new_role: 'both',
  })
})
