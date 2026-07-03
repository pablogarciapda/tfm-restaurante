/**
 * POST /api/cocina/usuarios/deactivate — Deactivate a user (USR-004)
 */
import { handleDeactivateUser, type SupabaseAdminClient } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event) as unknown as SupabaseAdminClient
  const result = await handleDeactivateUser(supabase, body || {})

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
