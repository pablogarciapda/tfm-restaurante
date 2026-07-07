/**
 * GET /api/cocina/clientes/[id]/reservas — Reservation history for a cliente (CLI-004)
 */
import { handleGetClienteReservas } from '../handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  const result = await handleGetClienteReservas(supabase, id || '')

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
