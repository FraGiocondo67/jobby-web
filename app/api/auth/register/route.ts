/* RITIRATA nel Blocco 7c (migrazione Emergent -> Supabase/Render), su
 * conferma esplicita dell'utente. Sostituita dalla registrazione client-side
 * via supabase.auth.signUp() in app/(auth)/register/page.tsx (vedi
 * lib/onboarding.ts) — stesso schema già in uso dall'app mobile, con
 * conferma email nativa di Supabase invece della creazione via Admin API
 * usata qui (email_confirm: false, nessuna verifica reale).
 *
 * Confermato via grep che nessun punto vivo del codice la chiama più (solo
 * riferimenti nei tipi generati da Next.js e nel commento di lib/onboarding.ts
 * che ne spiega la sostituzione). A differenza di upgrade-role/route.ts —
 * ancora agganciata al bottone "Diventa anche Fornitore/Cliente" nei profili
 * client/provider/business — questa route non ha più alcun chiamante reale,
 * né in jobby-web né (per quanto verificabile da qui) in jobby-clean.
 *
 * Il file resta nel repo come riferimento storico ma la route ora risponde
 * 410 Gone invece di eseguire la vecchia logica basata su Admin API.
 */
import { handler, apiError } from '@/lib/api'

export const POST = handler(async () => {
  throw apiError(
    'Questa route è stata ritirata (Blocco 7c). Usa la registrazione client-side (supabase.auth.signUp) da app/(auth)/register/page.tsx.',
    410
  )
})
