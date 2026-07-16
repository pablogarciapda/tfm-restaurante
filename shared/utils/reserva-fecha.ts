/**
 * Reserva date helpers — pure functions, no Vue/Konva deps.
 *
 * Used by /cocina/reservas to block editing/cancellation/reassignment
 * of reservations that fall before today (historical records are immutable).
 */

/**
 * Returns the YYYY-MM-DD date part of an ISO datetime string (or empty string).
 * Handles '2026-07-16T13:30:00' and '2026-07-16' formats.
 */
export function fechaReserva(fechaHora: string | null | undefined): string {
  if (!fechaHora) return ''
  return fechaHora.slice(0, 10)
}

/**
 * Returns true when a reservation's date is strictly before today
 * (i.e. it belongs to a past day). Today's reservations are NOT past.
 *
 * @param fechaHora ISO datetime string (e.g. '2026-07-16T13:30:00')
 * @param ahora      Optional injected "now" for deterministic tests
 */
export function esReservaPasada(
  fechaHora: string | null | undefined,
  ahora: Date = new Date(),
): boolean {
  const fecha = fechaReserva(fechaHora)
  if (!fecha) return false
  // Local YYYY-MM-DD of "now" (so the day boundary follows the user's tz)
  const y = ahora.getFullYear()
  const m = String(ahora.getMonth() + 1).padStart(2, '0')
  const d = String(ahora.getDate()).padStart(2, '0')
  const hoy = `${y}-${m}-${d}`
  return fecha < hoy
}
