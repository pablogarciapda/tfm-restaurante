/**
 * POST /api/admin/reasignar — Admin reasign zona/mesa (ADM-002)
 *
 * ADMIN ONLY. Body: { reserva_id, nueva_zona_id?, nueva_mesa_id?, motivo }
 * Validates zona against zonas_config, mesa FK + zone membership.
 * Returns updated reserva.
 */
import { handleReasignReserva } from './reasignar.handlers'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth gate
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Se requiere autenticación',
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const result = await handleReasignReserva(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
