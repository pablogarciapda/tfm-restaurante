/**
 * TDD: RED → GREEN → TRIANGULATE — useMesasFusion composable
 *
 * Fusion/unfusion logic wrapping fusion-math pure functions + Supabase operations.
 * Tasks: 4.1 — MFU-001, MFU-002, MFU-004, MFU-005, MFU-006, MFU-007, MFU-008
 *
 * Unit tests mock useSupabaseClient and useCanvasStore.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Mesa } from '../../../shared/contracts/mesas.contract'

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

interface MockReserva {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

function makeReserva(overrides: Partial<MockReserva> & { id: string }): MockReserva {
  return {
    nombre_cliente: 'Test Client',
    fecha_hora: '2026-07-02T20:00:00.000Z',
    numero_comensales: 4,
    estado: 'confirmada',
    mesa_id: 'm1',
    ...overrides,
  }
}

/**
 * Mock Supabase client with configurable from().select/insert/update/delete chain.
 * Supports .eq() chaining with matching for update/delete filters.
 */
function makeMockClient(overrides?: {
  select?: unknown
  insert?: unknown
  update?: unknown
  delete?: unknown
  selectError?: unknown
  updateResult?: { data: unknown; error: { message: string } | null }
  rpcResult?: unknown
  reservasSelect?: unknown
  reservasUpdate?: unknown
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: overrides?.rpcResult ?? null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
    from: (table: string) => {
      let resolveFn = () => Promise.resolve({
        data: table === 'reservas' ? (overrides?.reservasSelect ?? []) : (overrides?.select ?? []),
        error: overrides?.selectError ?? null,
      })
      let isSingle = false

      const dataOps = ['select', 'insert', 'update', 'delete']
      const filterOps = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'match', 'is']

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: Record<string, any> = {
        then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
          return resolveFn().then((result) => {
            if (isSingle && Array.isArray(result.data)) {
              return resolve({ ...result, data: result.data[0] ?? null })
            }
            return resolve(result)
          }, reject)
        },
        catch(reject: (e: unknown) => void) {
          return resolveFn().catch(reject)
        },
      }

      for (const op of filterOps) {
        chain[op] = () => chain
      }

      for (const op of dataOps) {
        chain[op] = () => {
          if (op === 'insert') {
            resolveFn = () => Promise.resolve({ data: overrides?.insert ?? null, error: null })
          } else if (op === 'update') {
            resolveFn = () =>
              overrides?.updateResult
                ? Promise.resolve(overrides.updateResult)
                : Promise.resolve({ data: overrides?.update ?? null, error: null })
          } else if (op === 'delete') {
            resolveFn = () => Promise.resolve({ data: overrides?.delete ?? null, error: null })
          } else {
            // select: keeps the table-specific resolveFn
            resolveFn = () => Promise.resolve({
              data: table === 'reservas' ? (overrides?.reservasSelect ?? []) : (overrides?.select ?? []),
              error: overrides?.selectError ?? null,
            })
          }
          return chain
        }
      }

      chain.single = () => {
        isSingle = true
        return chain
      }

      return chain
    },
  }
}

// ============================================================================
// useMesasFusion — fuseMesas
// ============================================================================

