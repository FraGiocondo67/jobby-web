import { NextRequest } from 'next/server'
import { verifyAuth, ok, err } from '@/lib/supabase-server'

// Proxy verso Netlify Function missions/match
export async function GET(req: NextRequest) {
  const { jobbyUser, error, user } = await verifyAuth(req)
  if (error || !jobbyUser) return err('Non autenticato', 401)

  const { searchParams } = new URL(req.url)
  const missionId = searchParams.get('mission_id')
  const radiusKm = searchParams.get('radius_km') ?? '50'
  if (!missionId) return err('mission_id obbligatorio')

  const authHeader = req.headers.get('authorization') ?? ''
  const res = await fetch(
    `https://jobby-platform-app.netlify.app/api/missions/match?mission_id=${missionId}&radius_km=${radiusKm}`,
    { headers: { Authorization: authHeader } }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
