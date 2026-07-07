/**
 * GET /api/cocina/clientes — List/search clientes (CLI-001)
 */
import { handleListClientes } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const search = query.search as string | undefined

  const result = await handleListClientes(supabase, search)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
