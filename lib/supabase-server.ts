import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const SUPABASE_URL = 'https://axiemfglsjknecvwtypm.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aWVtZmdsc2prbmVjdnd0eXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzAyODMsImV4cCI6MjA5ODI0NjI4M30.Epb6SeqJSwVFoq3YOu0g2GFS4-sjpm_JQrUmFmIGBt8'

// Admin client (bypassa RLS) — usato solo nelle API routes server-side
export function getAdminClient() {
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Verifica il token JWT e restituisce l'utente
export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Token mancante', user: null, jobbyUser: null }
  }
  const token = authHeader.slice(7)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return { error: 'Token non valido', user: null, jobbyUser: null }

  const admin = getAdminClient()
  const { data: jobbyUser } = await admin.from('users').select('id, role, status').eq('auth_id', user.id).single()
  return { user, jobbyUser, error: null }
}

export function ok(data: unknown, status = 200) {
  return Response.json({ success: true, ...data }, { status })
}

export function err(message: string, status = 400, detail?: string) {
  return Response.json({ success: false, error: message, ...(detail ? { detail } : {}) }, { status })
}
