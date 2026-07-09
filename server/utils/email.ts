/**
 * server/utils/email.ts — SMTP email sending + confirmation HTML template
 *
 * Uses nodemailer for transport. Config is read from Supabase (configuracion)
 * with NUXT_SMTP_PASSWORD env var override.
 *
 * Callers provide a Supabase service_role client for DB reads.
 * sendEmail is fire-and-forget — never blocks the caller.
 */
import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  fromEmail: string
  security: 'auto' | 'ssl' | 'starttls' | 'none'
}

interface ConfirmationParams {
  nombre: string
  apellidos?: string | null
  fecha_hora: string
  comensales: number
  id: string
  referencia?: string
  cancel_token?: string | null
  mesa_numero?: number | null
  mesa_zona?: string | null
}

interface CancellationParams {
  nombre: string
  apellidos?: string | null
  email: string
  fecha_hora: string
  comensales: number
  referencia?: string
}

/**
 * Read SMTP config from Supabase + runtimeConfig override.
 * Priority: NUXT_SMTP_PASSWORD env var > DB smtp_password.
 * Returns null if host or password is missing.
 */
export async function getEmailConfig(
  supabase: any,
  runtimeConfig: any,
): Promise<EmailConfig | null> {
  const { data } = await supabase
    .from('configuracion')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_security')
    .limit(1)
    .single()

  if (!data?.smtp_host) return null

  const envPassword = runtimeConfig?.smtpPassword as string
  const password = envPassword || data.smtp_password

  if (!password) return null

  const securityRaw = (data.smtp_security as string) || 'auto'

  return {
    host: data.smtp_host,
    port: data.smtp_port ?? 587,
    user: data.smtp_user ?? '',
    password,
    fromEmail: data.smtp_from_email || data.smtp_user || 'noreply@lazingara.es',
    security: ['auto', 'ssl', 'starttls', 'none'].includes(securityRaw)
      ? (securityRaw as EmailConfig['security'])
      : 'auto',
  }
}

/**
 * Create a nodemailer transporter respecting security preference.
 * - auto → port-based detection (465=SSL, rest=STARTTLS)
 * - ssl  → explicit SSL/TLS (secure: true)
 * - starttls → explicit STARTTLS (secure: false)
 * - none → no encryption (ignoreTLS: true)
 */
function createTransporter(config: EmailConfig): nodemailer.Transporter {
  let secure = false
  let ignoreTLS = false

  switch (config.security) {
    case 'ssl':
      secure = true
      break
    case 'none':
      ignoreTLS = true
      break
    case 'starttls':
      secure = false
      break
    case 'auto':
    default:
      secure = config.port === 465
      break
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    ignoreTLS,
    auth: config.user
      ? {
          user: config.user,
          pass: config.password,
        }
      : undefined,
  })
}

/**
 * Send an email. Returns { success, message }.
 * Never throws — catches and logs errors.
 */
export async function sendEmail(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter(config)
    await transporter.sendMail({
      from: `"La Zíngara" <${config.fromEmail}>`,
      to,
      subject,
      html,
    })
    return { success: true, message: 'Correo enviado' }
  } catch (err: any) {
    console.warn('[email] Failed to send:', err.message)
    return { success: false, message: err.message }
  }
}

interface RestaurantInfo {
  nombre: string
  direccion: string
  telefono: string
  maps_url: string
}

/**
 * Read restaurant info from DB config. Falls back to hardcoded defaults.
 */
