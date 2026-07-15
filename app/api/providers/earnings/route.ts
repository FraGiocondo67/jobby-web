import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok } from '@/lib/api'

export const GET = authHandler(async (req, auth) => {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'month'
  const admin = getAdmin()
  const now = new Date()
  let startDate: Date | null = null
  if (period === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7) }
  else if (period === 'month') { startDate = new Date(now); startDate.setMonth(now.getMonth() - 1) }
  else if (period === 'year') { startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1) }
  let query = admin.from('missions')
    .select('id, title, price_agreed, checkout_at, payment_outside_platform, category:service_categories(slug, name_it, icon), client:users!missions_client_id_fkey(full_name)')
    .eq('provider_id', auth.userId).in('status', ['completed', 'reviewed'])
    .order('checkout_at', { ascending: false })
  if (startDate) query = query.gte('checkout_at', startDate.toISOString())
  const { data } = await query
  const missions = data ?? []
  const paid = missions.filter((m: any) => !m.payment_outside_platform)
  const total = paid.reduce((s: number, m: any) => s + (m.price_agreed ?? 0), 0)
  return ok({ total_earned: total, paid_count: paid.length, total_count: missions.length, missions: missions.slice(0, 20) })
})
