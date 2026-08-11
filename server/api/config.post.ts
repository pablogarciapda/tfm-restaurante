/**
 * POST /api/config — Update config (admin only)
 *
 * smtp_password: write-only. Empty string or "••••••••" = preserve existing.
 */
import { handleUpdateConfig } from './config.handlers'
import { syncSupabaseAuthUrls } from '../utils/supabase-auth-config'
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

  if (typeof body?.site_url === 'string') {
    const runtimeConfig = useRuntimeConfig(event)
    try {
      await syncSupabaseAuthUrls({
        projectRef: runtimeConfig.supabaseProjectRef,
        managementToken: runtimeConfig.supabaseManagementToken,
        siteUrl: body.site_url,
      })
    } catch (error) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Configuración guardada, pero no se pudo sincronizar Supabase Auth',
        message: error instanceof Error
          ? `Configuración guardada, pero no se pudo sincronizar Supabase Auth: ${error.message}`
          : 'Configuración guardada, pero no se pudo sincronizar Supabase Auth',
      })
    }
  }

  return result.body
})
