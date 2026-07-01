/**
 * TDD: RED → GREEN → TRIANGULATE — usePlatos composable (CN-006)
 *
 * Fetches platos from Supabase: available only, sorted by puesto.
 * Returns { data, error, pending } from useAsyncData.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

/**
 * Helper: creates a spy chain that records what methods were called.
 * Returns call log to verify query structure.
 */
interface ChainSpy {
  methods: string[]
  table: string | null
  args: Record<string, unknown[]>
}

function createSpyChain(returnData: unknown): { chain: unknown; spy: ChainSpy } {
  const spy: ChainSpy = { methods: [], table: null, args: {} }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve({ data: returnData, error: null }).then(resolve, reject)
    },
    catch(reject: (e: unknown) => unknown) {
      return Promise.resolve({ data: returnData, error: null }).catch(reject)
    },
  }

  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single',
    'maybeSingle', 'insert', 'update', 'delete', 'in', 'contains', 'filter']
  for (const m of methods) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain[m] = (...args: any[]) => {
      spy.methods.push(m)
      spy.args[m] = args
      return chain
    }
  }

  return { chain, spy }
}

const fromSpy: ChainSpy[] = []

const mockUseSupabaseClient = () => ({
  from: (table: string) => {
    const { chain, spy } = createSpyChain([])
    spy.table = table
    fromSpy.push(spy)
    return chain
  },
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
})

const g = globalThis as Record<string, unknown>

describe('usePlatos composable (CN-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromSpy.length = 0

    g.useSupabaseClient = mockUseSupabaseClient

    // Default: return empty data
    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(null),
      error: ref(null),
      pending: ref(false),
    })
  })

  async function getUsePlatos() {
    const mod = await import('../../../app/composables/usePlatos')
    return mod.usePlatos()
  }

  it('constructs Supabase query: from platos → select * → eq disponible → order puesto', async () => {
    // Capture the async function passed to useAsyncData
    let capturedFn: (() => Promise<unknown>) | null = null

    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return {
        data: ref(null),
        error: ref(null),
        pending: ref(false),
      }
    }

    const result = await getUsePlatos()

    // Execute the captured callback to verify query chain
    expect(capturedFn).not.toBeNull()
    await capturedFn!()

    // Verify Supabase query structure
    expect(fromSpy.length).toBeGreaterThan(0)
    const spy = fromSpy[0]
    expect(spy.table).toBe('platos')
    expect(spy.methods).toContain('select')
    expect(spy.methods).toContain('eq')
    expect(spy.methods).toContain('order')

    // Verify available filter and sort order
    expect(spy.args.eq).toBeDefined()
    expect(spy.args.eq[0]).toBe('disponible')
    expect(spy.args.eq[1]).toBe(true)

    expect(spy.args.order).toBeDefined()
    expect(spy.args.order[0]).toBe('puesto')

    // Verify composable returns expected shape
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('pending')
  })

  it('returns data when Supabase resolves with platos', async () => {
    const mockPlatos = [
      { id: '1', nombre: 'Croquetas', precio: 9.5, categoria: 'Entrantes', puesto: 1, disponible: true },
      { id: '2', nombre: 'Ensalada', precio: 8.0, categoria: 'Ensaladas', puesto: 2, disponible: true },
    ]

    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      // Execute fn and get the resolved result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fn() as Promise<any>).then(() => { /* noop */ })
      return {
        data: ref(mockPlatos),
        error: ref(null),
        pending: ref(false),
      }
    }

    const { data } = await getUsePlatos()
    expect(data.value).toEqual(mockPlatos)
  })

  it('respects useAsyncData cache key "platos"', async () => {
    let capturedKey = ''

    g.useAsyncData = (key: string, fn: () => Promise<unknown>) => {
      capturedKey = key
      return {
        data: ref(null),
        error: ref(null),
        pending: ref(false),
      }
    }

    await getUsePlatos()
    expect(capturedKey).toBe('platos')
  })

  it('propagates error when Supabase query fails (edge case)', async () => {
    const testError = new Error('Supabase connection refused')

    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(null),
      error: ref(testError),
      pending: ref(false),
    })

    const { error, data } = await getUsePlatos()
    expect(error.value).toBe(testError)
    expect(data.value).toBeNull()
  })
})
