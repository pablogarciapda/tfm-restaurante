/**
 * POST /api/cocina/mesas/update — Update an existing mesa (MCA-003, MCA-004)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Body: { id, posicion_x?, posicion_y?, ancho?, alto?, rotacion?, capacidad_actual?, zona?, numero_mesa?, capacidad_base? }
 * Returns 200 on success.
 */
import { handleUpdateMesa } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleUpdateMesa(supabase, body || {})

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
