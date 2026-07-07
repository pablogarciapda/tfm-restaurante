/**
 * DELETE /api/dias-bloqueados/[id] — Delete a blocked day (ADMIN ONLY)
 *
 * Returns 200 on success, 404 if not found.
 */
import { handleDeleteDiaBloqueado } from './handlers'
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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID es requerido',
      message: 'ID es requerido',
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const result = await handleDeleteDiaBloqueado(supabase, id)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
