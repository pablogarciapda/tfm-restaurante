/**
 * GET /api/reservas/cancelar-info — Preview reservation info by cancel token
 *
 * Public endpoint. Returns reservation details for the cancellation preview
 * page so the user can see what they are cancelling before confirming.
 *
 * Returns 404 if token is invalid or already used/cancelled.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { generarReferencia } from '#shared/utils/referencia'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token || typeof token !== 'string' || !token.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token de cancelación requerido',
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: reserva, error } = await supabase
    .from('reservas')
    .select('id, fecha_hora, numero_comensales, estado, cliente_id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (error) {
    console.warn('[cancelar-info] DB error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al buscar la reserva',
    })
  }

  if (!reserva) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Token de cancelación no válido',
    })
  }

  // If already cancelled, inform the user
  if (reserva.estado === 'cancelada') {
    throw createError({
      statusCode: 410,
      statusMessage: 'Esta reserva ya ha sido cancelada',
    })
  }

  // If completed or past, cannot cancel
  if (reserva.estado === 'completada' || new Date(reserva.fecha_hora) <= new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Esta reserva ya ha pasado y no se puede cancelar',
    })
  }

  const ref = reserva.numero_comensales
    ? generarReferencia(reserva.id, reserva.fecha_hora)
    : undefined

  return {
    fecha_hora: reserva.fecha_hora,
    numero_comensales: reserva.numero_comensales,
    estado: reserva.estado,
    referencia: ref,
  }
})
