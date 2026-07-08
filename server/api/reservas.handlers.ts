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
import { sendConfirmationEmail } from '../utils/email'

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
    const fecha = new Date(body.fecha_hora)
    if (isNaN(fecha.getTime())) errors.push('fecha_hora_invalida')
    else if (fecha <= new Date()) errors.push('fecha_hora_futura')
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

  // 4. Read config → modo_reserva, horarios_config, zonas_config, captcha_habilitado
  const { data: config } = await supabase
    .from('configuracion')
    .select('modo_reserva, horarios_config, zonas_config, captcha_habilitado')
    .limit(1)
    .single()
  const modo = config?.modo_reserva ?? 'automatica'
  const horariosConfig = config?.horarios_config as HorarioConfig | null
  const captchaHabilitado = (config?.captcha_habilitado as boolean) ?? false

  // 4a. SMS gate — only required in 'verificada' mode
  if (modo === 'verificada' && !b.sms_verified) {
    return {
      status: 403,
      body: { error: 'Verificación SMS requerida' },
    }
  }

  // 4c. Validate Turnstile token if captcha is enabled
  if (captchaHabilitado) {
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
    .select('id, gdpr_aceptado')
    .eq('telefono', normalizedPhone)
    .maybeSingle()

  let clienteId: string
  if (existing?.id) {
    clienteId = existing.id
    // Update gdpr_aceptado if the user accepted via this reservation
    if (b.gdpr_aceptado && !existing.gdpr_aceptado) {
      await supabase
        .from('clientes')
        .update({ gdpr_aceptado: true, gdpr_aceptado_at: new Date().toISOString() })
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

  const reservaData: Record<string, unknown> = {
    cliente_id: clienteId,
    fecha_hora: b.fecha_hora,
    numero_comensales: b.numero_comensales,
    estado,
  }

  // Include zona_id if provided
  if (b.zona_id) {
    // Find zone name from config
    const zonas: ZonaConfig[] = (config?.zonas_config as ZonaConfig[]) || []
    const zona = zonas.find((z) => z.id === b.zona_id || z.nombre === b.zona_id)
    reservaData.zona_id = zona?.nombre || b.zona_id
  }

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

  // 7. Fire-and-forget confirmation email (only if modo=automatica and email provided)
  if (estado === 'confirmada' && b.email) {
    sendConfirmationEmail(
      {
        nombre: b.nombre.trim(),
        apellidos: b.apellidos?.trim() || null,
        email: b.email.trim(),
        fecha_hora: b.fecha_hora,
        comensales: b.numero_comensales,
        id: reserva.id,
      },
      supabase,
      runtimeConfig,
    ).catch((err: any) => console.warn('[reservas] Email send failed:', err.message))
  }

  return {
    status: 200,
    body: {
      success: true,
      reserva_id: reserva.id,
      estado,
    },
  }
}
