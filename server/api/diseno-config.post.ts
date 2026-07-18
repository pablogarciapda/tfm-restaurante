/**
 * POST /api/diseno-config — Save canvas design configuration
 *
 * Writes to configuracion table (persists across deployments).
 * Falls back to file-based config if DB write fails.
 * ADMIN ONLY: requires authenticated user session.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { readDisenoConfig as readFileConfig, writeDisenoConfig as writeFileConfig } from '../utils/diseno-config'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Body requerido' })
  }

  const ancho = Number(body.canvas_ancho_base)
  const alto = Number(body.canvas_alto_base)

  if (!Number.isFinite(ancho) || ancho < 800 || ancho > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'canvas_ancho_base debe ser 800–4000' })
  }
  if (!Number.isFinite(alto) || alto < 600 || alto > 3000) {
    throw createError({ statusCode: 400, statusMessage: 'canvas_alto_base debe ser 600–3000' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const roundedAncho = Math.round(ancho)
  const roundedAlto = Math.round(alto)

  // Try DB first
  const { data: current } = await supabase
    .from('configuracion')
    .select('id')
    .limit(1)
    .single()

  if (current?.id) {
    const { error: updateError } = await supabase
      .from('configuracion')
      .update({ canvas_ancho_base: roundedAncho, canvas_alto_base: roundedAlto })
      .eq('id', current.id)

    if (!updateError) {
      return { success: true, canvas_ancho_base: roundedAncho, canvas_alto_base: roundedAlto }
    }
  }

  // Fallback: write to file
  writeFileConfig({ canvas_ancho_base: roundedAncho, canvas_alto_base: roundedAlto })

  return { success: true, canvas_ancho_base: roundedAncho, canvas_alto_base: roundedAlto }
})
