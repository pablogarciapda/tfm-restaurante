/**
 * GET /api/labsmobile/balance — Query remaining SMS credits from LabsMobile
 *
 * ADMIN ONLY: requires authenticated user session.
 * Returns { success: true, credits: number } or error.
 */
import { serverSupabaseUser } from '#supabase/server'
import { getSmsProvider } from '../../utils/sms-factory'

export default defineEventHandler(async (event) => {
  // Auth gate — only authenticated admins can check balance
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Se requiere autenticación',
    })
  }

  // Don't reset the cached provider here — the balance is a read-only check
  // and we don't want to disrupt an in-flight SMS send.
  const provider = getSmsProvider()
  const result = await provider.getBalance()

  if (!result.success) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Balance Error',
      message: result.error || 'No se pudo consultar el saldo de SMS',
    })
  }

  return { success: true, credits: result.credits ?? -1 }
})
