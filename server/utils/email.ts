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
}

interface ConfirmationParams {
  nombre: string
  apellidos?: string | null
  fecha_hora: string
  comensales: number
  id: string
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
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email')
    .limit(1)
    .single()

  if (!data?.smtp_host) return null

  const envPassword = runtimeConfig?.smtpPassword as string
  const password = envPassword || data.smtp_password

  if (!password) return null

  return {
    host: data.smtp_host,
    port: data.smtp_port ?? 587,
    user: data.smtp_user ?? '',
    password,
    fromEmail: data.smtp_from_email || data.smtp_user || 'noreply@lazingara.es',
  }
}

/**
 * Create a nodemailer transporter with port-based TLS detection.
 * - 465 → SSL (secure: true)
 * - 587 → STARTTLS (secure: false)
 * - other → no TLS enforcement
 */
function createTransporter(config: EmailConfig): nodemailer.Transporter {
  const secure = config.port === 465

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
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

/**
 * Build an HTML confirmation email for a reservation.
 * Pure function — no side effects.
 */
export function buildConfirmationHtml(params: ConfirmationParams): string {
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
<body style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #c25b3c;">La Zíngara — Confirmación de reserva</h2>
  <p>Hola <strong>${nombreCompleto}</strong>,</p>
  <p>Tu reserva ha sido <strong>confirmada</strong>:</p>
  <table style="margin: 16px 0; border-collapse: collapse;">
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Fecha:</td>
        <td style="padding: 6px 0;">${fechaStr}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Hora:</td>
        <td style="padding: 6px 0;">${horaStr}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Comensales:</td>
        <td style="padding: 6px 0;">${params.comensales}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Referencia:</td>
        <td style="padding: 6px 0;">${params.id}</td></tr>
  </table>
  <p style="color: #888; font-size: 14px;">
    La Zíngara — Plaza Mayor, Santa María del Páramo (León)
  </p>
</body>
</html>`.trim()
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

    const html = buildConfirmationHtml({
      nombre: params.nombre,
      apellidos: params.apellidos,
      fecha_hora: params.fecha_hora,
      comensales: params.comensales,
      id: params.id,
    })

    const result = await sendEmail(
      config,
      params.email,
      'Confirmación de reserva — La Zíngara',
      html,
    )

    if (!result.success) {
      console.warn('[email] Failed to send confirmation:', result.message)
    }
  } catch (err: any) {
    console.warn('[email] Fire-and-forget error:', err.message)
  }
}
