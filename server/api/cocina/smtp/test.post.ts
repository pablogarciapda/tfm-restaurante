/**
 * POST /api/cocina/smtp/test — Send a test email (admin only)
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { getEmailConfig, getRestaurantInfo, sendEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const { to } = body || {}

  const config = await getEmailConfig(supabase, runtimeConfig)
  if (!config) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SMTP no configurado',
      message: 'Configure los datos SMTP primero',
    })
  }

  const restaurantInfo = await getRestaurantInfo(supabase)
  const fromName = restaurantInfo.nombre || 'Restaurante'

  const result = await sendEmail(
    config,
    to || config.fromEmail,
    `Test — ${fromName}`,
    `<p>Correo de prueba desde el panel de configuración de ${fromName}.</p>`,
    fromName,
  )

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Error al enviar',
      message: result.message,
    })
  }

  return { success: true, message: 'Correo de prueba enviado' }
})
