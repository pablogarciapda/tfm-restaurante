/**
 * shared/utils/slots.ts — Time slot generation from HorarioConfig
 *
 * Generates ordered time slots for lunch and dinner turns
 * based on configured hours and interval. Used by:
 *   - Client: ReservationForm slot grid (instant rendering)
 *   - Server: Reservation validation (slot membership check)
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

import type { HorarioConfig } from '#shared/contracts/reservation.contract'

// ──────────────────────────── Types ──────────────────────────────

/** A single slot option for the reservation form */
export interface SlotOption {
  hora: string // "HH:MM"
  label: string // "HH:MM" — 24h format
}

// ──────────────────────────── Helpers ─────────────────────────────

function toMinutes(hora: string): number {
  const parts = hora.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return h * 60 + m
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ──────────────────────────── Generation ──────────────────────────

/**
 * Generate slots for a single turn (lunch or dinner).
 *
 * @param inicio - Start time "HH:MM" (inclusive)
 * @param fin - End time "HH:MM" (inclusive if aligned with interval)
 * @param intervalo - Minutes between slots
 * @returns Ordered array of SlotOption within [inicio, fin)
 */
export function generateTurnSlots(inicio: string, fin: string, intervalo: number): SlotOption[] {
  const slots: SlotOption[] = []
  const finMinutes = toMinutes(fin)
  let current = toMinutes(inicio)

  while (current <= finMinutes) {
    const h = Math.floor(current / 60)
    const m = current % 60
    const hora = formatTime(h, m)
    slots.push({ hora, label: hora })
    current += intervalo
  }

  return slots
}

/**
 * Generate all slots for lunch + dinner turns from HorarioConfig.
 *
 * @param config - HorarioConfig with comida/cena times and interval
 * @returns Combined array of SlotOption ordered chronologically
 *
 * @example
 * generateSlots({ comida_inicio: "13:30", comida_fin: "15:30", cena_inicio: "21:00", cena_fin: "23:30", intervalo_minutos: 15 })
 * // Returns 8 lunch + 10 dinner = 18 slots
 */
export function generateSlots(config: HorarioConfig): SlotOption[] {
  return [
    ...generateTurnSlots(config.comida_inicio, config.comida_fin, config.intervalo_minutos),
    ...generateTurnSlots(config.cena_inicio, config.cena_fin, config.intervalo_minutos),
  ]
}

/**
 * Generate slots for a specific date (placeholder for future date-scoped logic).
 * Currently delegates to generateSlots — slots are time-only, not date-specific.
 */
export function generateDateSlots(_fecha: string, config: HorarioConfig): SlotOption[] {
  return generateSlots(config)
}

// ──────────────────────────── Validation ──────────────────────────

/**
 * Check if a given time string falls within any configured turn slot.
 * Uses ±5 minute tolerance for clock drift.
 *
 * @param hora - Time string "HH:MM" to validate
 * @param config - HorarioConfig with turn boundaries and interval
 * @returns true if the time falls within a valid slot
 */
export function isSlotInRange(hora: string, config: HorarioConfig): boolean {
  const candidate = toMinutes(hora)

  const lunchStart = toMinutes(config.comida_inicio)
  const lunchEnd = toMinutes(config.comida_fin)
  const dinnerStart = toMinutes(config.cena_inicio)
  const dinnerEnd = toMinutes(config.cena_fin)
  const tolerance = 5 // ±5 minutes for clock drift

  // Check lunch
  if (candidate >= lunchStart - tolerance && candidate < lunchEnd + tolerance) {
    // Compute distance from closest slot
    const offsetFromStart = candidate - lunchStart
    const remainder = ((offsetFromStart % config.intervalo_minutos) + config.intervalo_minutos) % config.intervalo_minutos
    if (remainder <= tolerance || remainder >= config.intervalo_minutos - tolerance) {
      return true
    }
  }

  // Check dinner
  if (candidate >= dinnerStart - tolerance && candidate < dinnerEnd + tolerance) {
    const offsetFromStart = candidate - dinnerStart
    const remainder = ((offsetFromStart % config.intervalo_minutos) + config.intervalo_minutos) % config.intervalo_minutos
    if (remainder <= tolerance || remainder >= config.intervalo_minutos - tolerance) {
      return true
    }
  }

  return false
}

// ──────────────────────────── Formatting ──────────────────────────

/**
 * Format a slot label. 24h format (HH:MM) for Spain.
 * Could be extended to AM/PM or other locales.
 */
export function formatSlotLabel(hora: string): string {
  return hora
}
