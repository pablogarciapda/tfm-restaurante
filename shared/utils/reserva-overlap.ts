/**
 * shared/utils/reserva-overlap.ts — Whole-service (turn) conflict detection
 *
 * Restaurant rule (consigna): a reservation on a mesa blocks that mesa for
 * the ENTIRE service (comida or cena) of that day — one reservation per table
 * per service. A reserva at 22:00 conflicts with 21:00 and vice versa.
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

/** Compatibility alias used across overlap helpers and callers. */
export type TimeWindow = TurnoWindow

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
 * Check if a new reservation conflicts with existing ones on the same mesa.
 *
 * Whole-service blocking: true when any active reservation (not cancelada /
 * completada) exists on the same date and same turn (comida or cena),
 * regardless of the exact hour — the table is committed for that service.
 *
 * @param existingReservas - Array of { fecha_hora, estado } for the same mesa
 * @param newTime - New reservation time as ISO string
 * @param turnos - Turn windows { comida: { start, end }, cena: { start, end } }
 * @returns true if there's a conflict (same date + same turn + active estado)
 */
export function hasMesaConflict(
  existingReservas: Array<{ fecha_hora: string; estado: string }>,
  newTime: string,
  turnos: { comida: TimeWindow; cena: TimeWindow },
): boolean {
  const newDate = parseLocalDate(newTime)
  const newMins = parseLocalMinutes(newTime)
  const newTurno = reservationTurn(newMins, turnos.comida, turnos.cena)
  if (!newTurno) return false

  const EXCLUDED = new Set(['cancelada', 'completada'])

  for (const r of existingReservas) {
    if (EXCLUDED.has(r.estado)) continue
    const rDate = parseLocalDate(r.fecha_hora)
    if (rDate !== newDate) continue

    const rMins = parseLocalMinutes(r.fecha_hora)
    const rTurno = reservationTurn(rMins, turnos.comida, turnos.cena)
    if (rTurno === newTurno) return true
  }

  return false
}

/** Parse ISO fecha_hora to local-time minutes from 00:00. */
function parseLocalMinutes(fecha_hora: string): number {
  const d = new Date(fecha_hora)
  return d.getHours() * 60 + d.getMinutes()
}

/** Parse ISO fecha_hora to local YYYY-MM-DD (timezone-safe, no UTC slice). */
function parseLocalDate(fecha_hora: string): string {
  const d = new Date(fecha_hora)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
