/**
 * GET /api/canvas/original?zona=Principal
 *
 * Returns the original design for a specific zone.
 * Handles both keyed object {"Principal": [...]} and legacy flat array [...] formats.
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { resolveZone } from '#shared/utils/zone-resolver'

/** Normalize diseno_original to a keyed object, migrating flat arrays if needed. */
function normalizeDesigns(raw: unknown): Record<string, unknown[]> {
  if (!raw || typeof raw !== 'object') return {}
  if (!Array.isArray(raw)) return raw as Record<string, unknown[]>
  const arr = raw as Array<{ zona?: string }>
  const zona = arr[0]?.zona || 'Principal'
  return { [zona]: arr }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const query = getQuery(event)
  const zona = query.zona as string | undefined
  const zonaId = query.zona_id as string | undefined
  if (!zona && !zonaId) throw createError({ statusCode: 400, statusMessage: 'Se requiere zona_id/zona' })

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase.from('configuracion').select('diseno_original, zonas_config').limit(1).single()
  if (error) throw createError({ statusCode: 500, statusMessage: `Error: ${error.message}` })

  const allDesigns = normalizeDesigns(data?.diseno_original)
  const zone = resolveZone(zonaId ?? zona, (data?.zonas_config as any[]) ?? [], { requireEnabled: false })
  if (!zone) throw createError({ statusCode: 400, statusMessage: 'Zona no válida' })
  const positions = (allDesigns[zone.id] || allDesigns[zone.nombre] || []) as unknown[]

  return {
    exists: Array.isArray(positions) && positions.length > 0,
    count: Array.isArray(positions) ? positions.length : 0,
    zona_id: zone.id,
    zona: zone.nombre,
    positions,
  }
})
