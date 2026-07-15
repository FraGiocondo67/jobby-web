import { NextRequest } from 'next/server'
import { authHandler, getAdmin, parseBody, requireField, created, apiError, notify } from '@/lib/api'

// POST /api/proximity/order — crea ordine diretto a esercizio
export const POST = authHandler(async (req, auth) => {
  if (auth.role !== 'client' && auth.role !== 'both')
    throw apiError('Solo i clienti possono inviare ordini', 403)

  const body = await parseBody(req)
  const businessId = requireField<string>(body, 'business_id')
  const categorySlug = requireField<string>(body, 'category_slug')
  const description = requireField<string>(body, 'description')
  const deliveryType = (body.delivery_type as string) ?? 'pickup' // delivery | pickup
  const deliveryAddress = body.delivery_address as string | undefined
  const latitude = body.latitude as number | undefined
  const longitude = body.longitude as number | undefined
  // Fallback se il client non invia coordinate (stesso default usato in client/map)
  const locationWkt = `POINT(${longitude ?? 12.2417} ${latitude ?? 45.6667})`

  if (deliveryType === 'delivery' && !deliveryAddress)
    throw apiError('Indirizzo di consegna obbligatorio per la modalità domicilio')

  const admin = getAdmin()

  // Verifica che il business esista e sia prossimità
  const { data: business } = await admin.from('profiles_provider')
    .select('user_id, business_data, skills')
    .eq('user_id', businessId)
    .eq('is_proximity_business', true)
    .single()
  if (!business) throw apiError('Esercizio non trovato', 404)

  // Trova category_id
  const { data: cat } = await admin.from('service_categories')
    .select('id, name_it').eq('slug', categorySlug).maybeSingle()

  // Data default: domani mezzogiorno
  const defaultDate = new Date()
  defaultDate.setDate(defaultDate.getDate() + 1)
  defaultDate.setHours(12, 0, 0, 0)

  const bd = business.business_data ?? {}
  const title = `${cat?.name_it ?? categorySlug} — ${description.slice(0, 50)}`

  const { data: mission, error } = await admin.from('missions').insert({
    client_id: auth.userId,
    provider_id: businessId,
    category_id: cat?.id ?? null,
    title,
    description: [
      description,
      `Modalità: ${deliveryType === 'delivery' ? `A domicilio — ${deliveryAddress}` : 'Ritiro in sede'}`,
      body.when ? `Quando: ${body.when}` : '',
    ].filter(Boolean).join('\n'),
    address: deliveryType === 'delivery' ? deliveryAddress! : bd.business_address ?? '',
    scheduled_at: defaultDate.toISOString(),
    duration_hours: 1,
    price_agreed: 0,
    status: 'matched',
    payment_status: 'pending',
    location: locationWkt,
  }).select('id, title, status').single()

  if (error) throw apiError('Errore creazione ordine', 500, error.message)

  // Carica nome cliente per notifica
  const { data: client } = await admin.from('users')
    .select('full_name').eq('id', auth.userId).single()

  await notify(
    businessId, 'new_proximity_order',
    `📦 Nuovo ordine da ${client?.full_name ?? 'un cliente'}`,
    title,
    { mission_id: mission.id }
  )

  return created({ mission, message: 'Ordine inviato! L\'esercizio risponderà a breve.' })
})
