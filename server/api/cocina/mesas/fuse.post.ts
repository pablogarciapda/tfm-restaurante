/**
 * POST /api/cocina/mesas/fuse — Fuse N≥2 mesas into a shared group (MFU-001, MFU-002)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Body: { mesaIds: string[] }
 * Returns: { success: true, id_fusion, capacidad_actual }
 */
import { handleFuseMesas } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleFuseMesas(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  setResponseStatus(event, result.status)
  return result.body
})
