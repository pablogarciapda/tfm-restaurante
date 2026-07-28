/**
 * POST /api/canvas/restore-original
 *
 * Restores mesas for a specific zone to the original design stored
 * in configuracion.diseno_original[zona].
 * Handles both keyed object {"Principal": [...]} and legacy flat array [...] formats.
 *
 * Body: { zona: string }
 *
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

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

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  if (!body?.zona) throw createError({ statusCode: 400, statusMessage: 'Se requiere zona' })

  const { data: config, error: configError } = await supabase
    .from('configuracion').select('diseno_original').limit(1).single()

  if (configError || !config?.diseno_original) {
    throw createError({ statusCode: 404, statusMessage: 'No hay diseño original guardado' })
  }

  const allDesigns = normalizeDesigns(config.diseno_original)
  const positions = allDesigns[body.zona]

  if (!Array.isArray(positions) || positions.length === 0) {
    throw createError({ statusCode: 404, statusMessage: `No hay diseño original para la zona "${body.zona}"` })
  }

  let ok = 0
  for (const pos of positions) {
    const p = pos as Record<string, unknown>
    const { error } = await supabase
      .from('mesas')
      .update({ posicion_x: p.posicion_x, posicion_y: p.posicion_y, rotacion: p.rotacion })
      .eq('id', p.mesa_id)
    if (!error) ok++
  }

  return { success: true, zona: body.zona, restored: ok, total: positions.length }
})
