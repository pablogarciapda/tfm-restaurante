/**
 * shared/utils/mesa-estado.ts — MCA-005 mesa status derived from reservas
 *
 * PURE mapping function — no Vue, no Konva, no Supabase. Lives in shared/ so
 * client (TableCanvas) and server can share the exact same derivation rule.
 *
 * Acceptance (spec MCA-005, mesas-canvas):
 *   Libre     — no active reserva                          → #22C55E
 *   Ocupada   — estado='confirmada', same day+turn         → #EF4444
 *   Reservada — estado='pendiente', future                 → #F59E0B
 *
 * A reservation blocks the table for its BOOKING DURATION (default: 90 min
 * comida / 120 min cena), not the entire turn. Two reservations on the same
 * table at different hours within the same turn CAN coexist if their windows
 * don't overlap.
 *
 * "Current service" = selectedDate + active turn window. A reserva matches the
 * current service when its fecha_hora date equals selectedDate and its HH:MM
 * falls inside the active turn window (comida or cena). `todos` = any time on
 * selectedDate counts.
 *
 * Priority: ocupada > reservada > libre.
 * Excluded estados: 'cancelada', 'completada', and 'standby' (these never mark a mesa).
 *
 * Reserva→mesa linking is via `reservas.mesa_id` (direct FK → mesas.id).
 * Zona-level reservations (zona_id only, no mesa_id) are ignored at the
 * mesa-color level by design — they only affect the aforo bar.
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */
import type { MesaEstado } from '../contracts/mesas.contract'
import {
  DEFAULT_DURACION_COMIDA,
  DEFAULT_DURACION_CENA,
  bookingWindow,
  reservationTurn,
  windowsOverlap,
} from './reserva-overlap'
export type { TurnoWindow } from './reserva-overlap'
export { buildTurnoWindows } from './reserva-overlap'

// ──────────────────────────── Types ────────────────────────────────

/** Active turn selection mirrored from `canvas-store.TurnoFilter`. */
export type MesaTurno = 'todos' | 'comida' | 'cena'

/** Strip of a reserva that feeds the mesa-color derivation. */
export interface ReservaMesaEstado {
  mesa_id: string | null
  estado: string
  fecha_hora: string
}

/** Context needed to derive a mesa's estado. */
export interface MesaEstadoContext {
  /** Selected day in YYYY-MM-DD format. */
  selectedDate: string
  /** Active turn: 'todos' = any turn on selectedDate. */
  currentTurn: MesaTurno
  /** Comida and cena time windows (minutes from 00:00). */
  turnos: {
    comida: { start: number; end: number }
    cena: { start: number; end: number }
  }
}

// ──────────────────────────── Helpers ───────────────────────────────

function toMinutes(hora: string): number {
  const parts = hora.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return h * 60 + m
}

/** Estados that NEVER mark a mesa — they are visually invisible. */
const EXCLUDED_ESTADOS = new Set(['cancelada', 'standby'])

/** Check if a given minute-of-day falls inside a (possibly wrap-around) window. */
function timeInWindow(mins: number, w: TurnoWindow): boolean {
  if (w.end > w.start) {
    return mins >= w.start && mins <= w.end
  }
  // Crosses midnight: [start, 24:00) OR [00:00, end]
  return mins >= w.start || mins <= w.end
}

/** Extract YYYY-MM-DD in local timezone from an ISO fecha_hora string. */
function reservaDate(fecha_hora: string): string {
  const d = new Date(fecha_hora)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Extract HH:MM in local-time minutes from an ISO fecha_hora string.
 *
 * Converts UTC timestamps to the runtime's local timezone (CEST for the
 * restaurant), so a reservation at `13:00+00:00` correctly maps to
 * the comida window (13:30-15:30 local) instead of being treated as 13:00.
 */
function reservaMinutes(fecha_hora: string): number {
  const d = new Date(fecha_hora)
  return d.getHours() * 60 + d.getMinutes()
}

// ──────────────────────────── Core ─────────────────────────────────

/**
 * Derive a mesa's estado from its reservas for the given context.
 *
 * Priority: ocupada > reservada > libre. Excluded estados (cancelada / standby)
 * are dropped before evaluation. The pure function is reactive-friendly:
 * callers in `TableCanvas.vue` recompute on every reservas / turn / date
 * change. Realtime updates modify the reservas array and trigger recompute.
 *
 * Uses booking-window overlap instead of full-turn blocking:
 * a reservation at 14:00 (90 min) blocks until 15:30, not until the
 * end of the entire comida turn.
 */
export function calcularEstadoMesa(
  mesaId: string,
  reservas: ReservaMesaEstado[],
  context: MesaEstadoContext,
): MesaEstado {
  const { selectedDate, currentTurn, turnos } = context

  let isOcupada = false
  let isReservada = false

  for (const r of reservas) {
    if (r.mesa_id !== mesaId) continue
    if (EXCLUDED_ESTADOS.has(r.estado)) continue

    const date = reservaDate(r.fecha_hora)

    // "Current service" match: same date AND the reservation's booking window
    // overlaps with the active turn window.
    const sameDate = date === selectedDate
    let inCurrentService = false
    if (sameDate) {
      if (currentTurn === 'todos') {
        inCurrentService = true
      } else {
        const mins = reservaMinutes(r.fecha_hora)
        const window = currentTurn === 'comida' ? turnos.comida : turnos.cena
        const turno = reservationTurn(mins, turnos.comida, turnos.cena)
        if (turno === currentTurn) {
          // Check if the reservation's booking window overlaps with the turn window
          const duration = turno === 'comida' ? DEFAULT_DURACION_COMIDA : DEFAULT_DURACION_CENA
          const resWin = bookingWindow(mins, turno, duration)
          inCurrentService = windowsOverlap(resWin, window)
        }
      }
    }

    // "Future": strictly after selectedDate.
    const isFuture = date > selectedDate

    if (r.estado === 'confirmada') {
      // Ocupada when the reservation's booking window overlaps the current turn.
      if (inCurrentService) isOcupada = true
    } else if (r.estado === 'pendiente') {
      // Reservada when it is on the selected day (any turn — waitlist alert
      // for later today) OR on a strictly future date.
      if (sameDate || isFuture) isReservada = true
    }
    // Other estados fall through — they do not mark the mesa.
  }

  if (isOcupada) return 'ocupada'
  if (isReservada) return 'reservada'
  return 'libre'
}