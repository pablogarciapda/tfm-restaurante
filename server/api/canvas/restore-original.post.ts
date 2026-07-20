/**
 * POST /api/canvas/restore-original
 *
 * Restores mesas for a specific zone to the original design stored
 * in configuracion.diseno_original[zona].
 *
 * Body: { zona: string }
 *
 * Admin-only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

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

  const allDesigns = config.diseno_original as Record<string, Array<{
    mesa_id: string; posicion_x: number; posicion_y: number; rotacion: number
  }>>
  const positions = allDesigns[body.zona]

  if (!Array.isArray(positions) || positions.length === 0) {
    throw createError({ statusCode: 404, statusMessage: `No hay diseño original para la zona "${body.zona}"` })
  }

  let ok = 0
  for (const pos of positions) {
    const { error } = await supabase
      .from('mesas')
      .update({ posicion_x: pos.posicion_x, posicion_y: pos.posicion_y, rotacion: pos.rotacion })
      .eq('id', pos.mesa_id)
    if (!error) ok++
  }

  return { success: true, zona: body.zona, restored: ok, total: positions.length }
})
