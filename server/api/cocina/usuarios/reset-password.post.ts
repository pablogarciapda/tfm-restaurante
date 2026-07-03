/**
 * POST /api/cocina/usuarios/reset-password — Reset password (USR-005)
 */
import { handleResetPassword } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

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

  setResponseStatus(event, result.status)
  return result.body
})
