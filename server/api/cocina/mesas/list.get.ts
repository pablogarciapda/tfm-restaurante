/**
 * GET /api/cocina/mesas/list — List all mesas (MCA-003)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Returns array of Mesa objects ordered by numero_mesa.
 */
import { handleListMesas } from './handlers'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleListMesas(supabase)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
