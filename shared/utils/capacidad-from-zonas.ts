/**
 * capacidad-from-zonas.ts — Pure helper for zonas_config-derived aforo (CFG-004)
 *
 * configuracion.capacidad_total_local is DEPRECATED (AGENTS.md §4).
 * The real capacity ceiling = SUM of enabled zones in configuracion.zonas_config.
 *
 * Used by ConfiguracionForm ("Aforo del local" display) and the ocupacion_manual
 * max/validation so the configuration UI reflects the zonas-config-derived
 * ceiling instead of the deprecated integer column.
 */

import type { ZonaConfig } from '../contracts/reservation.contract'

/**
 * Sum the capacidad of ENABLED zones only.
 *
 * @param zonas - Array of ZonaConfig (enabled/capacidad) or nullish
 * @returns total enabled capacity (>=0)
 */
export function capacidadFromZonas(
  zonas: ZonaConfig[] | null | undefined,
): number {
  if (!zonas || !Array.isArray(zonas)) return 0
  return zonas.reduce(
    (sum, z) => sum + (z.enabled ? z.capacidad : 0),
    0,
  )
}