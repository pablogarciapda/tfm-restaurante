/**
 * POST /api/cocina/reservas/editar — Edit a reservation (date, time, comensales, client data)
 *
 * Optionally regenerates cancel_token and re-sends notifications (email/SMS)
 * based on configuracion.notificacion_reserva.
 *
 * Auth: Supabase cookie (admin).
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { sendConfirmationEmail } from '../../../utils/email'
import { generarReferencia } from '#shared/utils/referencia'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const {
    reserva_id,
    fecha_hora,
    numero_comensales,
    cliente_nombre,
    cliente_apellidos,
    cliente_telefono,
    cliente_email,
    reenviar_notificacion,
  } = body || {}

  if (!reserva_id) {
    throw createError({ statusCode: 400, statusMessage: 'reserva_id requerido' })
  }

  if (!fecha_hora) {
    throw createError({ statusCode: 400, statusMessage: 'fecha_hora requerido' })
  }

  // Validate date is not in the past (compare YYYY-MM-DD only, timezone-safe)
  const dateStr = String(fecha_hora).slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)
  if (dateStr < todayStr) {
    throw createError({ statusCode: 400, statusMessage: 'No se puede reservar en el pasado' })
  }

  // 1. Fetch current reservation
  const { data: reserva, error: fetchErr } = await supabase
    .from('reservas')
    .select('id, cliente_id, fecha_hora, numero_comensales, estado')
    .eq('id', reserva_id)
    .single()

  if (fetchErr || !reserva) {
    throw createError({ statusCode: 404, statusMessage: 'Reserva no encontrada' })
  }

  if (reserva.estado === 'cancelada' || reserva.estado === 'completada') {
    throw createError({ statusCode: 400, statusMessage: 'No se puede editar una reserva cancelada o completada' })
  }

  // 2. Update client data if provided
  if (reserva.cliente_id && (cliente_nombre || cliente_telefono)) {
    const clientUpdate: Record<string, unknown> = {}
    if (cliente_nombre) clientUpdate.nombre = cliente_nombre
    if (cliente_apellidos !== undefined) clientUpdate.apellidos = cliente_apellidos || null
    if (cliente_telefono) clientUpdate.telefono = cliente_telefono
    if (cliente_email !== undefined) clientUpdate.email = cliente_email || null

    await supabase
      .from('clientes')
      .update(clientUpdate)
      .eq('id', reserva.cliente_id)
  }

  // 3. Optionally regenerate cancel_token
  let newCancelToken: string | null = null
  const reservationUpdate: Record<string, unknown> = {
    fecha_hora,
    numero_comensales,
  }

  if (reenviar_notificacion) {
    newCancelToken = crypto.randomUUID()
    reservationUpdate.cancel_token = newCancelToken
  }

  const { data: updated, error: updateErr } = await supabase
    .from('reservas')
    .update(reservationUpdate)
    .eq('id', reserva_id)
    .select('id, cliente_id, fecha_hora, numero_comensales, estado, cancel_token')
    .single()

  if (updateErr || !updated) {
    throw createError({ statusCode: 500, statusMessage: updateErr?.message || 'Error al actualizar' })
  }

  // 4. Send notifications if requested
  if (reenviar_notificacion) {
    // Fetch client info
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nombre, apellidos, email, telefono')
      .eq('id', reserva.cliente_id!)
      .single()

    // Read notification config
    const { data: config } = await supabase
      .from('configuracion')
      .select('notificacion_reserva, restaurant_nombre')
      .limit(1)
      .single()

    const metodo = (config?.notificacion_reserva as string) || 'email'

    // Fetch mesa info if assigned
    const { data: reservaFull } = await supabase
      .from('reservas')
      .select('mesa_id')
      .eq('id', reserva_id)
      .single()

    let mesaNumero: number | null = null
    let mesaZona: string | null = null
    if (reservaFull?.mesa_id) {
      const { data: mesa } = await supabase
        .from('mesas')
        .select('numero_mesa, zona')
        .eq('id', reservaFull.mesa_id)
        .single()
      if (mesa) {
        mesaNumero = mesa.numero_mesa
        mesaZona = mesa.zona
      }
    }

    if (cliente) {
      const sendEmail = metodo === 'email' || metodo === 'ambos'
      const sendSms = metodo === 'sms' || metodo === 'ambos'

      if (sendEmail && cliente.email) {
        const ref = generarReferencia(updated.id, updated.fecha_hora)
        sendConfirmationEmail(
          {
            nombre: cliente.nombre,
            apellidos: cliente.apellidos,
            email: cliente.email,
            fecha_hora: updated.fecha_hora,
            comensales: updated.numero_comensales ?? 0,
            id: updated.id,
            referencia: ref,
            cancel_token: newCancelToken ?? undefined,
            mesa_numero: mesaNumero,
            mesa_zona: mesaZona,
          },
          supabase,
          runtimeConfig,
        ).catch((err: any) => console.warn('[editar-reserva] Email failed:', err.message))
      }

      if (sendSms && cliente.telefono) {
        const fecha = new Date(updated.fecha_hora).toLocaleString('es-ES', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: '2-digit', minute: '2-digit',
        })
        const ref = generarReferencia(updated.id, updated.fecha_hora)
        const msg = `✅ Reserva actualizada en ${config?.restaurant_nombre || 'Restaurante'}. ${fecha}. ${updated.numero_comensales} comensales. Ref: ${ref}`
        console.info(`[editar-reserva] SMS to ${cliente.telefono}: ${msg}`)
      }
    }
  }

  return {
    success: true,
    reserva: updated,
    cancel_token_regenerated: reenviar_notificacion && !!newCancelToken,
  }
})