export async function getRestaurantInfo(supabase: any): Promise<RestaurantInfo> {
  try {
    const { data } = await supabase
      .from('configuracion')
      .select('restaurant_nombre, restaurant_direccion, restaurant_telefono, restaurant_maps_url')
      .limit(1)
      .single()

    if (data) {
      return {
        nombre: (data.restaurant_nombre as string) || 'La Zíngara',
        direccion: (data.restaurant_direccion as string) || '',
        telefono: (data.restaurant_telefono as string) || '',
        maps_url: (data.restaurant_maps_url as string) || '',
      }
    }
  } catch {
    // fall through to defaults
  }

  return {
    nombre: 'La Zíngara',
    direccion: 'Avda. del Páramo, 11, 24240 Santa María del Páramo, León',
    telefono: '987 350 350',
    maps_url: 'https://maps.app.goo.gl/56uxryZVZkS3pKTMA',
  }
}

/**
 * Build an HTML confirmation email for a reservation.
 * Pure function — no side effects.
 */
export function buildConfirmationHtml(
  params: ConfirmationParams,
  restaurant: RestaurantInfo,
): string {
  const nombreCompleto = params.apellidos
    ? `${params.nombre} ${params.apellidos}`
    : params.nombre

  const fecha = new Date(params.fecha_hora)
  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f0; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" style="width: 100%; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background-color: #c25b3c; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal;">${restaurant.nombre}</h1>
        <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Confirmación de reserva</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hola <strong>${nombreCompleto}</strong>,</p>
        <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Tu reserva ha sido confirmada. Aquí tienes los detalles:</p>

        <!-- Reservation details card -->
        <table role="presentation" style="width: 100%; background-color: #faf8f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Fecha</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${fechaStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Hora</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${horaStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Comensales</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${params.comensales}</td>
          </tr>
          ${params.mesa_numero ? `
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Mesa</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${params.mesa_zona ? `${params.mesa_zona} — ` : ''}Mesa ${params.mesa_numero}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Referencia</td>
            <td style="padding: 6px 0; color: #c25b3c; font-size: 14px; font-weight: bold;">${params.referencia ?? params.id}</td>
          </tr>
        </table>

        <!-- Restaurant info -->
        <hr style="border: none; border-top: 1px solid #e8e2dc; margin: 0 0 20px;">
        <p style="margin: 0 0 4px; color: #c25b3c; font-size: 14px; font-weight: bold;">${restaurant.nombre}</p>
        <p style="margin: 0 0 2px; color: #666; font-size: 13px;">${restaurant.direccion}</p>
        ${restaurant.telefono ? `<p style="margin: 0 0 2px; color: #666; font-size: 13px;">☎ ${restaurant.telefono}</p>` : ''}
        ${restaurant.maps_url ? `<p style="margin: 8px 0 0;"><a href="${restaurant.maps_url}" style="color: #c25b3c; font-size: 13px; text-decoration: underline;">Ver en Google Maps</a></p>` : ''}
        ${params.cancel_token ? `
        <hr style="border: none; border-top: 1px solid #e8e2dc; margin: 20px 0;">
        <p style="margin: 0 0 4px; color: #999; font-size: 12px;">¿Necesitas cancelar tu reserva?</p>
        <p style="margin: 0;">
          <a href="https://lazingara.es/cancelar?token=${params.cancel_token}"
             style="color: #c25b3c; font-size: 12px; text-decoration: underline;">
            Cancelar reserva
          </a>
        </p>` : ''}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f5f3f0; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; color: #aaa; font-size: 11px;">Este email es automático, no respondas a este mensaje.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

/**
 * Build an HTML cancellation confirmation email.
 * Pure function — no side effects.
 */
export function buildCancellationHtml(
  params: CancellationParams,
  restaurant: RestaurantInfo,
): string {
  const nombreCompleto = params.apellidos
    ? `${params.nombre} ${params.apellidos}`
    : params.nombre

  const fecha = new Date(params.fecha_hora)
  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f0; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" style="width: 100%; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background-color: #888; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal;">${restaurant.nombre}</h1>
        <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Reserva cancelada</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hola <strong>${nombreCompleto}</strong>,</p>
        <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Tu reserva ha sido cancelada correctamente. Estos eran los detalles de la reserva cancelada:</p>

        <table role="presentation" style="width: 100%; background-color: #faf8f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Fecha</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${fechaStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Hora</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${horaStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Comensales</td>
            <td style="padding: 6px 0; color: #333; font-size: 14px;">${params.comensales}</td>
          </tr>
          ${params.referencia ? `
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #888; font-size: 13px; white-space: nowrap;">Referencia</td>
            <td style="padding: 6px 0; color: #888; font-size: 14px;">${params.referencia}</td>
          </tr>` : ''}
        </table>

        <p style="margin: 0 0 4px; color: #666; font-size: 14px;">Si no solicitaste esta cancelación, por favor <strong>llámanos al ${restaurant.telefono}</strong> para resolverlo.</p>

        <hr style="border: none; border-top: 1px solid #e8e2dc; margin: 20px 0;">
        <p style="margin: 0 0 4px; color: #c25b3c; font-size: 14px; font-weight: bold;">${restaurant.nombre}</p>
        <p style="margin: 0 0 2px; color: #666; font-size: 13px;">${restaurant.direccion}</p>
        ${restaurant.telefono ? `<p style="margin: 0 0 2px; color: #666; font-size: 13px;">☎ ${restaurant.telefono}</p>` : ''}
        ${restaurant.maps_url ? `<p style="margin: 8px 0 0;"><a href="${restaurant.maps_url}" style="color: #c25b3c; font-size: 13px; text-decoration: underline;">Ver en Google Maps</a></p>` : ''}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f5f3f0; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; color: #aaa; font-size: 11px;">Este email es automático, no respondas a este mensaje.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

/**
 * Convenience: send cancellation confirmation email after a reservation is cancelled.
 * Fire-and-forget — does NOT throw.
 */
export async function sendCancellationEmail(
  params: CancellationParams & { email: string },
  supabase: any,
  runtimeConfig: any,
): Promise<void> {
  if (!params.email) {
    console.warn('[email] No email address for cancellation — skipping')
    return
  }

  try {
    const config = await getEmailConfig(supabase, runtimeConfig)
    if (!config) {
      console.warn('[email] SMTP not configured — cancellation email not sent')
      return
    }

    const restaurantInfo = await getRestaurantInfo(supabase)
    const html = buildCancellationHtml(params, restaurantInfo)
    const asunto = `Reserva cancelada — ${restaurantInfo.nombre}`
    const result = await sendEmail(config, params.email, asunto, html)

    if (!result.success) {
      console.warn('[email] Failed to send cancellation:', result.message)
    }
  } catch (err: any) {
    console.warn('[email] Fire-and-forget cancellation error:', err.message)
  }
}

/**
 * Convenience: send confirmation email after a reservation.
 * Fire-and-forget — does NOT throw.
 */
export async function sendConfirmationEmail(
  params: ConfirmationParams & { email: string },
  supabase: any,
  runtimeConfig: any,
): Promise<void> {
  if (!params.email) {
    console.warn('[email] No email address for cliente — skipping')
    return
  }

  try {
    const config = await getEmailConfig(supabase, runtimeConfig)
    if (!config) {
      console.warn('[email] SMTP not configured — email not sent')
      return
    }

    const restaurantInfo = await getRestaurantInfo(supabase)

    const html = buildConfirmationHtml(
      {
        nombre: params.nombre,
        apellidos: params.apellidos,
        fecha_hora: params.fecha_hora,
        comensales: params.comensales,
        id: params.id,
        referencia: params.referencia,
        cancel_token: (params as any).cancel_token,
      },
      restaurantInfo,
    )

    const asunto = `Confirmación de reserva — ${restaurantInfo.nombre}`
    const result = await sendEmail(config, params.email, asunto, html)

    if (!result.success) {
      console.warn('[email] Failed to send confirmation:', result.message)
    }
  } catch (err: any) {
    console.warn('[email] Fire-and-forget error:', err.message)
  }
}
