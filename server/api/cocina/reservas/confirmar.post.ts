/**
 * POST /api/cocina/reservas/confirmar — Confirm a pending reservation
 *
 * Accepts optional mesa_id to assign a table on confirmation.
 * Sends notification(s) based on configuracion.notificacion_reserva.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { sendConfirmationEmail } from '../../../utils/email'
import { generarReferencia } from '#shared/utils/referencia'

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
    .select('notificacion_reserva')
    .limit(1)
    .single()

  const metodo = (config?.notificacion_reserva as string) || 'email'

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
      const msg = `✅ Reserva confirmada en La Zíngara. ${fecha}. ${updated.numero_comensales} comensales. Ref: ${ref}${emailInfo}`
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
