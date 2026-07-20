/**
 * POST /api/canvas/restore-original
 *
 * Restores all mesas to the "original design" stored in
 * configuracion.diseno_original.
 *
 * Admin-only (authentication gated, pages are middleware-protected).
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: config, error: configError } = await supabase
    .from('configuracion')
    .select('diseno_original')
    .limit(1)
    .single()

  if (configError || !config?.diseno_original) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No hay diseño original guardado. Guarde primero desde /cocina/diseno.',
    })
  }

  const positions = config.diseno_original as Array<{
    mesa_id: string; posicion_x: number; posicion_y: number; rotacion: number
  }>

  if (!Array.isArray(positions) || positions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Diseño original vacío o inválido' })
  }

  let ok = 0
  for (const pos of positions) {
    const { error } = await supabase
      .from('mesas')
      .update({ posicion_x: pos.posicion_x, posicion_y: pos.posicion_y, rotacion: pos.rotacion })
      .eq('id', pos.mesa_id)
    if (!error) ok++
  }

  return { success: true, restored: ok, total: positions.length }
})
