/**
 * GET /api/canvas/original?zona=Principal
 *
 * Returns the original design for a specific zone.
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const zona = getQuery(event).zona as string
  if (!zona) throw createError({ statusCode: 400, statusMessage: 'Se requiere zona' })

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase.from('configuracion').select('diseno_original').limit(1).single()
  if (error) throw createError({ statusCode: 500, statusMessage: `Error: ${error.message}` })

  const allDesigns = (data?.diseno_original || {}) as Record<string, unknown>
  const positions = (allDesigns[zona] || []) as unknown[]

  return {
    exists: Array.isArray(positions) && positions.length > 0,
    count: Array.isArray(positions) ? positions.length : 0,
    zona,
    positions,
  }
})
