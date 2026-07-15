import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok } from '@/lib/api'

export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const admin = getAdmin()
  let query = admin.from('missions')
    .select('id, title, status, price_agreed, scheduled_at, address, description, client_id, payment_outside_platform, category:service_categories(slug, name_it, icon), client:users!missions_client_id_fkey(id, full_name, phone)')
    .eq('provider_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status) query = query.eq('status', status)
  else query = query.in('status', ['matched','confirmed','in_progress','completed','reviewed'])
  const { data, error } = await query
  if (error) return ok({ orders: [], count: 0 })
  return ok({ orders: data ?? [], count: data?.length ?? 0 })
})
