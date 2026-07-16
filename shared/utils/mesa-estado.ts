/**
 * shared/utils/mesa-estado.ts — MCA-005 mesa status derived from reservas
 *
 * PURE mapping function — no Vue, no Konva, no Supabase. Lives in shared/ so
 * client (TableCanvas) and server can share the exact same derivation rule.
 *
 * Acceptance (spec MCA-005, mesas-canvas):
 *   Libre     — no active reserva                          → #22C55E
 *   Ocupada   — estado='confirmada', current service       → #EF4444
 *   Reservada — estado='pendiente', future                 → #F59E0B
 *
 * "Current service" = selectedDate + active turn window. A reserva matches the
 * current service when its fecha_hora date equals selectedDate and its HH:MM
 * falls inside the active turn window (comida or cena). `todos` = any time on
 * selectedDate counts.
 *
 * Priority: ocupada > reservada > libre.
 * Excluded estados: 'cancelada' and 'standby' (these never mark a mesa).
 *
 * Reserva→mesa linking is via `reservas.mesa_id` (direct FK → mesas.id).
 * Zona-level reservations (zona_id only, no mesa_id) are ignored at the
 * mesa-color level by design — they only affect the aforo bar.
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */
import type { MesaEstado } from '../contracts/mesas.contract'
import type { HorarioConfig } from '../contracts/reservation.contract'

// ──────────────────────────── Types ────────────────────────────────

/** Active turn selection mirrored from `canvas-store.TurnoFilter`. */
export type MesaTurno = 'todos' | 'comida' | 'cena'

/** Half-open time window in minutes from 00:00: [start, end). */
export interface TurnoWindow {
  start: number
  end: number
}

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
    comida: TurnoWindow
    cena: TurnoWindow
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

/**
 * Build comida + cena windows from HorarioConfig.
 *
 * Cena windows that cross midnight (e.g. 21:00 → 01:00) keep end < start;
 * callers must treat them specially (see `timeInWindow`).
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

/** Check if a given minute-of-day falls inside a (possibly wrap-around) window. */
function timeInWindow(mins: number, w: TurnoWindow): boolean {
  if (w.end > w.start) {
    return mins >= w.start && mins < w.end
  }
  // Crosses midnight: [start, 24:00) OR [00:00, end)
  return mins >= w.start || mins < w.end
}

/** Extract YYYY-MM-DD from an ISO fecha_hora string (no tz shift). */
function reservaDate(fecha_hora: string): string {
  return fecha_hora.slice(0, 10)
}

/** Extract HH:MM in minutes from an ISO fecha_hora string. */
function reservaMinutes(fecha_hora: string): number {
  const time = fecha_hora.slice(11, 16) // "HH:MM"
  return toMinutes(time)
}

// ──────────────────────────── Core ─────────────────────────────────

/**
 * Derive a mesa's estado from its reservas for the given context.
 *
 * Priority: ocupada > reservada > libre. Excluded estados (cancelada / standby)
 * are dropped before evaluation. The pure function is reactive-friendly:
 * callers in `TableCanvas.vue` recompute on every reservas / turn / date
 * change. Realtime updates modify the reservas array and trigger recompute.
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

    // "Current service" match: same date AND same active turn window.
    const sameDate = date === selectedDate
    let inCurrentService = false
    if (sameDate) {
      if (currentTurn === 'todos') {
        inCurrentService = true
      } else {
        const mins = reservaMinutes(r.fecha_hora)
        const window = currentTurn === 'comida' ? turnos.comida : turnos.cena
        inCurrentService = timeInWindow(mins, window)
      }
    }

    // "Future": strictly after selectedDate.
    const isFuture = date > selectedDate

    if (r.estado === 'confirmada' || r.estado === 'completada') {
      // Ocupada only when in the current service.
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