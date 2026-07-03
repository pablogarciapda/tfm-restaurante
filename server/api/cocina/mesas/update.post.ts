/**
 * POST /api/cocina/mesas/update — Update a mesa (MCA-003)
 */
import { handleUpdateMesa } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleUpdateMesa(supabase, body || {})

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
