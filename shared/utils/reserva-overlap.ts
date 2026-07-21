/**
 * shared/utils/reserva-overlap.ts — Time-window overlap detection for reservations
 *
 * Replaces the "full-turn blocking" model with a "booking duration" model:
 * a reservation at 14:00 blocks the table until 15:30 (90 min), not until
 * the end of the entire comida turn (15:30).
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

import type { HorarioConfig } from '#shared/contracts/reservation.contract'

/** Default booking durations in minutes per turn type. */
export const DEFAULT_DURACION_COMIDA = 90
export const DEFAULT_DURACION_CENA = 120

/** Half-open time window: [start, end) in minutes from 00:00. */
export interface TurnoWindow {
  start: number
  end: number
}

/**
 * Build comida + cena windows from HorarioConfig.
 *
 * Cena windows that cross midnight (e.g. 21:00 → 01:00) keep end < start;
 * callers must treat them specially (see `timeInWindow` in mesa-estado.ts).
 */
export function buildTurnoWindows(h: HorarioConfig): {
  comida: TurnoWindow
  cena: TurnoWindow
} {
  return {
    comida: { start: toMinutes(h.comida_inicio), end: toMinutes(h.comida_fin) },
    cena: { start: toMinutes(h.cena_inicio), end: toMinutes(h.cena_fin) },
  }
}

function toMinutes(hora: string): number {
  const parts = hora.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

/**
 * Check if two half-open time windows overlap.
 * Windows are [start, end) in minutes from midnight.
 */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Compute the booking window for a reservation.
 *
 * @param reservaMinutes - Reservation start time in minutes from 00:00
 * @param turno - 'comida' or 'cena'
 * @param customDuration - Optional override in minutes (from config)
 * @returns Half-open window [start, start + duration)
 */
export function bookingWindow(
  reservaMinutes: number,
  turno: 'comida' | 'cena',
  customDuration?: number,
): TimeWindow {
  const duration = customDuration
    ?? (turno === 'comida' ? DEFAULT_DURACION_COMIDA : DEFAULT_DURACION_CENA)
  return { start: reservaMinutes, end: reservaMinutes + duration }
}

/**
 * Determine which turn a reservation time falls in.
 *
 * @param reservaMinutes - Time in minutes from 00:00
 * @param comidaWindow - Comida turn window
 * @param cenaWindow - Cena turn window
 * @returns 'comida', 'cena', or null if outside both turns
 */
export function reservationTurn(
  reservaMinutes: number,
  comidaWindow: TimeWindow,
  cenaWindow: TimeWindow,
): 'comida' | 'cena' | null {
  if (reservaMinutes >= comidaWindow.start && reservaMinutes < comidaWindow.end) return 'comida'
  // Handle cena crossing midnight
  if (cenaWindow.end <= cenaWindow.start) {
    if (reservaMinutes >= cenaWindow.start || reservaMinutes < cenaWindow.end) return 'cena'
  } else {
    if (reservaMinutes >= cenaWindow.start && reservaMinutes < cenaWindow.end) return 'cena'
  }
  return null
}

/**
 * Check if a new reservation overlaps with an existing one on the same table.
 *
 * @param existingMinutes - Existing reservation time in minutes
 * @param newMinutes - New reservation time in minutes
 * @param turno - Which turn both reservations are in
 * @param customDuration - Optional duration override from config
 * @returns true if the windows overlap (conflict)
 */
export function reservaOverlaps(
  existingMinutes: number,
  newMinutes: number,
  turno: 'comida' | 'cena',
  customDuration?: number,
): boolean {
  const existingWin = bookingWindow(existingMinutes, turno, customDuration)
  const newWin = bookingWindow(newMinutes, turno, customDuration)
  return windowsOverlap(existingWin, newWin)
}

/**
 * Check if a mesa has conflicting reservations for a given time.
 *
 * @param existingReservas - Array of { fecha_hora, estado, mesa_id } for the same mesa on the same date
 * @param newTime - New reservation time as ISO string
 * @param turnos - Turn windows { comida: { start, end }, cena: { start, end } }
 * @returns true if there's a conflict (new reservation overlaps an existing one)
 */
export function hasMesaConflict(
  existingReservas: Array<{ fecha_hora: string; estado: string }>,
  newTime: string,
  turnos: { comida: TimeWindow; cena: TimeWindow },
): boolean {
  const newDate = newTime.slice(0, 10)
  const newMins = parseLocalMinutes(newTime)
  const newTurno = reservationTurn(newMins, turnos.comida, turnos.cena)
  if (!newTurno) return false

  const EXCLUDED = new Set(['cancelada', 'completada'])

  for (const r of existingReservas) {
    if (EXCLUDED.has(r.estado)) continue
    const rDate = r.fecha_hora.slice(0, 10)
    if (rDate !== newDate) continue

    const rMins = parseLocalMinutes(r.fecha_hora)
    const rTurno = reservationTurn(rMins, turnos.comida, turnos.cena)
    if (rTurno !== newTurno) continue

    if (reservaOverlaps(rMins, newMins, rTurno)) return true
  }

  return false
}

/** Parse ISO fecha_hora to local-time minutes from 00:00. */
function parseLocalMinutes(fecha_hora: string): number {
  const d = new Date(fecha_hora)
  return d.getHours() * 60 + d.getMinutes()
}
