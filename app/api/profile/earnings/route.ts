import { NextRequest } from 'next/server'
import { authHandler, getAdmin, ok, apiError } from '@/lib/api'

// GET /api/profile/earnings — guadagni dettagliati fornitore
// Query params: period = week | month | year | all
export const GET = authHandler(async (req, auth) => {
  if (auth.role !== 'provider' && auth.role !== 'both')
    throw apiError('Solo i fornitori hanno guadagni', 403)

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'month'

  const admin = getAdmin()

  // Calcola data inizio periodo
  const now = new Date()
  let startDate: Date | null = null
  if (period === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7) }
  else if (period === 'month') { startDate = new Date(now); startDate.setMonth(now.getMonth() - 1) }
  else if (period === 'year') { startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1) }

  // Carica tutte le missioni completate
  let query = admin.from('missions')
    .select(`
      id, title, price_agreed, provider_payout, checkout_at,
      payment_outside_platform, payment_status,
      category:service_categories(slug, name_it, icon),
      client:users!missions_client_id_fkey(full_name)
    `)
    .eq('provider_id', auth.userId)
    .in('status', ['completed', 'reviewed'])
    .order('checkout_at', { ascending: false })

  if (startDate) query = query.gte('checkout_at', startDate.toISOString())

  const { data: missions, error } = await query
  if (error) throw apiError('Errore caricamento guadagni', 500, error.message)

  const all = missions ?? []
  const inApp = all.filter(m => !m.payment_outside_platform)
  const external = all.filter(m => m.payment_outside_platform)

  const totalEarned = inApp.reduce((s, m) => s + (m.price_agreed ?? 0), 0)
  const totalExternal = external.reduce((s, m) => s + (m.price_agreed ?? 0), 0)
  const avgPerMission = inApp.length > 0 ? totalEarned / inApp.length : 0

  // Breakdown per categoria
  const byCategory: Record<string, { name: string; icon: string; count: number; total: number }> = {}
  for (const m of inApp) {
    const slug = (m.category as any)?.slug ?? 'other'
    const name = (m.category as any)?.name_it ?? slug
    const icon = (m.category as any)?.icon ?? '📋'
    if (!byCategory[slug]) byCategory[slug] = { name, icon, count: 0, total: 0 }
    byCategory[slug].count++
    byCategory[slug].total += m.price_agreed ?? 0
  }

  // Carica profilo per stats generali
  const { data: profile } = await admin.from('profiles_provider')
    .select('avg_rating, trust_score, completed_missions')
    .eq('user_id', auth.userId).single()

  return ok({
    period,
    summary: {
      total_earned: totalEarned,
      total_external: totalExternal,
      total_missions: all.length,
      paid_missions: inApp.length,
      avg_per_mission: Math.round(avgPerMission * 100) / 100,
      avg_rating: profile?.avg_rating ?? null,
      trust_score: profile?.trust_score ?? 0,
    },
    by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
    missions: all.slice(0, 20), // ultime 20
  })
})
