/**
 * POST /api/cocina/mesas/delete — Delete a mesa (MCA-003)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Body: { id }
 * Clears fusion children before deleting parent (AD-12).
 * Returns 200 on success.
 */
import { handleDeleteMesa } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleDeleteMesa(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  setResponseStatus(event, result.status)
  return result.body
})
