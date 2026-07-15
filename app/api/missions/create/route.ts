import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, requireField, created, apiError } from '@/lib/api'

export const POST = authHandler(async (req, auth) => {
  if (auth.role !== 'client' && auth.role !== 'both') throw apiError('Solo i clienti possono creare missioni', 403)
  const body = await parseBody(req)
  const title = requireField<string>(body, 'title').trim()
  const address = requireField<string>(body, 'address').trim()
  const scheduledAt = requireField<string>(body, 'scheduled_at')
  const admin = getAdmin()
  let categoryId: string | null = null
  if (body.category_slug) {
    const { data: cat } = await admin.from('service_categories').select('id').eq('slug', body.category_slug as string).maybeSingle()
    categoryId = cat?.id ?? null
  }
  const providerId = (body.provider_id as string) ?? null
  const { data: mission, error } = await admin.from('missions').insert({
    client_id: auth.userId, provider_id: providerId, category_id: categoryId,
    title, description: (body.description as string)?.trim() ?? null,
    address, price_agreed: (body.price_agreed as number) ?? 0,
    scheduled_at: scheduledAt, duration_hours: (body.duration_hours as number) ?? 1,
    status: providerId ? 'matched' : 'published', payment_status: 'pending',
  }).select('id, title, status, price_agreed').single()
  if (error) throw apiError('Errore creazione missione', 500, error.message)
  if (providerId) {
    const { data: client } = await admin.from('users').select('full_name').eq('id', auth.userId).single()
    await admin.from('notifications').insert({ user_id: providerId, type: 'new_mission_request',
      title: `📋 Nuova richiesta da ${client?.full_name ?? 'un cliente'}`, body: title, data: { mission_id: mission.id } })
  }
  return created({ mission })
})
