/**
 * POST /api/canvas/save-original
 *
 * Saves the current mesa positions for the active zone as part of the
 * "original design" snapshot in configuracion.diseno_original.
 * Each zone is stored independently under its own key.
 *
 * Body: { zona: string, positions: [{ mesa_id, posicion_x, posicion_y, rotacion, ... }] }
 *
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { resolveZone } from '#shared/utils/zone-resolver'

/** Normalize diseno_original to a keyed object, migrating flat arrays if needed. */
function normalizeDesigns(raw: unknown): Record<string, unknown[]> {
  if (!raw || typeof raw !== 'object') return {}
  // Already an object with zone keys → return as-is
  if (!Array.isArray(raw)) return raw as Record<string, unknown[]>
  // Flat array from old format → migrate to keyed object using zone from first entry
  const arr = raw as Array<{ zona?: string }>
  const zona = arr[0]?.zona || 'Principal'
  return { [zona]: arr }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  if (!(body?.zona_id || body?.zona) || !Array.isArray(body.positions)) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere zona_id/zona y positions[]' })
  }

  const { data: config } = await supabase.from('configuracion').select('id, diseno_original, zonas_config').limit(1).single()
  if (!config) throw createError({ statusCode: 500, statusMessage: 'No se encontró la configuración' })
  const zone = resolveZone(body.zona_id ?? body.zona, (config.zonas_config as any[]) ?? [])
  if (!zone) throw createError({ statusCode: 400, statusMessage: 'Zona no válida o no habilitada' })

  // Normalize: handles both { "Principal": [...] } and flat [...] formats
  const allDesigns = normalizeDesigns(config.diseno_original)
  allDesigns[zone.id] = body.positions

  const { error } = await supabase
    .from('configuracion')
    .update({ diseno_original: allDesigns as any })
    .eq('id', config.id)

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })

  return { success: true, zona_id: zone.id, zona: zone.nombre, count: body.positions.length }
})
