/**
 * POST /api/cocina/mesas/create — Create a new mesa (MCA-003)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Body: { numero_mesa, capacidad_base, zona, posicion_x?, posicion_y?, ancho?, alto?, rotacion? }
 * Returns 201 on success with created mesa.
 */
import { handleCreateMesa } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleCreateMesa(supabase, body || {})

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
