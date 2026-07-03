/**
 * POST /api/cocina/usuarios/update — Update user role + permissions (USR-003)
 */
import { handleUpdateUser } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

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

  setResponseStatus(event, result.status)
  return result.body
})
