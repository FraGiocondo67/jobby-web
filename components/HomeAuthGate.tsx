'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Renderizza null: gira in background sulla Home pubblica (app/page.tsx).
// Se l'utente ha già una sessione attiva, lo porta subito alla sua area
// (client / provider / select-role per i "both") invece di lasciarlo
// sulla landing di marketing.
export default function HomeAuthGate() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session) return

      const { data: u } = await supabase.from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single()

      if (cancelled || !u) return

      if (u.role === 'client') router.replace('/client')
      else if (u.role === 'provider') router.replace('/provider')
      else if (u.role === 'both') router.replace('/select-role')
    })

    return () => { cancelled = true }
  }, [router])

  return null
}
