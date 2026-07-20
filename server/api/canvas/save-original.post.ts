/**
 * POST /api/canvas/save-original
 *
 * Saves the current mesa positions as the "original design" snapshot
 * in configuracion.diseno_original.
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

  const body = await readBody(event)
  if (!body || !Array.isArray(body.positions)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Se requiere positions[] con los datos de las mesas',
    })
  }

  // Get existing config row
  const { data: config } = await supabase
    .from('configuracion')
    .select('id')
    .limit(1)
    .single()

  if (!config) {
    throw createError({ statusCode: 500, statusMessage: 'No se encontró la configuración' })
  }

  // Update only diseno_original
  const { error } = await supabase
    .from('configuracion')
    .update({ diseno_original: body.positions })
    .eq('id', config.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })
  }

  return { success: true, count: body.positions.length }
})
