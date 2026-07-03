/**
 * GET /api/cocina/usuarios/list — List Users (USR-001, USR-006)
 */
import { handleListUsers, type SupabaseAdminClient } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event) as unknown as SupabaseAdminClient
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
