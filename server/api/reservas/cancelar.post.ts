/**
 * POST /api/reservas/cancelar — Cancel a reservation by token
 *
 * Public endpoint (no auth required). Uses serverSupabaseServiceRole
 * to bypass RLS. Delegates to handleCancelReservation for business logic.
 *
 * Rate limited: 5 requests per IP per minute.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { handleCancelReservation } from '../reservas.handlers'
import { checkRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  // Rate limiting
  const ip = getRequestIP(event) || 'unknown'
  const rateKey = `cancel:${ip}`
  if (!checkRateLimit(rateKey, 5, 60_000)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.',
    })
  }

  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const result = await handleCancelReservation(supabase, body || {}, runtimeConfig)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
    })
  }

  return result.body
})
