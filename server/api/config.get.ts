/**
 * GET /api/config — Read all config EXCEPT smtp_password
 *
 * ADMIN ONLY: requires authenticated user session.
 */
import { handleGetConfig } from './config.handlers'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth gate — only authenticated admins can read full config
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Se requiere autenticación',
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const result = await handleGetConfig(supabase)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
