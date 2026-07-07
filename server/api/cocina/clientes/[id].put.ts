/**
 * PUT /api/cocina/clientes/[id] — Update a cliente (CLI-003)
 */
import { handleUpdateCliente } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)

  const result = await handleUpdateCliente(supabase, id || '', body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
