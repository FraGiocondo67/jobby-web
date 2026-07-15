import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok } from '@/lib/api'

export const GET = authHandler(async (req, auth) => {
  const admin = getAdmin()
  const { data } = await admin.from('missions')
    .select('price_agreed, checkout_at, payment_outside_platform, category:service_categories(icon, name_it), client:users!missions_client_id_fkey(full_name)')
    .eq('provider_id', auth.userId)
    .in('status', ['completed', 'reviewed'])
    .order('checkout_at', { ascending: false })

  const missions = data ?? []
  const paid = missions.filter((m: any) => !m.payment_outside_platform)
  const total = paid.reduce((s: number, m: any) => s + (m.price_agreed ?? 0), 0)
  const byMonth: Record<string, number> = {}
  paid.forEach((m: any) => {
    if (m.checkout_at) {
      const key = m.checkout_at.slice(0, 7)
      byMonth[key] = (byMonth[key] ?? 0) + (m.price_agreed ?? 0)
    }
  })
  return ok({ total_earned: total, mission_count: missions.length, paid_count: paid.length, by_month: byMonth, missions: missions.slice(0, 20) })
})
