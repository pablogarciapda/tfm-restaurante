/**
 * GET /api/canvas/original
 *
 * Returns the original design snapshot if one exists.
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('configuracion')
    .select('diseno_original')
    .limit(1)
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error: ${error.message}` })
  }

  return {
    exists: !!data?.diseno_original,
    count: Array.isArray(data?.diseno_original) ? data.diseno_original.length : 0,
    positions: data?.diseno_original ?? [],
  }
})
