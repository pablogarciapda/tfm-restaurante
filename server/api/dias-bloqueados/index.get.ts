/**
 * GET /api/dias-bloqueados — List all blocked days (PUBLIC)
 *
 * Returns all dias_bloqueados ordered by fecha ASC.
 * Also computes recurring dates for the next 90 days.
 * Uses service role to bypass RLS for reads.
 */
import { handleListDiasBloqueados } from './handlers'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleListDiasBloqueados(supabase)

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: (result.body as any).error,
      message: (result.body as any).error,
    })
  }

  return result.body
})
