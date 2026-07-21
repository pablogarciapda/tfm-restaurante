/**
 * POST /api/cocina/reservas/confirmar — Confirm a pending reservation
 *
 * Accepts optional mesa_id to assign a table on confirmation.
 * Checks for time-window conflicts before assigning a mesa.
 * Sends notification(s) based on configuracion.notificacion_reserva.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { sendConfirmationEmail } from '../../../utils/email'
import { generarReferencia } from '#shared/utils/referencia'
import { hasMesaConflict, buildTurnoWindows } from '#shared/utils/reserva-overlap'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const { reserva_id, mesa_id } = body || {}

  if (!reserva_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de reserva requerido',
    })
  }

  // Build update: confirm state + optionally assign mesa
  const updateData: Record<string, unknown> = { estado: 'confirmada' }
  if (mesa_id) {
    // Check for time-window conflicts before assigning
    const { data: horariosConfig } = await supabase
      .from('configuracion')
      .select('horarios_config')
      .limit(1)
      .single()

    const { data: reservaActual } = await supabase
      .from('reservas')
      .select('fecha_hora')
      .eq('id', reserva_id)
      .single()

    if (reservaActual?.fecha_hora && horariosConfig?.horarios_config) {
      const turnos = buildTurnoWindows(horariosConfig.horarios_config)
      const { data: existingReservas } = await supabase
        .from('reservas')
        .select('fecha_hora, estado')
        .eq('mesa_id', mesa_id)
        .neq('id', reserva_id)

      if (existingReservas && hasMesaConflict(existingReservas, reservaActual.fecha_hora, turnos)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'La mesa ya tiene una reserva en ese horario. Seleccione otra mesa o cambie la hora.',
        })
      }
    }

    updateData.mesa_id = mesa_id
  }

  const { data: updated, error } = await supabase
    .from('reservas')
    .update(updateData)
    .eq('id', reserva_id)
    .eq('estado', 'pendiente')
    .select('id, cliente_id, fecha_hora, numero_comensales, estado, mesa_id')
    .single()

  if (error || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'No se pudo confirmar la reserva',
    })
  }

  // Fetch cliente info for notification
  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, apellidos, email, telefono')
    .eq('id', updated.cliente_id!)
    .single()

  // Read notification method from config
  const { data: config } = await supabase
    .from('configuracion')
    .select('notificacion_reserva, restaurant_nombre')
    .limit(1)
    .single()

  const metodo = (config?.notificacion_reserva as string) || 'email'
  const restNombre = (config?.restaurant_nombre as string) || ''

  // Fetch mesa info if mesa was assigned
  let mesaNumero: number | null = null
  let mesaZona: string | null = null
  if (updated.mesa_id) {
    const { data: mesa } = await supabase
      .from('mesas')
      .select('numero_mesa, zona')
      .eq('id', updated.mesa_id)
      .single()
    if (mesa) {
      mesaNumero = mesa.numero_mesa
      mesaZona = mesa.zona
    }
  }

  // Send notifications based on configured method
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
          mesa_numero: mesaNumero,
          mesa_zona: mesaZona,
        },
        supabase,
        runtimeConfig,
      ).catch((err: any) => console.warn('[confirmar] Email failed:', err.message))
    }

    if (sendSms && cliente.telefono) {
      const fecha = new Date(updated.fecha_hora).toLocaleString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
      const emailInfo = cliente.email ? ` Tu email es: ${cliente.email}.` : ''
      const ref = generarReferencia(updated.id, updated.fecha_hora)
      const msg = `✅ Reserva confirmada en ${restNombre || 'Restaurante'}. ${fecha}. ${updated.numero_comensales} comensales. Ref: ${ref}${emailInfo}`
      console.info(`[confirmar] SMS to ${cliente.telefono}: ${msg}`)
    }
  }

  return {
    success: true,
    estado: updated.estado,
    mesa_id: updated.mesa_id || null,
    notificacion: metodo,
    telefono: cliente?.telefono || null,
    email: cliente?.email || null,
  }
})
