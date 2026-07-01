/**
 * POST /api/cocina/usuarios/create — Create User (USR-002)
 *
 * Uses serverSupabaseServiceRole (AD-10) to call Supabase Admin API.
 * Body: { email, password, role? }
 * Returns 201 on success, 400/409/500 on error.
 */
import { handleCreateUser } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleCreateUser(supabase, body || {})

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
