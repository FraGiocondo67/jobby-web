# JOBBY Web API — Documentazione

Base URL: `http://localhost:3000/api` (dev) | `https://jobby-web.netlify.app/api` (prod)

## Autenticazione
Tutte le route protette richiedono header:
```
Authorization: Bearer <supabase_access_token>
```

---

## AUTH

### GET /api/auth/me
Utente corrente con profili cliente/fornitore.

### POST /api/auth/register
```json
{
  "email": "string",
  "password": "string (min 8)",
  "full_name": "string",
  "role": "client | provider | both",
  "phone": "string (opzionale)",
  "is_proximity_business": false,
  "business_data": { ... } // se is_proximity_business=true
}
```

---

## MISSIONS

### GET /api/missions
Query params: `role`, `status`, `limit`, `offset`

### POST /api/missions
```json
{
  "title": "string",
  "address": "string",
  "scheduled_at": "ISO datetime",
  "category_slug": "housekeeping",
  "description": "string (opzionale)",
  "price_agreed": 50,
  "provider_id": "uuid (opzionale, per richiesta diretta)"
}
```

### GET /api/missions/[id]
### PATCH /api/missions/[id]
Campi modificabili: `title`, `description`, `address`, `price_agreed`, `scheduled_at`

### DELETE /api/missions/[id]
Cancella (solo published o matched)

### POST /api/missions/[id]/match
Cerca fornitori vicini (proxy → Netlify PostGIS)

### POST /api/missions/[id]/accept
Provider accetta la missione (matched → confirmed)

### POST /api/missions/[id]/checkin
Provider fa check-in (confirmed → in_progress)

### POST /api/missions/[id]/checkout
```json
{
  "payment_outside_platform": false,
  "price_agreed": 75.00
}
```
(in_progress → completed)

### POST /api/missions/[id]/review
```json
{
  "rating": 5,
  "comment": "Ottimo servizio",
  "reviewer_type": "client | provider"
}
```

---

## PROVIDERS

### GET /api/providers
Query params: `category`, `proximity=true`, `limit`

### GET /api/providers/[id]
Profilo pubblico + ultime 5 recensioni

### PATCH /api/providers/availability
```json
{ "status": "online | offline | busy" }
```

---

## PROXIMITY

### GET /api/proximity?category=laundry
Lista esercizi per categoria

### POST /api/proximity/order
```json
{
  "business_id": "uuid",
  "category_slug": "laundry",
  "description": "Lavaggio 3 camicie",
  "delivery_type": "delivery | pickup",
  "delivery_address": "Via Roma 10",
  "when": "Domani mattina"
}
```

---

## CHAT

### GET /api/chat/[missionId]
Carica messaggi + info conversazione. Segna automaticamente come letti.
Query params: `limit`, `before` (ISO datetime, per paginazione)

### POST /api/chat/[missionId]
```json
{ "content": "Ciao, quando arrivi?" }
```

---

## NOTIFICATIONS

### GET /api/notifications
Query params: `limit`, `unread=true`
Risposta include `unread_count`

### PATCH /api/notifications
```json
{ "id": "uuid" }    // segna una notifica
// oppure body vuoto → segna tutte come lette
```

### DELETE /api/notifications
```json
{ "id": "uuid" }
```

---

## PROFILE

### GET /api/profile
Profilo completo: user + clientProfile + providerProfile

### PATCH /api/profile
Campi users: `full_name`, `phone`, `preferred_lang`
Campi client: `address`, `search_radius_km`, `preferred_categories`
Campi provider: `bio`, `hourly_rate`, `skills`, `operational_radius_km`, `availability_status`, `payout_details`, `business_data`

---

## EARNINGS

### GET /api/profile/earnings?period=month
Period: `week | month | year | all`
Risposta: `summary`, `by_category[]`, `missions[]` (ultime 20)

---

## REVIEWS

### GET /api/reviews?user_id=X
Query params: `user_id`, `reviewer_type=client|provider`, `limit`
