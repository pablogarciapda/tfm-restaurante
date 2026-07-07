/**
 * POST /api/reservas — Create a reservation (rewritten, real Supabase)
 *
 * Validates body, normalizes phone, upserts cliente by phone,
 * creates reserva with modo_reserva branching, fire-and-forget email.
 */
import { handleCreateReservation } from './reservas.handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const result = await handleCreateReservation(supabase, body || {}, runtimeConfig)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: (result.body.errors as string[])?.join?.(', ') || (result.body.error as string),
    })
  }

  return result.body
})
