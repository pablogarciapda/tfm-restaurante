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

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  if (!body?.zona || !Array.isArray(body.positions)) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere zona y positions[]' })
  }

  const { data: config } = await supabase.from('configuracion').select('id, diseno_original').limit(1).single()
  if (!config) throw createError({ statusCode: 500, statusMessage: 'No se encontró la configuración' })

  // diseno_original is a JSONB object keyed by zona name
  const allDesigns = (config.diseno_original || {}) as Record<string, unknown>
  allDesigns[body.zona] = body.positions

  const { error } = await supabase
    .from('configuracion')
    .update({ diseno_original: allDesigns })
    .eq('id', config.id)

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })

  return { success: true, zona: body.zona, count: body.positions.length }
})
