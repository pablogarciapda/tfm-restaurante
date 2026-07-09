/**
 * TDD: RED → GREEN → TRIANGULATE — useMesas composable (MCA-003, MCA-007)
 *
 * CRUD + Realtime subscription lifecycle for the mesas table.
 * Unit tests mock useSupabaseClient and useCanvasStore.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createMockSupabaseClient } from '../../utils/mock-supabase'
import type { Mesa } from '../../../shared/contracts/mesas.contract'
import { useCanvasStore } from '../../../app/features/mesas/stores/canvas-store'

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

/**
 * Creates a mock Supabase client where .from(table).select/insert/update/delete
 * returns a chainable that resolves to { data, error }.
 *
 * The mock handles `.single()` by unwrapping the first element of the array result.
 */
function makeMockClient(overrides?: {
  select?: unknown
  insert?: unknown
  update?: unknown
  delete?: unknown
  selectError?: unknown
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    from: (_table: string) => {
      let resolveFn = () => Promise.resolve({
        data: overrides?.select ?? [],
        error: overrides?.selectError ?? null,
      })
      let isSingle = false

      const filterOps = [
        'select', 'insert', 'update', 'delete',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'order', 'limit', 'match', 'in', 'is',
      ]

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
        chain[op] = () => {
          if (op === 'insert') {
            resolveFn = () => Promise.resolve({ data: overrides?.insert ?? null, error: null })
          }
          return chain
        }
      }

      // .single() marks the chain to unwrap the first element
      chain.single = () => {
        isSingle = true
        return chain
      }

      return chain
    },
  }
}

// ============================================================================
// useMesas Tests
// ============================================================================

describe('useMesas — loadMesas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loadMesas fetches from DB and populates canvas store', async () => {
    const dbMesas: Mesa[] = [
      makeMesa({ id: 'a', numero_mesa: 1 }),
      makeMesa({ id: 'b', numero_mesa: 2, zona: 'Terraza' }),
    ]

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({ select: dbMesas })

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const store = useCanvasStore()
    const { loadMesas } = useMesas()

    await loadMesas()

    expect(store.mesas).toHaveLength(2)
    expect(store.mesas[0].id).toBe('a')
    expect(store.mesas[1].zona).toBe('Terraza')
  })

  it('loadMesas replaces existing mesas in store', async () => {
    const store = useCanvasStore()
    store.setMesas([makeMesa({ id: 'old' })])

    const newDbMesas: Mesa[] = [makeMesa({ id: 'new', numero_mesa: 42 })]

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({ select: newDbMesas })

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { loadMesas } = useMesas()
    await loadMesas()

    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('new')
    expect(store.mesas[0].numero_mesa).toBe(42)
  })

  it('loadMesas handles empty data gracefully', async () => {
    const store = useCanvasStore()

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({ select: [] })

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { loadMesas } = useMesas()
    await expect(loadMesas()).resolves.not.toThrow()
    expect(store.mesas).toEqual([])
  })
})

describe('useMesas — createMesa', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('createMesa inserts to DB and adds to store', async () => {
    const store = useCanvasStore()
    const createdRow = makeMesa({ id: 'created', numero_mesa: 5 })

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient({ insert: [createdRow] })

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { createMesa } = useMesas()

    await createMesa({
      numero_mesa: 5,
      capacidad_base: 4,
      posicion_x: 0,
      posicion_y: 0,
      ancho: 100,
      alto: 100,
      rotacion: 0,
      zona: 'Principal',
    })

    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('created')
    expect(store.mesas[0].numero_mesa).toBe(5)
  })
})

describe('useMesas — updateMesa', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updateMesa sends update to DB and patches store', async () => {
    const store = useCanvasStore()
    store.setMesas([makeMesa({ id: 'a', posicion_x: 0, posicion_y: 0 })])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient()

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { updateMesa } = useMesas()
    await updateMesa('a', { posicion_x: 300, posicion_y: 400 })

    expect(store.mesas[0].posicion_x).toBe(300)
    expect(store.mesas[0].posicion_y).toBe(400)
  })
})

describe('useMesas — deleteMesa', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deleteMesa removes from DB and store', async () => {
    const store = useCanvasStore()
    store.setMesas([makeMesa({ id: 'a' }), makeMesa({ id: 'b' })])

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => makeMockClient()

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { deleteMesa } = useMesas()
    await deleteMesa('a')

    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('b')
  })
})

describe('useMesas — Realtime subscription', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('subscribeRealtime creates and subscribes to mesas-realtime channel', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((cb?: () => void) => {
        if (cb) cb()
        return Promise.resolve('SUBSCRIBED')
      }),
    }

    const mockClient = {
      ...createMockSupabaseClient(),
      channel: vi.fn().mockReturnValue(mockChannel),
    }

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => mockClient

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { subscribeRealtime } = useMesas()

    await subscribeRealtime()

    expect(mockClient.channel).toHaveBeenCalledWith('mesas-realtime')
    expect(mockChannel.on).toHaveBeenCalled()
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('unsubscribeRealtime calls removeChannel', async () => {
    const mockRemoveChannel = vi.fn()
    const mockClient = {
      ...createMockSupabaseClient(),
      removeChannel: mockRemoveChannel,
    }

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => mockClient

    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const { unsubscribeRealtime } = useMesas()

    unsubscribeRealtime()

    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
