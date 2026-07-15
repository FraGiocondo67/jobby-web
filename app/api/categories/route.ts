import { authHandler, getAdmin, ok } from '@/lib/api'

// GET /api/categories — categorie di servizio attive (standard + proximity),
// ciascuna con il proprio questionario dinamico (`questions`).
// Fonte unica di verità: tabella `service_categories` (gestita da JOBBY Admin/Retool).
export const GET = authHandler(async (_req, _auth) => {
  const admin = getAdmin()
  const { data, error } = await admin
    .from('service_categories')
    .select('id, slug, name_it, name_en, icon, category_type, requires_kyc, questions')
    .eq('is_active', true)
    .order('category_type', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name_en', { ascending: true })

  if (error) throw error

  return ok({ categories: data ?? [] })
})
