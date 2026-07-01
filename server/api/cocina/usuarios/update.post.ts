/**
 * POST /api/cocina/usuarios/update — Update User Role + Permissions (USR-003)
 *
 * Updates profile.role and profile.permissions via service role.
 * Body: { id, role?, permissions? }
 */
import { handleUpdateUser } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleUpdateUser(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
