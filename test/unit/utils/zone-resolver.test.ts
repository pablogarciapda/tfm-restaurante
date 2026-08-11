import { describe, expect, it } from 'vitest'
import { resolveZone, zoneMatches } from '#shared/utils/zone-resolver'

const zones = [
  { id: 'principal-id', nombre: 'Principal', capacidad: 70, enabled: true },
  { id: 'new-zone-id', nombre: 'Sala Nueva', capacidad: 20, enabled: true },
  { id: 'disabled-id', nombre: 'Cerrada', capacidad: 10, enabled: false },
]

describe('zone resolver', () => {
  it('prefers the canonical ID and resolves names case-insensitively', () => {
    expect(resolveZone('principal-id', zones)).toEqual({ id: 'principal-id', nombre: 'Principal' })
    expect(resolveZone(' sala nueva ', zones)).toEqual({ id: 'new-zone-id', nombre: 'Sala Nueva' })
  })

  it('supports historical aliases only when they map to configured zones', () => {
    expect(resolveZone('privado', [{ id: 'reservado', nombre: 'Reservado', capacidad: 10, enabled: true }])).toEqual({
      id: 'reservado',
      nombre: 'Reservado',
    })
    expect(resolveZone('Cerrada', zones)).toBeNull()
  })

  it('matches legacy display-name rows to canonical active zones', () => {
    expect(zoneMatches('Sala Nueva', zones[1]!, zones)).toBe(true)
    expect(zoneMatches('unknown', zones[1]!, zones)).toBe(false)
  })
})
