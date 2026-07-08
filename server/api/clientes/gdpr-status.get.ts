/**
 * GET /api/clientes/gdpr-status — Check if a phone number has accepted GDPR
 *
 * Used by the reservation form to skip the GDPR step for returning customers.
 * Public endpoint — no auth required.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { normalizePhone } from '#shared/utils/phone'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const phone = query.phone as string

  if (!phone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parámetro phone requerido',
    })
  }

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato de teléfono no válido',
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: cliente } = await supabase
    .from('clientes')
    .select('gdpr_aceptado')
    .eq('telefono', normalizedPhone)
    .maybeSingle()

  return {
    gdpr_aceptado: cliente?.gdpr_aceptado ?? false,
  }
})
