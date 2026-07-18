/**
 * GET /api/diseno-config — Canvas design configuration
 *
 * Returns canvas base dimensions from configuracion table.
 * Falls back to file-based config if DB columns are not populated.
 * ADMIN ONLY: requires authenticated user session.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { readDisenoConfig as readFileConfig } from '../utils/diseno-config'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Try DB first (columns added by migration 002)
  const { data, error } = await supabase
    .from('configuracion')
    .select('canvas_ancho_base, canvas_alto_base')
    .limit(1)
    .single()

  if (!error && data) {
    return {
      canvas_ancho_base: data.canvas_ancho_base ?? 1400,
      canvas_alto_base: data.canvas_alto_base ?? 900,
    }
  }

  // Fallback to file-based config
  return readFileConfig()
})
