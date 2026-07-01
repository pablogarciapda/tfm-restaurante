/**
 * GET /api/cocina/usuarios/list — List Users (USR-001, USR-006)
 *
 * Joins auth.users with profiles for admin user management table.
 * Uses serverSupabaseServiceRole (AD-10).
 */
import { handleListUsers } from './handlers'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleListUsers(supabase)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
