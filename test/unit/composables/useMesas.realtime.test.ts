/**
 * TDD: RED → GREEN — useMesas Realtime sync (MCA-007, Slice 4 enhancement)
 *
 * Tests postgres_changes event handlers: INSERT, UPDATE, DELETE
 * and channel lifecycle (subscribe, unsubscribe, cleanup).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Mesa } from '../../../shared/contracts/mesas.contract'
import { createMockSupabaseClient } from '../../utils/mock-supabase'

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

describe('useMesas — Realtime event handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles INSERT event: adds new mesa to store', async () => {
    const newMesa = makeMesa({ id: 'inserted-mesa', numero_mesa: 99 })

    let insertHandler: ((payload: Record<string, unknown>) => void) | null = null
    const mockChannel = {
      on: vi.fn().mockImplementation(
        (_event: string, _filter: unknown, handler: (payload: Record<string, unknown>) => void) => {
          insertHandler = handler
          return mockChannel
        },
      ),
      subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
    }

    const mockClient = {
      ...createMockSupabaseClient(),
      channel: vi.fn().mockReturnValue(mockChannel),
    }

    const g = globalThis as Record<string, unknown>
    g.useSupabaseClient = () => mockClient

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const { useMesas } = await import('../../../app/features/mesas/composables/useMesas')
    const store = useCanvasStore()
    const { subscribeRealtime } = useMesas()

    await subscribeRealtime()

    // Simulate INSERT event
    expect(insertHandler).not.toBeNull()
    insertHandler!({
      eventType: 'INSERT',
      new: newMesa,
      old: {},
    })

    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('inserted-mesa')
    expect(store.mesas[0].numero_mesa).toBe(99)
  })

  it('handles UPDATE event: patches existing mesa in store', async () => {
    const existingMesa = makeMesa({ id: 'existing-mesa', posicion_x: 100, posicion_y: 200 })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([existingMesa])

    let updateHandler: ((payload: Record<string, unknown>) => void) | null = null
    const mockChannel = {
      on: vi.fn().mockImplementation(
        (_event: string, _filter: unknown, handler: (payload: Record<string, unknown>) => void) => {
          updateHandler = handler
          return mockChannel
        },
      ),
      subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
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

    // Simulate UPDATE event
    expect(updateHandler).not.toBeNull()
    updateHandler!({
      eventType: 'UPDATE',
      new: { id: 'existing-mesa', posicion_x: 500, posicion_y: 600 },
      old: {},
    })

    expect(store.mesas[0].posicion_x).toBe(500)
    expect(store.mesas[0].posicion_y).toBe(600)
  })

  it('handles DELETE event: removes mesa from store', async () => {
    const existingMesa = makeMesa({ id: 'to-delete', numero_mesa: 7 })

    const { useCanvasStore } = await import('../../../app/features/mesas/stores/canvas-store')
    const store = useCanvasStore()
    store.setMesas([existingMesa, makeMesa({ id: 'keep', numero_mesa: 8 })])

    let deleteHandler: ((payload: Record<string, unknown>) => void) | null = null
    const mockChannel = {
      on: vi.fn().mockImplementation(
        (_event: string, _filter: unknown, handler: (payload: Record<string, unknown>) => void) => {
          deleteHandler = handler
          return mockChannel
        },
      ),
      subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
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

    // Simulate DELETE event
    expect(deleteHandler).not.toBeNull()
    deleteHandler!({
      eventType: 'DELETE',
      new: {},
      old: { id: 'to-delete' },
    })

    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('keep')
  })

  it('channel is created with mesas-realtime name', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
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
  })
})
