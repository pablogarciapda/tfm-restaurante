/**
 * fusion-math.test.ts — Pure function tests for table fusion logic
 *
 * Covers: calculateFusedCapacity, canFuse, fuseTables, unfuseTables,
 * getAforoDisponible, getMesaEstado
 *
 * Spec refs: MFU-001, MFU-002, SCH-010, MCA-005, MCA-006
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Mesa } from '../../../shared/contracts/mesas.contract'
import {
  calculateFusedCapacity,
  calculateFusionPositions,
  canFuse,
  fuseTables,
  unfuseTables,
  getAforoDisponible,
  getMesaEstado,
} from '../../../shared/utils/fusion-math'

// --- Helpers ---

function makeMesa(overrides: Partial<Mesa> & { id: string }): Mesa {
  return {
    numero_mesa: 1,
    capacidad_base: 4,
    posicion_x: 0,
    posicion_y: 0,
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

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================================
// calculateFusedCapacity
// ============================================================================

describe('calculateFusedCapacity (MFU-002)', () => {
  it('[4,4] → 6 (floor(8*0.75)=6)', () => {
    const mesas = [{ capacidad_base: 4 }, { capacidad_base: 4 }]
    expect(calculateFusedCapacity(mesas)).toBe(6)
  })

  it('[4,4,4] → 9 (floor(12*0.75)=9)', () => {
    const mesas = [
      { capacidad_base: 4 },
      { capacidad_base: 4 },
      { capacidad_base: 4 },
    ]
    expect(calculateFusedCapacity(mesas)).toBe(9)
  })

  it('[2,2] → 3 (floor(4*0.75)=3)', () => {
    const mesas = [{ capacidad_base: 2 }, { capacidad_base: 2 }]
    expect(calculateFusedCapacity(mesas)).toBe(3)
  })

  it('[6] → 4 (single table — floor(6*0.75)=4)', () => {
    const mesas = [{ capacidad_base: 6 }]
    expect(calculateFusedCapacity(mesas)).toBe(4)
  })

  it('[] → 0 (empty array)', () => {
    expect(calculateFusedCapacity([])).toBe(0)
  })

  it('[4,4,2] → 7 (floor(10*0.75)=7) from spec', () => {
    const mesas = [
      { capacidad_base: 4 },
      { capacidad_base: 4 },
      { capacidad_base: 2 },
    ]
    expect(calculateFusedCapacity(mesas)).toBe(7)
  })

  it('handles fractional floor correctly: [3,3] → 4 (floor(6*0.75)=4)', () => {
    const mesas = [{ capacidad_base: 3 }, { capacidad_base: 3 }]
    expect(calculateFusedCapacity(mesas)).toBe(4)
  })
})

// ============================================================================
// calculateFusionPositions
// ============================================================================

describe('calculateFusionPositions', () => {
  const parent = {
    id: 'p1',
    posicion_x: 100,
    posicion_y: 200,
    ancho: 100,
    alto: 100,
  }

  it('places one child to the right of parent (touching)', () => {
    const child = { id: 'c1', ancho: 80, alto: 80 }
    const result = calculateFusionPositions(parent, [child], 1200, 800)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
    expect(result[0].posicion_x).toBe(200) // parent.x + parent.ancho
    expect(result[0].posicion_y).toBe(200) // parent.y
  })

  it('wraps child to next row when it does not fit horizontally', () => {
    const child = { id: 'c1', ancho: 80, alto: 80 }
    // Stage width is just enough for the parent but not the child next to it
    const result = calculateFusionPositions(parent, [child], 150, 800)

    expect(result[0].posicion_x).toBe(100) // wrapped back to parent.x
    expect(result[0].posicion_y).toBe(300) // parent.y + parent.alto + gap
  })

  it('positions multiple children in a row', () => {
    const children = [
      { id: 'c1', ancho: 80, alto: 80 },
      { id: 'c2', ancho: 90, alto: 100 },
      { id: 'c3', ancho: 70, alto: 70 },
    ]
    const result = calculateFusionPositions(parent, children, 1200, 800)

    expect(result).toHaveLength(3)
    expect(result[0].posicion_x).toBe(200) // parent.x + parent.ancho
    expect(result[1].posicion_x).toBe(280) // c1.x + c1.ancho
    expect(result[2].posicion_x).toBe(370) // c2.x + c2.ancho
    // All same y (same row)
    expect(result[0].posicion_y).toBe(200)
    expect(result[1].posicion_y).toBe(200)
    expect(result[2].posicion_y).toBe(200)
  })

  it('returns empty array for empty children', () => {
    const result = calculateFusionPositions(parent, [], 1200, 800)
    expect(result).toEqual([])
  })
})

// ============================================================================
// canFuse
// ============================================================================

describe('canFuse (MFU-001)', () => {
  it('same zone, all null fusion → true', () => {
    const mesas = [
      { zona: 'Principal' as const, id_fusion: null },
      { zona: 'Principal' as const, id_fusion: null },
    ]
    expect(canFuse(mesas)).toBe(true)
  })

  it('different zones → false', () => {
    const mesas = [
      { zona: 'Principal' as const, id_fusion: null },
      { zona: 'Terraza' as const, id_fusion: null },
    ]
    expect(canFuse(mesas)).toBe(false)
  })

  it('one already fused, one standalone → true (adding to existing group)', () => {
    const mesas = [
      { zona: 'Principal' as const, id_fusion: 'g1' },
      { zona: 'Principal' as const, id_fusion: null },
    ]
    // Adding a standalone table to an existing fusion group is valid
    expect(canFuse(mesas)).toBe(true)
  })

  it('all same fusion group → true (re-fuse / add more)', () => {
    const mesas = [
      { zona: 'Principal' as const, id_fusion: 'g1' },
      { zona: 'Principal' as const, id_fusion: 'g1' },
      { zona: 'Principal' as const, id_fusion: null },
    ]
    expect(canFuse(mesas)).toBe(true)
  })

  it('mixed fusion groups → false', () => {
    const mesas = [
      { zona: 'Principal' as const, id_fusion: 'g1' },
      { zona: 'Principal' as const, id_fusion: 'g2' },
    ]
    expect(canFuse(mesas)).toBe(false)
  })

  it('single table with null fusion → true (start new fusion)', () => {
    const mesas = [{ zona: 'Bar' as const, id_fusion: null }]
    expect(canFuse(mesas)).toBe(true)
  })

  it('empty array → false', () => {
    expect(canFuse([])).toBe(false)
  })
})

// ============================================================================
// fuseTables
// ============================================================================

describe('fuseTables (MFU-001/002)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns correct parent + id_fusion + capacidad, does NOT mutate input', () => {
    const mesa1: Mesa = makeMesa({ id: 'id-1', numero_mesa: 1, capacidad_base: 4 })
    const mesa2: Mesa = makeMesa({ id: 'id-2', numero_mesa: 2, capacidad_base: 4 })

    // Deep-clone for mutation check
    const snapshot1 = JSON.parse(JSON.stringify(mesa1))
    const snapshot2 = JSON.parse(JSON.stringify(mesa2))

    const result = fuseTables([mesa1, mesa2], ['id-1', 'id-2'])

    // Result shape
    expect(result.mesa_padre_id).toBe('id-1')
    expect(result.capacidad_actual).toBe(6) // floor(8*0.75)
    expect(typeof result.id_fusion).toBe('string')
    expect(result.id_fusion.length).toBeGreaterThan(0)

    // Mutation check
    expect(mesa1).toEqual(snapshot1)
    expect(mesa2).toEqual(snapshot2)
    expect(mesa1.mesa_padre_id).toBeNull()
    expect(mesa1.id_fusion).toBeNull()
  })

  it('first selected ID becomes parent', () => {
    const mesas: Mesa[] = [
      makeMesa({ id: 'bbb', numero_mesa: 1 }),
      makeMesa({ id: 'aaa', numero_mesa: 2 }),
    ]

    const result = fuseTables(mesas, ['aaa', 'bbb'])
    expect(result.mesa_padre_id).toBe('aaa')
  })

  it('generates unique id_fusion for each call', () => {
    const mesas: Mesa[] = [makeMesa({ id: 'a' }), makeMesa({ id: 'b' })]

    const r1 = fuseTables(mesas, ['a', 'b'])
    const r2 = fuseTables(mesas, ['a', 'b'])

    expect(r1.id_fusion).not.toBe(r2.id_fusion)
  })
})

// ============================================================================
// unfuseTables
// ============================================================================

describe('unfuseTables (MFU-004)', () => {
  it('restores capacidad_base, clears fusion fields, does NOT mutate input', () => {
    const mesa1: Mesa = makeMesa({
      id: 'id-1',
      capacidad_base: 4,
      capacidad_actual: 6,
      id_fusion: 'fff',
      mesa_padre_id: 'id-1',
    })
    const mesa2: Mesa = makeMesa({
      id: 'id-2',
      capacidad_base: 4,
      capacidad_actual: 6,
      id_fusion: 'fff',
      mesa_padre_id: 'id-1',
    })
    const mesa3: Mesa = makeMesa({
      id: 'id-3',
      capacidad_base: 2,
      capacidad_actual: 2,
      id_fusion: null,
      mesa_padre_id: null,
    })

    // Clones for mutation check
    const snap1 = JSON.parse(JSON.stringify(mesa1))
    const snap2 = JSON.parse(JSON.stringify(mesa2))
    const snap3 = JSON.parse(JSON.stringify(mesa3))

    const result = unfuseTables([mesa1, mesa2, mesa3], 'fff')

    // Mesa1 and mesa2 should be unfused
    const r1 = result.find((m) => m.id === 'id-1')!
    expect(r1.capacidad_actual).toBe(4) // restored to capacidad_base
    expect(r1.id_fusion).toBeNull()
    expect(r1.mesa_padre_id).toBeNull()

    const r2 = result.find((m) => m.id === 'id-2')!
    expect(r2.capacidad_actual).toBe(4)
    expect(r2.id_fusion).toBeNull()
    expect(r2.mesa_padre_id).toBeNull()

    // Mesa3 untouched
    const r3 = result.find((m) => m.id === 'id-3')!
    expect(r3.capacidad_actual).toBe(2)
    expect(r3.id_fusion).toBeNull()
    expect(r3.mesa_padre_id).toBeNull()

    // Mutation check
    expect(mesa1).toEqual(snap1)
    expect(mesa2).toEqual(snap2)
    expect(mesa3).toEqual(snap3)
  })

  it('returns NEW array (not same reference)', () => {
    const mesas: Mesa[] = [makeMesa({ id: 'a', id_fusion: 'fff', mesa_padre_id: 'a' })]
    const result = unfuseTables(mesas, 'fff')

    expect(result).not.toBe(mesas)
    expect(result).toHaveLength(1)
  })

  it('leaves non-matching tables unchanged', () => {
    const fused: Mesa = makeMesa({ id: 'a', id_fusion: 'g1', mesa_padre_id: 'a', capacidad_base: 4, capacidad_actual: 6 })
    const free: Mesa = makeMesa({ id: 'b', id_fusion: null, mesa_padre_id: null, capacidad_base: 2, capacidad_actual: 2 })

    const result = unfuseTables([fused, free], 'g1')

    const rFree = result.find((m) => m.id === 'b')!
    expect(rFree.capacidad_actual).toBe(2)
    expect(rFree.id_fusion).toBeNull()
  })
})

// ============================================================================
// getAforoDisponible
// ============================================================================

describe('getAforoDisponible (MCA-006, SCH-010)', () => {
  it('auto mode: capacidadTotal - sum(capacidad_actual of parent mesas only)', () => {
    // Three tables: parent mesa A (capacidad_actual=6), child B (capacidad_actual=6),
    // standalone C (capacidad_actual=2). Only parent A and standalone C counted.
    const mesas: Mesa[] = [
      makeMesa({ id: 'a', capacidad_actual: 6, mesa_padre_id: null }), // root/parent
      makeMesa({ id: 'b', capacidad_actual: 6, mesa_padre_id: 'a', id_fusion: 'g1' }), // child
      makeMesa({ id: 'c', capacidad_actual: 2, mesa_padre_id: null }), // standalone
    ]

    const disponible = getAforoDisponible(mesas, 80, 'auto', 0)
    // 80 - (6 + 2) = 72 — child table b is NOT counted
    expect(disponible).toBe(72)
  })

  it('auto mode: empty mesas → capacidadTotal', () => {
    expect(getAforoDisponible([], 50, 'auto', 0)).toBe(50)
  })

  it('manual mode: capacidadTotal - ocupacionManual', () => {
    const mesas: Mesa[] = [makeMesa({ id: 'a', capacidad_actual: 10 })]
    expect(getAforoDisponible(mesas, 80, 'manual', 45)).toBe(35)
  })

  it('manual mode: ignores actual mesa capacities', () => {
    // Even with 100 capacity in mesas, manual override uses ocupacionManual
    const mesas: Mesa[] = [makeMesa({ id: 'a', capacidad_actual: 100 })]
    const disponible = getAforoDisponible(mesas, 80, 'manual', 10)
    expect(disponible).toBe(70)
  })

  it('auto mode: all tables are children → count 0', () => {
    const mesas: Mesa[] = [
      makeMesa({ id: 'a', capacidad_actual: 6, mesa_padre_id: 'b' }),
      makeMesa({ id: 'b', capacidad_actual: 6, mesa_padre_id: 'b' }),
    ]
    // No mesa_padre_id IS NULL → 0 occupancy
    expect(getAforoDisponible(mesas, 50, 'auto', 0)).toBe(50)
  })
})

// ============================================================================
// getMesaEstado
// ============================================================================

describe('getMesaEstado (MCA-005)', () => {
  it('libre when no reservas', () => {
    const mesa = makeMesa({ id: 'a' })
    expect(getMesaEstado(mesa, [])).toBe('libre')
  })

  it('reservada when pending today', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'pendiente',
        fecha_hora: todayISO() + 'T14:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('reservada')
  })

  it('reservada when confirmed today', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'confirmada',
        fecha_hora: todayISO() + 'T20:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('reservada')
  })

  it('ocupada when completada today', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'completada',
        fecha_hora: todayISO() + 'T12:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('ocupada')
  })

  it('reservada takes priority over completada', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'completada',
        fecha_hora: todayISO() + 'T13:00:00.000Z',
      },
      {
        mesa_id: 'a',
        estado: 'pendiente',
        fecha_hora: todayISO() + 'T14:00:00.000Z',
      },
    ]
    // pendiente/confirmada > completada → reservada
    expect(getMesaEstado(mesa, reservas)).toBe('reservada')
  })

  it('ignores reservas for different mesa_id', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'b',
        estado: 'confirmada',
        fecha_hora: todayISO() + 'T14:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('libre')
  })

  it('ignores reservas not from today', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'confirmada',
        fecha_hora: '2026-01-15T14:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('libre')
  })

  it('ignores cancelada estado', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: 'a',
        estado: 'cancelada',
        fecha_hora: todayISO() + 'T14:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('libre')
  })

  it('ignores standby estado', () => {
    const mesa = makeMesa({ id: 'a' })
    const reservas = [
      {
        mesa_id: null,
        estado: 'standby',
        fecha_hora: todayISO() + 'T14:00:00.000Z',
      },
    ]
    expect(getMesaEstado(mesa, reservas)).toBe('libre')
  })
})
