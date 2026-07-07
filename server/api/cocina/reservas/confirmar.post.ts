/**
 * POST /api/cocina/reservas/confirmar — Confirm a pending reservation (CLI-005)
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { sendConfirmationEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)
  const runtimeConfig = useRuntimeConfig(event)

  const { reserva_id } = body || {}

  if (!reserva_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de reserva requerido',
      message: 'ID de reserva requerido',
    })
  }

  // Update estado → confirmada (idempotent guard: only from pendiente)
  const { data: updated, error } = await supabase
    .from('reservas')
    .update({ estado: 'confirmada' })
    .eq('id', reserva_id)
    .eq('estado', 'pendiente')
    .select('id, cliente_id, fecha_hora, numero_comensales, estado')
    .single()

  if (error || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al confirmar reserva',
      message: error?.message || 'No se pudo confirmar la reserva',
    })
  }

  // Fetch cliente email for notification
  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, apellidos, email')
    .eq('id', updated.cliente_id!)
    .single()

  if (cliente?.email) {
    sendConfirmationEmail(
      {
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        email: cliente.email,
        fecha_hora: updated.fecha_hora,
        comensales: updated.numero_comensales ?? 0,
        id: updated.id,
      },
      supabase,
      runtimeConfig,
    ).catch((err: any) => console.warn('[confirmar] Email send failed:', err.message))
  }

  return { success: true, estado: updated.estado }
})
