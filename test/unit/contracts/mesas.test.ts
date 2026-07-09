/**
 * mesas.test.ts — Mesa, Zona, FusionGroup, AforoInfo contract tests
 *
 * Verifies type shapes: Mesa interface, Zona union, MesaEstado union,
 * FusionGroup interface, AforoMode, AforoInfo interface.
 */

import { describe, it, expect } from 'vitest'
import type {
  Mesa,
  Zona,
  MesaEstado,
  FusionGroup,
  AforoMode,
  AforoInfo,
} from '../../../shared/contracts/mesas.contract'

// --- Test helpers ---

function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    numero_mesa: 1,
    capacidad_base: 4,
    posicion_x: 100,
    posicion_y: 200,
    ancho: 100,
    alto: 100,
    rotacion: 0,
    zona: 'Principal',
    forma: 'rectangular',
    mesa_padre_id: null,
    id_fusion: null,
    capacidad_actual: 4,
    created_at: '2026-06-30T10:00:00.000Z',
    updated_at: '2026-06-30T10:00:00.000Z',
    ...overrides,
  }
}

// --- Mesa interface shape ---

describe('Mesa contract (SCH-006)', () => {
  it('has all required fields with correct types', () => {
    const mesa: Mesa = makeMesa()

    expect(typeof mesa.id).toBe('string')
    expect(typeof mesa.numero_mesa).toBe('number')
    expect(typeof mesa.capacidad_base).toBe('number')
    expect(typeof mesa.posicion_x).toBe('number')
    expect(typeof mesa.posicion_y).toBe('number')
    expect(typeof mesa.ancho).toBe('number')
    expect(typeof mesa.alto).toBe('number')
    expect(typeof mesa.rotacion).toBe('number')
    expect(typeof mesa.capacidad_actual).toBe('number')
    expect(typeof mesa.created_at).toBe('string')
    expect(typeof mesa.updated_at).toBe('string')
  })

  it('allows null for fusion fields', () => {
    const mesa = makeMesa({ mesa_padre_id: null, id_fusion: null })

    expect(mesa.mesa_padre_id).toBeNull()
    expect(mesa.id_fusion).toBeNull()
  })

  it('allows string for fusion fields when fused', () => {
    const fusionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const parentId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    const mesa = makeMesa({
      id_fusion: fusionId,
      mesa_padre_id: parentId,
      capacidad_actual: 6,
    })

    expect(mesa.id_fusion).toBe(fusionId)
    expect(mesa.mesa_padre_id).toBe(parentId)
    expect(mesa.capacidad_actual).toBe(6)
  })

  it('accepts all five valid zone values', () => {
    const zones: Zona[] = ['Principal', 'Zingaro', 'Privado', 'Terraza', 'Bar']

    for (const zona of zones) {
      const mesa = makeMesa({ zona })
      expect(mesa.zona).toBe(zona)
    }
  })
})

// --- Zona type ---

describe('Zona type', () => {
  it('is a union of 5 string literals', () => {
    const validZones: Zona[] = ['Principal', 'Zingaro', 'Privado', 'Terraza', 'Bar']
    expect(validZones).toHaveLength(5)
  })
})

// --- MesaEstado type ---

describe('MesaEstado type', () => {
  it('is a union of libre | ocupada | reservada', () => {
    const estados: MesaEstado[] = ['libre', 'ocupada', 'reservada']

    for (const estado of estados) {
      // If this compiles, the type is correct
      const assigned: MesaEstado = estado
      expect(assigned).toBe(estado)
    }

    expect(estados).toHaveLength(3)
  })
})

// --- FusionGroup interface ---

describe('FusionGroup contract', () => {
  it('has id_fusion, mesa_padre_id, mesas array, and capacidad_actual', () => {
    const mesa1 = makeMesa({ numero_mesa: 1, id_fusion: 'fff-1', mesa_padre_id: 'fff-1' })
    const mesa2 = makeMesa({ numero_mesa: 2, id_fusion: 'fff-1', mesa_padre_id: 'fff-1' })

    const group: FusionGroup = {
      id_fusion: 'fff-1',
      mesa_padre_id: 'fff-1',
      mesas: [mesa1, mesa2],
      capacidad_actual: 6,
    }

    expect(group.id_fusion).toBe('fff-1')
    expect(group.mesa_padre_id).toBe('fff-1')
    expect(group.mesas).toHaveLength(2)
    expect(group.mesas[0].numero_mesa).toBe(1)
    expect(group.mesas[1].numero_mesa).toBe(2)
    expect(group.capacidad_actual).toBe(6)
  })

  it('mesas array contains Mesa objects', () => {
    const mesas: Mesa[] = [makeMesa({ numero_mesa: 1 }), makeMesa({ numero_mesa: 2 })]

    const group: FusionGroup = {
      id_fusion: 'g1',
      mesa_padre_id: mesas[0].id,
      mesas,
      capacidad_actual: 6,
    }

    // Verify we can read through to Mesa properties
    expect(group.mesas[0].capacidad_base).toBe(4)
    expect(group.mesas[1].zona).toBe('Principal')
  })
})

// --- AforoMode type ---

describe('AforoMode type', () => {
  it("is a union of 'auto' | 'manual'", () => {
    const modes: AforoMode[] = ['auto', 'manual']

    for (const mode of modes) {
      const assigned: AforoMode = mode
      expect(assigned).toBe(mode)
    }

    expect(modes).toHaveLength(2)
  })
})

// --- AforoInfo interface ---

describe('AforoInfo contract', () => {
  it('has modo, capacidad_total, ocupacion_auto, ocupacion_manual, disponible', () => {
    const info: AforoInfo = {
      modo: 'auto',
      capacidad_total: 80,
      ocupacion_auto: 45,
      ocupacion_manual: 0,
      disponible: 35,
    }

    expect(info.modo).toBe('auto')
    expect(typeof info.capacidad_total).toBe('number')
    expect(typeof info.ocupacion_auto).toBe('number')
    expect(typeof info.ocupacion_manual).toBe('number')
    expect(typeof info.disponible).toBe('number')
  })

  it('manual mode uses ocupacion_manual for availability', () => {
    const info: AforoInfo = {
      modo: 'manual',
      capacidad_total: 80,
      ocupacion_auto: 10,
      ocupacion_manual: 50,
      disponible: 30,
    }

    expect(info.modo).toBe('manual')
    expect(info.ocupacion_manual).toBe(50)
    expect(info.disponible).toBe(30)
  })
})
