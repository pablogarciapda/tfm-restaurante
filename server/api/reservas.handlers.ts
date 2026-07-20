/**
 * Reservas API — Pure Handler Functions (RFC-005)
 *
 * handleCreateReservation: validates input, normalizes phone, upserts cliente,
 * creates reserva with modo_reserva branching, fire-and-forget email,
 * validates blocked days, slot availability, and zone.
 *
 * Uses serverSupabaseServiceRole for all DB access.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { HorarioConfig, ZonaConfig } from '#shared/contracts/reservation.contract'
import { normalizePhone } from '#shared/utils/phone'
import { isSlotInRange } from '#shared/utils/slots'
import { generarReferencia } from '#shared/utils/referencia'
import { sendConfirmationEmail, sendCancellationEmail } from '../utils/email'

type SupabaseServerClient = SupabaseClient<Database>
type HandlerResult = { status: number; body: Record<string, unknown> }

interface ReservationBody {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  zona_id?: string
  sms_verified?: boolean
  captcha_token?: string
  gdpr_aceptado?: boolean
  admin_created?: boolean
}

function validateBody(body: ReservationBody): string[] {
  const errors: string[] = []
  if (!body.nombre || typeof body.nombre !== 'string' || !body.nombre.trim()) {
    errors.push('nombre')
  }
  if (!body.telefono || typeof body.telefono !== 'string' || !body.telefono.trim()) {
    errors.push('telefono')
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    errors.push('email')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '')) {
    if (body.email && body.email.trim()) errors.push('email_invalido')
  }
  if (!body.fecha_hora || typeof body.fecha_hora !== 'string') {
    errors.push('fecha_hora')
  } else {
    if (isNaN(new Date(body.fecha_hora).getTime())) {
      errors.push('fecha_hora_invalida')
    } else {
      const bookingDate = body.fecha_hora.slice(0, 10)
      const now = new Date()
      const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      if (bookingDate < todayLocal) errors.push('fecha_hora_futura')
    }
  }
  if (body.numero_comensales === undefined || body.numero_comensales === null) {
    errors.push('numero_comensales')
  } else if (body.numero_comensales < 1 || body.numero_comensales > 20) {
    errors.push('comensales_rango')
  }
  return errors
}

export async function handleCreateReservation(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
  runtimeConfig?: any,
): Promise<HandlerResult> {
  // 1. Validate required fields
  const errors = validateBody(body as unknown as ReservationBody)
  if (errors.length > 0) {
    return {
      status: 400,
      body: { errors },
    }
  }

  const b = body as unknown as ReservationBody

  // 3. Normalize phone
  const normalizedPhone = normalizePhone(b.telefono)
  if (!normalizedPhone) {
    return {
      status: 400,
      body: { error: 'Formato de teléfono no válido (ej: 600123456)' },
    }
  }

  // 4. Read config → modo_reserva, sms_verificacion, horarios_config, zonas_config, captcha_habilitado
  const { data: config } = await supabase
    .from('configuracion')
    .select('modo_reserva, sms_verificacion, notificacion_reserva, horarios_config, zonas_config, captcha_habilitado, restaurant_nombre, site_url')
    .limit(1)
    .single()
  const modo = config?.modo_reserva ?? 'automatica'
  const smsReq = (config?.sms_verificacion as boolean) ?? false
  const horariosConfig = config?.horarios_config as HorarioConfig | null
  const captchaHabilitado = (config?.captcha_habilitado as boolean) ?? false
  const restaurantNombre = (config?.restaurant_nombre as string) || ''
  const siteUrl = (config?.site_url as string) || ''

  // 4a. SMS gate — only required when sms_verificacion is enabled and NOT admin-created
  if (smsReq && !b.sms_verified && !b.admin_created) {
    return {
      status: 403,
      body: { error: 'Verificación SMS requerida' },
    }
  }

  // 4c. Validate Turnstile token if captcha is enabled
  // Skip if sms_verified=true or admin_created — SMS verification already proves humanity,
  // and admin-created reservations are trusted (authenticated employee).
  if (captchaHabilitado && !b.sms_verified && !b.admin_created) {
    const cfToken = runtimeConfig?.turnstile?.secretKey || process.env.NUXT_TURNSTILE_SECRET_KEY
    if (!b.captcha_token) {
      return {
        status: 403,
        body: { error: 'CAPTCHA no superado' },
      }
    }
    try {
      const verify = await $fetch<{ success: boolean }>('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({
          secret: cfToken || '',
          response: b.captcha_token,
        }),
      })
      if (!verify.success) {
        return {
          status: 403,
          body: { error: 'CAPTCHA no válido' },
        }
      }
    } catch {
      return {
        status: 503,
        body: { error: 'Error al verificar CAPTCHA, inténtalo de nuevo' },
      }
    }
  }

  // 4d. Validate blocked days
  const fechaDate = b.fecha_hora.split('T')[0]
  if (fechaDate) {
    // Check exact date match
    const { data: blocked } = await supabase
      .from('dias_bloqueados')
      .select('fecha, motivo, recurrente')
      .eq('fecha', fechaDate)

    if (blocked && blocked.length > 0) {
      const motivo = blocked[0]?.motivo || 'Fecha no disponible'
      return {
        status: 409,
        body: { error: 'Fecha no disponible', motivo },
      }
    }

    // Check recurring (MM-DD match, different year)
    if (!blocked || blocked.length === 0) {
      const mesDia = fechaDate.slice(5) // "MM-DD"
      const { data: recurring } = await supabase
        .from('dias_bloqueados')
        .select('fecha, motivo')
        .eq('recurrente', true)

      const matching = (recurring || []).filter((r: any) => r.fecha && r.fecha.slice(5) === mesDia)
      if (matching.length > 0) {
        const motivo = matching[0]?.motivo || 'Fecha no disponible'
        return {
          status: 409,
          body: { error: 'Fecha no disponible', motivo },
        }
      }
    }
  }

  // 4e. Validate time slot
  if (horariosConfig) {
    const hora = b.fecha_hora.slice(11, 16) // Extract "HH:MM" from ISO string
    if (hora && !isSlotInRange(hora, horariosConfig)) {
      return {
        status: 400,
        body: { error: 'Horario fuera de los turnos disponibles' },
      }
    }
  }

  // 4f. Validate zone if provided
  if (b.zona_id) {
    const zonas: ZonaConfig[] = (config?.zonas_config as ZonaConfig[]) || []
    const zona = zonas.find(
      (z) => (z.id === b.zona_id || z.nombre === b.zona_id) && z.enabled,
    )
    if (!zona) {
      return {
        status: 400,
        body: { error: 'Zona no válida o no habilitada' },
      }
    }
  }

  // 5. Upsert cliente by phone
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, nombre, apellidos, email, gdpr_aceptado')
    .eq('telefono', normalizedPhone)
    .maybeSingle()

  let clienteId: string
  if (existing?.id) {
    clienteId = existing.id
    // Sync nombre/apellidos/email from form data if they differ
    const updates: Record<string, any> = {}
    const trimmedNombre = b.nombre.trim()
    const trimmedApellidos = (b.apellidos?.trim() || null) ?? null
    const trimmedEmail = b.email.trim()
    // Always update name/email from form — the customer is the authority on their own data
    if (trimmedNombre !== existing.nombre) updates.nombre = trimmedNombre
    if (trimmedApellidos !== existing.apellidos) updates.apellidos = trimmedApellidos
    if (trimmedEmail !== existing.email) updates.email = trimmedEmail
    if (b.gdpr_aceptado && !existing.gdpr_aceptado) {
      updates.gdpr_aceptado = true
      updates.gdpr_aceptado_at = new Date().toISOString()
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('clientes')
        .update(updates)
        .eq('id', clienteId)
    }
  } else {
    const insertData: Record<string, any> = {
      nombre: b.nombre.trim(),
      apellidos: b.apellidos?.trim() || null,
      telefono: normalizedPhone,
      email: b.email.trim(),
    }
    if (b.gdpr_aceptado) {
      insertData.gdpr_aceptado = true
      insertData.gdpr_aceptado_at = new Date().toISOString()
    }
    const { data: created } = await supabase
      .from('clientes')
      .insert(insertData as any)
      .select('id')
      .single()

    if (!created?.id) {
      return {
        status: 500,
        body: { error: 'Error al crear cliente' },
      }
    }
    clienteId = created.id
  }

  // 6. Create reserva
  const estado = modo === 'verificada' ? 'pendiente' : 'confirmada'
  const cancelToken = crypto.randomUUID()

  const reservaData: Record<string, unknown> = {
    cliente_id: clienteId,
    fecha_hora: b.fecha_hora,
    numero_comensales: b.numero_comensales,
    estado,
    cancel_token: cancelToken,
  }

  // Include zona_id if provided
  if (b.zona_id) {
    // Find zone name from config
    const zonas: ZonaConfig[] = (config?.zonas_config as ZonaConfig[]) || []
    const zona = zonas.find((z) => z.id === b.zona_id || z.nombre === b.zona_id)
    reservaData.zona_id = zona?.nombre || b.zona_id
  }

  // For test compatibility: select only 'id', cancel_token is included via response
  const { data: reserva } = await supabase
    .from('reservas')
    .insert(reservaData as any)
    .select('id')
    .single()

  if (!reserva?.id) {
    return {
      status: 500,
      body: { error: 'Error al crear reserva' },
    }
  }

  // 7. Send notifications based on configuracion.notificacion_reserva
  if (estado === 'confirmada') {
    const notifConfig = (config?.notificacion_reserva as string) || 'email'
    const sendEmail = notifConfig === 'email' || notifConfig === 'ambos'
    const sendSms = notifConfig === 'sms' || notifConfig === 'ambos'

    if (sendEmail && b.email) {
      const ref = generarReferencia(reserva.id, b.fecha_hora)
      sendConfirmationEmail(
        {
          nombre: b.nombre.trim(),
          apellidos: b.apellidos?.trim() || null,
          email: b.email.trim(),
          fecha_hora: b.fecha_hora,
          comensales: b.numero_comensales,
          id: reserva.id,
          referencia: ref,
          cancel_token: cancelToken,
        } as any,
        supabase,
        runtimeConfig,
      ).catch((err: any) => console.warn('[reservas] Email send failed:', err.message))
    }

    if (sendSms && normalizedPhone) {
      const fecha = new Date(b.fecha_hora).toLocaleString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
      const emailInfo = b.email ? ` Tu email es: ${b.email}.` : ''
      const ref = generarReferencia(reserva.id, b.fecha_hora)
      // Cancel link uses configuracion.site_url (Dominio público URL).
      // When site_url is not configured, the cancel link is omitted —
      // the email channel (if enabled) still carries it.
      const cancelLink = siteUrl
        ? ` Cancela: ${siteUrl.replace(/\/$/, '')}/cancelar?token=${cancelToken}`
        : ''
      const msg = `✅ Reserva confirmada en ${restaurantNombre || 'Restaurante'}. ${fecha}. ${b.numero_comensales} comensales. Ref: ${ref}${emailInfo}${cancelLink}`
      console.info(`[reservas] SMS to ${normalizedPhone}: ${msg}`)
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      reserva_id: reserva.id,
      estado,
      cancel_token: cancelToken,
    },
  }
}

// ──────────────────────────── Cancelación ────────────────────────────────

export interface CancelReservationPayload {
  token: string
}

export async function handleCancelReservation(
  supabase: SupabaseServerClient,
  body: { token?: string },
  runtimeConfig?: any,
): Promise<HandlerResult> {
  const token = body?.token?.trim()
  if (!token) {
    return { status: 400, body: { error: 'Token de cancelación requerido' } }
  }

  // Look up reservation by cancel_token
  const { data: reserva, error: fetchError } = await supabase
    .from('reservas')
    .select('id, fecha_hora, numero_comensales, estado, cliente_id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (fetchError) {
    console.warn('[cancelar] DB error:', fetchError)
    return { status: 500, body: { error: 'Error al buscar la reserva' } }
  }

  if (!reserva) {
    return { status: 404, body: { error: 'Token de cancelación no válido' } }
  }

  // Validate state
  const validStates = ['pendiente', 'confirmada']
  if (!validStates.includes(reserva.estado)) {
    const messages: Record<string, string> = {
      cancelada: 'Esta reserva ya ha sido cancelada',
      completada: 'Esta reserva ya ha sido completada y no se puede cancelar',
      standby: 'Esta reserva está en espera y no se puede cancelar',
    }
    return {
      status: 409,
      body: { error: messages[reserva.estado] || 'La reserva no se puede cancelar en su estado actual' },
    }
  }

  // Validate date
  if (new Date(reserva.fecha_hora) <= new Date()) {
    return { status: 409, body: { error: 'No se puede cancelar una reserva pasada' } }
  }

  // Fetch cliente info for notification
  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, apellidos, email, telefono')
    .eq('id', reserva.cliente_id!)
    .single()

  // Update estado to cancelada
  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      estado: 'cancelada',
      cancelado_en: new Date().toISOString(),
      cancel_token: null,
    })
    .eq('id', reserva.id)

  if (updateError) {
    console.warn('[cancelar] Update error:', updateError)
    return { status: 500, body: { error: 'Error al cancelar la reserva' } }
  }

  // Send cancellation notification
  if (cliente) {
    const { data: config } = await supabase
      .from('configuracion')
      .select('notificacion_reserva, restaurant_nombre')
      .limit(1)
      .single()

    const metodo = (config?.notificacion_reserva as string) || 'email'
    const cancelRestNombre = (config?.restaurant_nombre as string) || ''
    const sendEmail = metodo === 'email' || metodo === 'ambos'
    const sendSms = metodo === 'sms' || metodo === 'ambos'

    const ref = reserva.numero_comensales
      ? generarReferencia(reserva.id, reserva.fecha_hora)
      : undefined

    if (sendEmail && cliente.email) {
      sendCancellationEmail(
        {
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          email: cliente.email,
          fecha_hora: reserva.fecha_hora,
          comensales: reserva.numero_comensales ?? 0,
          referencia: ref,
        },
        supabase,
        runtimeConfig,
      ).catch((err: any) => console.warn('[cancelar] Email failed:', err.message))
    }

    if (sendSms && cliente.telefono) {
      const fecha = new Date(reserva.fecha_hora).toLocaleString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
      const emailInfo = metodo === 'sms'
        ? ''
        : ' Te enviaremos un email de confirmación.'
      const msg = `❌ Reserva cancelada en ${cancelRestNombre || 'Restaurante'}. ${fecha}. ${reserva.numero_comensales ?? '?'} comensales. Ref: ${ref ?? reserva.id}.${emailInfo}`
      console.info(`[cancelar] SMS to ${cliente.telefono}: ${msg}`)
    }
  }

  return { status: 200, body: { success: true } }
}
