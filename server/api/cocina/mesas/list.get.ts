/**
 * GET /api/cocina/mesas/list — List all mesas
 */
import { handleListMesas, type SupabaseAdminClient } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event) as unknown as SupabaseAdminClient
  const result = await handleListMesas(supabase)

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
