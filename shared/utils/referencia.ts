/**
 * shared/utils/referencia.ts — Short reservation reference codes
 *
 * Generates a human-friendly reference from a UUID + date:
 *   "240715-A4C9"  → YYMMDD + first 4 hex chars of UUID
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

export function generarReferencia(uuid: string, fecha?: string): string {
  const d = fecha ? new Date(fecha) : new Date()
  const yy = d.getFullYear().toString().slice(2)
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  const code = uuid.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `${yy}${mm}${dd}-${code}`
}