describe('useMesasFusion — fuseMesas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fuseMesas validates same zone, calculates capacity, updates DB and store', async () => {
    // Arrange: two tables in same zone (Principal)
    const mesa1 = makeMesa({ id: 'm1', zona: 'Principal', capacidad_base: 4 })
    const mesa2 = makeMesa({ id: 'm2', zona: 'Principal', capacidad_base: 4 })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      update: { data: null, error: null },
      insert: null,
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { fuseMesas } = useMesasFusion()

    // Act
    const result = await fuseMesas(['m1', 'm2'])

    // Assert: should succeed
    expect(result.success).toBe(true)
    expect(result.id_fusion).toBeDefined()
    expect(typeof result.id_fusion).toBe('string')

    // Both tables should have id_fusion set in store
    expect(store.mesas[0].id_fusion).toBe(result.id_fusion)
    expect(store.mesas[1].id_fusion).toBe(result.id_fusion)

    // First table is parent
    expect(store.mesas[0].mesa_padre_id).toBe('m1')
    // Child table has mesa_padre_id pointing to parent
    expect(store.mesas[1].mesa_padre_id).toBe('m1')

    // Capacity: floor((4+4) * 0.75) = 6 on parent
    expect(store.mesas[0].capacidad_actual).toBe(6)
    // Child retains its original capacity
    expect(store.mesas[1].capacidad_actual).toBe(6)
  })

  it('fuseMesas rejects cross-zone tables', async () => {
    const mesa1 = makeMesa({ id: 'm1', zona: 'Principal' })
    const mesa2 = makeMesa({ id: 'm2', zona: 'Terraza' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient()

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { fuseMesas } = useMesasFusion()

    const result = await fuseMesas(['m1', 'm2'])

    expect(result.success).toBe(false)
    expect(result.error).toBe('Solo se pueden fusionar mesas de la misma zona')
  })

  it('fuseMesas rejects already-fused tables from different fusion groups', async () => {
    const mesa1 = makeMesa({ id: 'm1', zona: 'Principal', id_fusion: 'fusion-a' })
    const mesa2 = makeMesa({ id: 'm2', zona: 'Principal', id_fusion: 'fusion-b' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient()

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { fuseMesas } = useMesasFusion()

    const result = await fuseMesas(['m1', 'm2'])

    expect(result.success).toBe(false)
    expect(result.error).toBe('Alguna mesa ya está fusionada. Desfusione primero.')
  })

  it('fuseMesas calculates correct capacity: 4+4+2 → 7', async () => {
    const mesa1 = makeMesa({ id: 'm1', zona: 'Principal', capacidad_base: 4 })
    const mesa2 = makeMesa({ id: 'm2', zona: 'Principal', capacidad_base: 4 })
    const mesa3 = makeMesa({ id: 'm3', zona: 'Principal', capacidad_base: 2 })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2, mesa3])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { fuseMesas } = useMesasFusion()

    const result = await fuseMesas(['m1', 'm2', 'm3'])

    expect(result.success).toBe(true)
    // floor((4+4+2) * 0.75) = floor(7.5) = 7
    expect(store.mesas[0].capacidad_actual).toBe(7)
  })

  it('fuseMesas needs at least 2 tables', async () => {
    const mesa1 = makeMesa({ id: 'm1', zona: 'Principal' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient()

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { fuseMesas } = useMesasFusion()

    const result = await fuseMesas(['m1'])

    expect(result.success).toBe(false)
    expect(result.error).toBe('Se necesitan al menos 2 mesas para fusionar')
  })
})

// ============================================================================
// useMesasFusion — unfuseMesas (no reservations)
// ============================================================================

describe('useMesasFusion — unfuseMesas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unfuseMesas restores capacity and clears fusion fields when no reservations', async () => {
    const fusionId = 'fusion-test'
    const mesa1 = makeMesa({ id: 'm1', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })
    const mesa2 = makeMesa({ id: 'm2', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    // No reservations exist for these mesas
    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      reservasSelect: [], // no reservations
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { unfuseMesas } = useMesasFusion()

    const result = await unfuseMesas(fusionId)

    expect(result.success).toBe(true)
    expect(result.hasReservations).toBe(false)

    // Both should have fusion fields cleared and capacity restored
    expect(store.mesas[0].id_fusion).toBeNull()
    expect(store.mesas[0].mesa_padre_id).toBeNull()
    expect(store.mesas[0].capacidad_actual).toBe(4)

    expect(store.mesas[1].id_fusion).toBeNull()
    expect(store.mesas[1].mesa_padre_id).toBeNull()
    expect(store.mesas[1].capacidad_actual).toBe(4)
  })

  it('unfuseMesas detects reservations and returns them without unfusing', async () => {
    const fusionId = 'fusion-with-reserva'
    const mesa1 = makeMesa({ id: 'm1', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })
    const mesa2 = makeMesa({ id: 'm2', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const reservas: MockReserva[] = [
      makeReserva({ id: 'r1', mesa_id: 'm1', estado: 'confirmada' }),
      makeReserva({ id: 'r2', mesa_id: 'm2', estado: 'pendiente' }),
    ]

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      reservasSelect: reservas,
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { unfuseMesas } = useMesasFusion()

    const result = await unfuseMesas(fusionId)

    // Should detect reservations and NOT unfuse
    expect(result.success).toBe(false)
    expect(result.hasReservations).toBe(true)
    expect(result.reservations).toHaveLength(2)

    // Store should NOT be modified
    expect(store.mesas[0].id_fusion).toBe(fusionId)
    expect(store.mesas[1].id_fusion).toBe(fusionId)
  })
})

// ============================================================================
// useMesasFusion — cancelReservationsAndUnfuse
// ============================================================================

describe('useMesasFusion — cancelReservationsAndUnfuse', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cancels all active reservations and unfuses the group', async () => {
    const fusionId = 'fusion-cancel'
    const mesa1 = makeMesa({ id: 'm1', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })
    const mesa2 = makeMesa({ id: 'm2', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { cancelReservationsAndUnfuse } = useMesasFusion()

    const result = await cancelReservationsAndUnfuse(fusionId)

    expect(result.success).toBe(true)

    // Tables unfused
    expect(store.mesas[0].id_fusion).toBeNull()
    expect(store.mesas[1].id_fusion).toBeNull()
    expect(store.mesas[0].capacidad_actual).toBe(4)
  })
})

// ============================================================================
// useMesasFusion — moveReservationsToStandby
// ============================================================================

describe('useMesasFusion — moveReservationsToStandby', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('moves active reservations to standby and unfuses the group', async () => {
    const fusionId = 'fusion-standby'
    const mesa1 = makeMesa({ id: 'm1', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })
    const mesa2 = makeMesa({ id: 'm2', capacidad_base: 4, capacidad_actual: 6, id_fusion: fusionId, mesa_padre_id: 'm1' })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([mesa1, mesa2])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { moveReservationsToStandby } = useMesasFusion()

    const result = await moveReservationsToStandby(fusionId)

    expect(result.success).toBe(true)

    // Tables unfused
    expect(store.mesas[0].id_fusion).toBeNull()
    expect(store.mesas[1].id_fusion).toBeNull()
    expect(store.mesas[0].capacidad_actual).toBe(4)
  })
})

// ============================================================================
// useMesasFusion — getStandbyReservations
// ============================================================================

describe('useMesasFusion — getStandbyReservations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches all standby reservations', async () => {
    const standbyReservas: MockReserva[] = [
      makeReserva({ id: 'r1', estado: 'standby', nombre_cliente: 'Ana García', mesa_id: 'm1' }),
      makeReserva({ id: 'r2', estado: 'standby', nombre_cliente: 'Carlos López', mesa_id: 'm2' }),
    ]

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      reservasSelect: standbyReservas,
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { getStandbyReservations } = useMesasFusion()

    const result = await getStandbyReservations()

    expect(result).toHaveLength(2)
    expect(result[0].nombre_cliente).toBe('Ana García')
    expect(result[1].nombre_cliente).toBe('Carlos López')
    expect(result[0].estado).toBe('standby')
  })

  it('returns empty array when no standby reservations exist', async () => {
    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      reservasSelect: [],
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { getStandbyReservations } = useMesasFusion()

    const result = await getStandbyReservations()

    expect(result).toEqual([])
  })
})

// ============================================================================
// useMesasFusion — reassignStandbyReservation
// ============================================================================

describe('useMesasFusion — reassignStandbyReservation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reassigns a standby reservation to a new mesa and confirms it', async () => {
    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      update: { data: null, error: null },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { reassignStandbyReservation } = useMesasFusion()

    const result = await reassignStandbyReservation('r1', 'm5')

    expect(result.success).toBe(true)
  })

  it('returns error if the update fails', async () => {
    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({
      updateResult: { data: null, error: { message: 'DB error' } },
    })

    const { useMesasFusion } = await import('../../../app/features/mesas/composables/useMesasFusion')
    const { reassignStandbyReservation } = useMesasFusion()

    const result = await reassignStandbyReservation('r1', 'm5')
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})
