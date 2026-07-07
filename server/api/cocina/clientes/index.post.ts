/**
 * POST /api/cocina/clientes — Create a new cliente (CLI-002)
 */
import { handleCreateCliente } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)

  const result = await handleCreateCliente(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  setResponseStatus(event, result.status)
  return result.body
})
