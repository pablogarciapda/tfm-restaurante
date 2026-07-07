/**
 * POST /api/config — Update config (admin only)
 *
 * smtp_password: write-only. Empty string or "••••••••" = preserve existing.
 */
import { handleUpdateConfig } from './config.handlers'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth gate — only authenticated admins can modify config
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Se requiere autenticación' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const result = await handleUpdateConfig(supabase, body || {})

  if (result.status >= 400) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error as string,
      message: result.body.error as string,
    })
  }

  return result.body
})
