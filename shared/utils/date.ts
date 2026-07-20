/**
 * shared/utils/date.ts — Timezone-safe date utilities
 *
 * ALL date bugs in this codebase stem from the same anti-pattern:
 *   .toISOString().slice(0, 10)
 * which returns the UTC date, not the local date. In Spain (UTC+2 summer),
 * around midnight the UTC date is one day behind the local date.
 *
 * This utility centralizes all date operations to use local time methods.
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

/**
 * Convert a Date to YYYY-MM-DD in the local timezone.
 * Replaces all `d.toISOString().slice(0, 10)` patterns.
 */
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Convert an ISO string to YYYY-MM-DD in the local timezone.
 * Replaces all `fechaHora.slice(0, 10)` and `new Date(iso).toISOString().slice(0, 10)`.
 */
export function isoToLocalDate(iso: string): string {
  return toLocalDateString(new Date(iso))
}

/**
 * Convert a Date to datetime-local input format (YYYY-MM-DDTHH:MM) in local time.
 * Replaces `d.toISOString().slice(0, 16)` which gives UTC.
 */
export function toDatetimeLocal(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${da}T${h}:${mi}`
}

/**
 * Get the local timezone offset as a string like "+02:00" or "-05:00".
 */
export function localTimezoneOffset(): string {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  return `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
}

/**
 * Build a complete ISO 8601 fecha_hora with timezone offset.
 * Use when constructing reservation timestamps from date + time inputs.
 */
export function buildFechaHora(date: string, time: string): string {
  return `${date}T${time}:00${localTimezoneOffset()}`
}

/**
 * Compute a local date range as UTC ISO strings for Supabase timestamptz queries.
 * start = dateStr 00:00 local → UTC, end = next day 00:00 local → UTC.
 * Correctly captures all timestamptz rows during the local day.
 */
export function localDateRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!).toISOString()
  const end = new Date(y!, m! - 1, d! + 1).toISOString()
  return { start, end }
}

/**
 * Format an ISO timestamp for display in Spain (timezone-safe).
 * Works correctly on both server and client — never relies on system timezone.
 */
export function formatForSpain(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
