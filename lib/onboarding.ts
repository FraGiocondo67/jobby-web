'use client'
import { supabase, getAccessToken } from './supabase'

// BLOCCO 7c (jobby-web -> client puro): signup client-side come l'app mobile
// (decisione utente) invece del vecchio POST /api/auth/register basato su
// Admin API di Supabase. Il progetto ha la conferma email attiva (verificato
// sui dati reali: `email_confirmed_at` è sempre null al momento della
// creazione, valorizzato solo più tardi) — quindi `supabase.auth.signUp()`
// NON restituisce quasi mai una sessione attiva subito. Il completamento
// onboarding (POST /onboarding/complete, che serve un token) va quindi
// rimandato al primo login riuscito, quando finalmente c'è una sessione.
//
// Per portare i dati del form da qui a quel momento, li salviamo in
// `user_metadata.onboarding` al momento della signUp() — l'unico posto
// disponibile prima che esista una sessione — e li consumiamo (poi puliamo)
// alla primissima chiamata di completeOnboardingFromMetadata() che trova una
// sessione valida, tipicamente lanciata da login/page.tsx dopo il signIn.

// Client-side: usa NEXT_PUBLIC_ perché questo file gira nel browser (a
// differenza di lib/api.ts, che gira solo lato server nelle Route Handler).
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://jobby-backend-a2s1.onrender.com').replace(/\/$/, '')

export type OnboardingMeta = {
  role: 'client' | 'provider' | 'both'
  name?: string
  phone?: string
  address?: string
  radius_km?: number
  services?: string[]
  business_name?: string
  vat_number?: string
  service_mode?: string
  products?: string[]
  lat?: number
  lng?: number
}

/** Se l'utente loggato ha ancora dati di onboarding "in sospeso" in
 * user_metadata (salvati alla registrazione, mai applicati perché la
 * sessione non c'era ancora), li manda a POST /onboarding/complete e li
 * ripulisce. Ritorna il ruolo risultante se ha fatto qualcosa, altrimenti
 * null (nessun onboarding pendente, o già completato in passato). */
export async function completeOnboardingFromMetadata(): Promise<{ role: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  const meta = (user?.user_metadata as any)?.onboarding as OnboardingMeta | undefined
  if (!meta?.role) return null

  const token = await getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${BACKEND_URL}/api/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(meta),
    })
    if (!res.ok) return null
    const result = await res.json().catch(() => null)

    // Non servono più: un domani cambio di ruolo passerà da un flusso
    // dedicato (upgrade), non da un residuo di questa registrazione — se
    // restasse lì, un login successivo lo riapplicherebbe di nuovo,
    // rischiando di riportare indietro un ruolo cambiato nel frattempo.
    // Manda sia il resto dei metadata sia `onboarding: null` esplicito:
    // corretto sia che updateUser() faccia merge sia che sostituisca del
    // tutto user_metadata (comportamento non verificabile da questo
    // ambiente) — in entrambi i casi full_name resta e onboarding sparisce.
    const { onboarding: _drop, ...restMeta } = (user?.user_metadata as any) ?? {}
    await supabase.auth.updateUser({ data: { ...restMeta, onboarding: null } })

    return result?.user ? { role: result.user.role as string } : null
  } catch {
    return null
  }
}
