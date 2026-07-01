/**
 * POST /api/cocina/usuarios/reset-password — Reset Password (USR-005)
 *
 * Generates a Supabase recovery link via service role admin API.
 * The link is returned in response for admin to share manually.
 * Body: { email }
 */
import { handleResetPassword } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleResetPassword(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
