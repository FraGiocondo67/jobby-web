import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://axiemfglsjknecvwtypm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aWVtZmdsc2prbmVjdnd0eXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzAyODMsImV4cCI6MjA5ODI0NjI4M30.Epb6SeqJSwVFoq3YOu0g2GFS4-sjpm_JQrUmFmIGBt8'

// Client-side Supabase instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const API_BASE = 'https://jobby-platform-app.netlify.app/api'

// Helper: ottieni il token della sessione corrente
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const now = Math.floor(Date.now() / 1000)
  if ((session.expires_at ?? 0) - now < 300) {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  }
  return session.access_token
}

// Helper: chiamata API autenticata
export async function apiCall(path: string, method = 'GET', body?: unknown) {
  const token = await getAccessToken()
  if (!token) throw new Error('Sessione scaduta')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || `Errore API ${path}`)
  return json
}

// Tipi base
export type UserRole = 'client' | 'provider' | 'both'

export interface JobbyUser {
  id: string
  auth_id?: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  status: string
  trust_score?: number
  avatar_url?: string | null
  preferred_lang?: string
}

export interface Mission {
  id: string
  title: string
  status: string
  price_agreed?: number
  scheduled_at?: string
  address?: string
  category?: { slug: string; name_it: string; icon: string }
  client?: { id: string; full_name: string }
  provider?: { id: string; full_name: string }
}

export interface Message {
  id: string
  mission_id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at?: string
}
