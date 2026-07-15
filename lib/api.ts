import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── CLIENTS ──────────────────────────────────────────────────────────────────

export function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// ── TYPES ────────────────────────────────────────────────────────────────────

export interface AuthContext {
  authId: string
  userId: string
  role: 'client' | 'provider' | 'both'
  status: string
}

// ── ERROR CLASS ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number = 400,
    public readonly detail?: string,
  ) { super(message) }
}

export function apiError(message: string, status = 400, detail?: string): ApiError {
  return new ApiError(message, status, detail)
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) throw apiError('Token mancante', 401)
  const token = authHeader.slice(7)
  const { data: { user }, error } = await getAnonClient().auth.getUser(token)
  if (error || !user) throw apiError('Token non valido o scaduto', 401)
  const admin = getAdmin()
  const { data: jobbyUser, error: userErr } = await admin
    .from('users').select('id, role, status').eq('auth_id', user.id).single()
  if (userErr || !jobbyUser) throw apiError('Utente non trovato', 404)
  return { authId: user.id, userId: jobbyUser.id, role: jobbyUser.role, status: jobbyUser.status }
}

// ── RESPONSES ─────────────────────────────────────────────────────────────────

export function ok(data: Record<string, unknown> = {}, status = 200) {
  return Response.json({ success: true, ...data }, { status })
}

export function created(data: Record<string, unknown> = {}) {
  return ok(data, 201)
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { success: false, error: err.message, ...(err.detail ? { detail: err.detail } : {}) },
      { status: err.status },
    )
  }
  console.error('[API Error]', err)
  return Response.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
}

// ── HANDLER WRAPPERS ──────────────────────────────────────────────────────────

export function handler(
  fn: (req: NextRequest, ctx?: any) => Promise<Response>
) {
  return async (req: NextRequest, ctx?: any): Promise<Response> => {
    try { return await fn(req, ctx) } catch (err) { return errorResponse(err) }
  }
}

export function authHandler(
  fn: (req: NextRequest, auth: AuthContext, ctx?: any) => Promise<Response>
) {
  return handler(async (req, ctx) => {
    const auth = await requireAuth(req)
    return fn(req, auth, ctx)
  })
}

// ── VALIDATION ────────────────────────────────────────────────────────────────

export async function parseBody(req: NextRequest): Promise<Record<string, any>> {
  return req.json().catch(() => { throw apiError('Body JSON non valido') })
}

export function requireField<T>(obj: Record<string, any>, field: string): T {
  const val = obj[field]
  if (val === undefined || val === null || val === '')
    throw apiError(`Campo obbligatorio mancante: ${field}`)
  return val as T
}

// ── DB HELPERS ────────────────────────────────────────────────────────────────

export async function getMission(missionId: string, userId?: string) {
  const admin = getAdmin()
  const { data, error } = await admin
    .from('missions')
    .select(`
      id, title, status, price_agreed, scheduled_at, address, description,
      client_id, provider_id, payment_outside_platform, duration_hours,
      checkin_at, checkout_at, confirmed_at, created_at,
      category:service_categories(id, slug, name_it, icon, category_type),
      client:users!missions_client_id_fkey(id, full_name, phone),
      provider:users!missions_provider_id_fkey(id, full_name, phone)
    `)
    .eq('id', missionId)
    .single()
  if (error || !data) throw apiError('Missione non trovata', 404)
  if (userId && data.client_id !== userId && data.provider_id !== userId)
    throw apiError('Non autorizzato', 403)
  return data
}

export async function notify(
  userId: string, type: string, title: string, body: string,
  data: Record<string, unknown> = {},
) {
  await getAdmin().from('notifications').insert({ user_id: userId, type, title, body, data })
}

// Alias per compatibilità con route create in sessioni diverse
export const err = apiError

export function parsePagination(searchParams: Record<string, string>) {
  const limit = Math.min(parseInt(searchParams.limit ?? '20'), 100)
  const offset = parseInt(searchParams.offset ?? '0')
  return { limit, offset }
}

export async function sendNotification(userId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  return notify(userId, type, title, body, data)
}
