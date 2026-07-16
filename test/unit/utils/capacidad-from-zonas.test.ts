/**
 * capacidad-from-zonas.test.ts — Pure helper for zonas_config-derived aforo
 *
 * capacidad_total_local is DEPRECATED (AGENTS.md §4). Real capacity ceiling
 * = SUM of enabled zones in configuracion.zonas_config JSONB.
 */
import { describe, it, expect } from 'vitest'
import { capacidadFromZonas } from '../../../shared/utils/capacidad-from-zonas'
import type { ZonaConfig } from '../../../shared/contracts/reservation.contract'

function zona(overrides: Partial<ZonaConfig> & { id: string }): ZonaConfig {
  return { nombre: 'Zona', capacidad: 10, enabled: true, ...overrides }
}

describe('capacidadFromZonas (CFG-004 aforo ceiling)', () => {
  it('returns 0 for null/undefined/empty input', () => {
    expect(capacidadFromZonas(null)).toBe(0)
    expect(capacidadFromZonas(undefined)).toBe(0)
    expect(capacidadFromZonas([])).toBe(0)
  })

  it('sums capacidad of all zones when all are enabled', () => {
    const zonas: ZonaConfig[] = [
      zona({ id: 'a', capacidad: 70, enabled: true }),
      zona({ id: 'b', capacidad: 14, enabled: true }),
      zona({ id: 'c', capacidad: 60, enabled: true }),
      zona({ id: 'd', capacidad: 100, enabled: true }),
      zona({ id: 'e', capacidad: 20, enabled: true }),
    ]
    // 70+14+60+100+20 = 264
    expect(capacidadFromZonas(zonas)).toBe(264)
  })

  it('ignores capacidad of disabled zones', () => {
    const zonas: ZonaConfig[] = [
      zona({ id: 'a', capacidad: 70, enabled: true }),
      zona({ id: 'b', capacidad: 14, enabled: false }),
      zona({ id: 'c', capacidad: 60, enabled: true }),
      zona({ id: 'd', capacidad: 100, enabled: false }),
      zona({ id: 'e', capacidad: 20, enabled: true }),
    ]
    // 70+60+20 = 150
    expect(capacidadFromZonas(zonas)).toBe(150)
  })

  it('returns 0 when all zones are disabled', () => {
    const zonas: ZonaConfig[] = [
      zona({ id: 'a', capacidad: 70, enabled: false }),
      zona({ id: 'b', capacidad: 14, enabled: false }),
    ]
    expect(capacidadFromZonas(zonas)).toBe(0)
  })
})