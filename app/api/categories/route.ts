import { authHandler, backendFetch, ok } from '@/lib/api'

// GET /api/categories — categorie di servizio attive (standard + proximity).
// BLOCCO 7b (jobby-web -> client puro): prima leggeva `service_categories`
// direttamente via Supabase; ora proxy verso il nuovo GET /categories del
// backend condiviso (stessi campi esatti, stesso ordinamento).
export const GET = authHandler(async (_req, auth) => {
  const data = await backendFetch<{ categories: any[] }>('/categories', auth.token)
  return ok({ categories: data.categories ?? [] })
})
