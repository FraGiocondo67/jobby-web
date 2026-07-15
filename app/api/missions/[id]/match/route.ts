import { NextRequest } from 'next/server'
import { authHandler, getMission, ok, apiError } from '@/lib/api'

// POST /api/missions/[id]/match — cerca fornitori vicini
export const POST = authHandler(async (req, auth, ctx) => {
  const mission = await getMission(ctx!.params.id, auth.userId)
  if (mission.client_id !== auth.userId)
    throw apiError('Solo il cliente può cercare fornitori', 403)
  if (!['published', 'matched'].includes(mission.status))
    throw apiError('La missione non è in uno stato valido per il matching')

  // Proxy verso Netlify Function esistente che usa PostGIS
  const authHeader = req.headers.get('authorization') ?? ''
  const res = await fetch(
    `https://jobby-platform-app.netlify.app/api/missions/match?mission_id=${ctx!.params.id}&radius_km=50`,
    { headers: { Authorization: authHeader } }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
})
