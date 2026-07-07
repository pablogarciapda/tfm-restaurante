/**
 * POST /api/dias-bloqueados — Create a blocked day (ADMIN ONLY)
 *
 * Validates with Zod, rejects past dates (non-recurrent),
 * inserts into dias_bloqueados. Returns 201 with created row.
 */
import { handleCreateDiaBloqueado } from './handlers'
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

  const result = await handleCreateDiaBloqueado(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).fields?.join(', ') || (result.body as any).error,
    })
  }

  setResponseStatus(event, result.status)
  return result.body
})
