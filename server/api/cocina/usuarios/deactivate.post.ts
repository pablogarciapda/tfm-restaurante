/**
 * POST /api/cocina/usuarios/deactivate — Deactivate User (USR-004)
 *
 * Sets profiles.activo = false (soft delete). Auth user NOT deleted.
 * Body: { id }
 */
import { handleDeactivateUser } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleDeactivateUser(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
