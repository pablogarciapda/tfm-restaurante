/**
 * POST /api/cocina/mesas/unfuse — Unfuse a fusion group (MFU-004, MFU-005)
 *
 * Uses serverSupabaseServiceRole (AD-10).
 * Body: { fusionId: string, action: 'force' | 'cancel' | 'standby' }
 * Returns: { success: true }
 */
import { handleUnfuseMesas } from './handlers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleUnfuseMesas(supabase, body || {})

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
