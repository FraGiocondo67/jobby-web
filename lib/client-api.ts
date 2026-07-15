/**
 * JOBBY Web — Client API Hook
 * Tutte le chiamate al backend Next.js passano da qui.
 * Gestisce token, errori e tipizzazione.
 */
import { supabase } from './supabase'

const BASE = '' // stesso origin (Next.js API routes)

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const now = Math.floor(Date.now() / 1000)
  if ((session.expires_at ?? 0) - now < 300) {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  }
  return session.access_token
}

async function call<T = unknown>(
  path: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  // Sessione scaduta/non valida (es. refresh token invalidato da un'altra
  // scheda) — invece di lasciare l'utente davanti a un errore muto, forziamo
  // il logout e lo rimandiamo al login per una sessione fresca.
  if (res.status === 401) {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Sessione scaduta, effettua di nuovo il login')
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json as T
}

// ── Missions ────────────────────────────────────────────────

export const Missions = {
  list: (params: {
    role?: string; status?: string; statuses?: string[];
    page?: number; limit?: number
  } = {}) => {
    const q = new URLSearchParams()
    if (params.role) q.set('role', params.role)
    if (params.status) q.set('status', params.status)
    if (params.statuses?.length) q.set('statuses', params.statuses.join(','))
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    return call<any>(`/api/missions?${q}`)
  },

  create: (data: {
    category_slug?: string; title: string; description?: string;
    address: string; price_agreed?: number; scheduled_at: string;
    duration_hours?: number; provider_id?: string;
  }) => call<any>('/api/missions/create', 'POST', data),

  // Il fornitore accetta una missione assegnata direttamente (prossimità o
  // ordine diretto, Fase 4). priceAgreed opzionale: prezzo indicativo.
  accept: (missionId: string, priceAgreed?: number) =>
    call<any>(`/api/missions/${missionId}/accept`, 'POST', { price_agreed: priceAgreed }),

  // Il fornitore rifiuta una missione assegnata direttamente: torna "published".
  reject: (missionId: string) =>
    call<any>(`/api/missions/${missionId}/reject`, 'POST'),

  checkin: (missionId: string) =>
    call<any>(`/api/missions/${missionId}/checkin`, 'POST'),

  checkout: (missionId: string, paymentOutside = false, priceAgreed?: number) =>
    call<any>(`/api/missions/${missionId}/checkout`, 'POST', {
      payment_outside_platform: paymentOutside,
      price_agreed: priceAgreed,
    }),

  // Il cliente cancella una missione propria (published/matched).
  cancel: (missionId: string) =>
    call<any>(`/api/missions/${missionId}`, 'DELETE'),

  // Il cliente conferma il fornitore proposto dal matching (flusso "richiesta aperta").
  confirmProvider: (missionId: string) =>
    call<any>(`/api/missions/${missionId}/confirm-provider`, 'POST'),

  // Il cliente rifiuta il fornitore proposto: la missione resta "matched" senza provider_id.
  rejectProvider: (missionId: string) =>
    call<any>(`/api/missions/${missionId}/reject-provider`, 'POST'),

  // Il cliente recensisce il fornitore.
  review: (missionId: string, rating: number, comment?: string) =>
    call<any>(`/api/missions/${missionId}/review`, 'POST', { rating, comment, reviewer_type: 'client' }),

  // Il fornitore recensisce il cliente (stesso endpoint, reviewer_type diverso).
  reviewClient: (missionId: string, rating: number, comment?: string) =>
    call<any>(`/api/missions/${missionId}/review`, 'POST', { rating, comment, reviewer_type: 'provider' }),

  // Il cliente aggiorna il prezzo concordato (solo missioni published/matched).
  updatePrice: (missionId: string, price: number) =>
    call<any>(`/api/missions/${missionId}`, 'PATCH', { price_agreed: price }),

  match: (missionId: string, radiusKm = 50) =>
    call<any>(`/api/missions/match?mission_id=${missionId}&radius_km=${radiusKm}`),
}

// ── Claims ────────────────────────────────────────────────────

export const Claims = {
  create: (data: { mission_id: string; reason: string; description?: string }) =>
    call<any>('/api/claims/create', 'POST', data),
}

// ── Notifications ───────────────────────────────────────────

export const Notifications = {
  list: (params: { unread?: boolean; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.unread) q.set('unread', 'true')
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    return call<any>(`/api/notifications?${q}`)
  },

  markRead: (ids: string[]) =>
    call<any>('/api/notifications', 'PATCH', { ids }),

  markAllRead: () =>
    call<any>('/api/notifications', 'PATCH', { all: true }),
}

// ── Chat ────────────────────────────────────────────────────

export const Chat = {
  history: (missionId: string, page = 1) =>
    call<any>(`/api/chat/${missionId}?page=${page}`),

  send: (missionId: string, content: string) =>
    call<any>(`/api/chat/${missionId}`, 'POST', { content }),
}

// ── Profile ─────────────────────────────────────────────────

export const Profile = {
  get: () => call<any>('/api/profile'),

  update: (data: {
    full_name?: string; phone?: string; preferred_lang?: string;
    // Cliente
    address?: string; search_radius_km?: number; preferred_categories?: string[];
    // Fornitore
    bio?: string; hourly_rate?: number; skills?: string[];
    operational_radius_km?: number; availability_status?: string;
    payout_details?: unknown; business_data?: unknown;
  }) => call<any>('/api/profile', 'PATCH', data),
}

// ── Providers ───────────────────────────────────────────────

export const Providers = {
  list: (params: {
    lat?: number; lng?: number; radius_km?: number;
    category?: string; proximity?: boolean; online?: boolean;
  } = {}) => {
    const q = new URLSearchParams()
    if (params.lat) q.set('lat', String(params.lat))
    if (params.lng) q.set('lng', String(params.lng))
    if (params.radius_km) q.set('radius_km', String(params.radius_km))
    if (params.category) q.set('category', params.category)
    if (params.proximity !== undefined) q.set('proximity', String(params.proximity))
    if (params.online !== undefined) q.set('online', String(params.online))
    return call<any>(`/api/providers?${q}`)
  },

  earnings: () => call<any>('/api/providers/earnings'),

  setStatus: (status: 'online' | 'offline' | 'busy') =>
    call<any>('/api/providers/status', 'PATCH', { status }),
}

// ── Business ────────────────────────────────────────────────

export const Business = {
  orders: (params: { status?: string; statuses?: string[]; page?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.statuses?.length) q.set('statuses', params.statuses.join(','))
    if (params.page) q.set('page', String(params.page))
    return call<any>(`/api/business/orders?${q}`)
  },

  earnings: () => call<any>('/api/business/earnings'),
}
