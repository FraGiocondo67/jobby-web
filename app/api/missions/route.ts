import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, requireField, ok, created, apiError } from '@/lib/api'

// GET /api/missions — lista missioni per ruolo
export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? auth.role
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const admin = getAdmin()
  let query = admin.from('missions')
    .select(`
      id, title, status, price_agreed, scheduled_at, address, client_id, provider_id,
      payment_outside_platform, checkin_at, checkout_at, created_at, duration_hours,
      category:service_categories(id, slug, name_it, icon, category_type),
      client:users!missions_client_id_fkey(id, full_name),
      provider:users!missions_provider_id_fkey(id, full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'client') query = query.eq('client_id', auth.userId)
  else if (role === 'provider') {
    query = query.eq('provider_id', auth.userId)
    query = query.in('status', ['matched', 'confirmed', 'in_progress', 'completed', 'reviewed'])
  } else {
    query = query.or(`client_id.eq.${auth.userId},provider_id.eq.${auth.userId}`)
  }

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) throw apiError('Errore DB', 500, error.message)

  return ok({ missions: data ?? [], total: count ?? 0, limit, offset })
})

// POST /api/missions — crea nuova missione
export const POST = authHandler(async (req, auth) => {
  if (auth.role !== 'client' && auth.role !== 'both')
    throw apiError('Solo i clienti possono creare missioni', 403)

  const body = await parseBody(req)
  const title = requireField<string>(body, 'title').trim()
  const address = requireField<string>(body, 'address').trim()
  const scheduledAt = requireField<string>(body, 'scheduled_at')

  const admin = getAdmin()

  // Trova category_id dal slug
  let categoryId: string | null = null
  if (body.category_slug) {
    const { data: cat } = await admin.from('service_categories')
      .select('id').eq('slug', body.category_slug as string).maybeSingle()
    categoryId = cat?.id ?? null
  }

  const providerId = body.provider_id as string | null ?? null

  const { data: mission, error } = await admin.from('missions').insert({
    client_id: auth.userId,
    provider_id: providerId,
    category_id: categoryId,
    title,
    description: (body.description as string)?.trim() ?? null,
    address,
    price_agreed: (body.price_agreed as number) ?? 0,
    scheduled_at: scheduledAt,
    duration_hours: (body.duration_hours as number) ?? 1,
    status: providerId ? 'matched' : 'published',
    payment_status: 'pending',
  }).select('id, title, status, price_agreed, scheduled_at').single()

  if (error) throw apiError('Errore creazione missione', 500, error.message)

  // Se missione diretta a un provider, notificalo
  if (providerId) {
    const { data: client } = await admin.from('users').select('full_name').eq('id', auth.userId).single()
    await admin.from('notifications').insert({
      user_id: providerId, type: 'new_mission_request',
      title: `📋 Nuova richiesta da ${client?.full_name ?? 'un cliente'}`,
      body: title, data: { mission_id: mission.id },
    })
  }

  return created({ mission })
})
