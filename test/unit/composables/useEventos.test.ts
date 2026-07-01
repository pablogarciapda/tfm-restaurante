/**
 * TDD: RED → GREEN → TRIANGULATE — useEventos composable (EG-001)
 *
 * Fetches active, future eventos from Supabase, sorted by fecha ASC.
 * Returns { data, error, pending } from useAsyncData.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

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
    'maybeSingle', 'insert', 'update', 'delete', 'in']
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
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
})

const g = globalThis as Record<string, unknown>

describe('useEventos composable (EG-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromSpy.length = 0
    g.useSupabaseClient = mockUseSupabaseClient
    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(null),
      error: ref(null),
      pending: ref(false),
    })
  })

  async function getUseEventos() {
    const mod = await import('../../../app/composables/useEventos')
    return mod.useEventos()
  }

  it('constructs query: from eventos → select → eq activo=true → gte fecha → order fecha', async () => {
    let capturedFn: (() => Promise<unknown>) | null = null

    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseEventos()
    expect(capturedFn).not.toBeNull()
    await capturedFn!()

    const spy = fromSpy[0]
    expect(spy.table).toBe('eventos')
    expect(spy.methods).toContain('select')
    expect(spy.methods).toContain('eq')
    expect(spy.methods).toContain('gte')
    expect(spy.methods).toContain('order')

    // Verify activo filter
    expect(spy.args.eq).toBeDefined()
    expect(spy.args.eq[0]).toBe('activo')
    expect(spy.args.eq[1]).toBe(true)

    // Verify future-date filter
    expect(spy.args.gte).toBeDefined()
    expect(spy.args.gte[0]).toBe('fecha')

    // Verify sort
    expect(spy.args.order).toBeDefined()
    expect(spy.args.order[0]).toBe('fecha')
  })

  it('returns data when Supabase resolves with eventos', async () => {
    const mockEventos = [
      { id: '1', titulo: 'Noche Flamenca', fecha: '2027-08-15T20:00:00Z', categoria: 'espectaculo', activo: true },
      { id: '2', titulo: 'San Juan', fecha: '2027-06-23T20:00:00Z', categoria: 'festivo', activo: true },
    ]

    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(mockEventos),
      error: ref(null),
      pending: ref(false),
    })

    const { data } = await getUseEventos()
    expect(data.value).toEqual(mockEventos)
  })

  it('uses "eventos" as useAsyncData cache key', async () => {
    let capturedKey = ''
    g.useAsyncData = (key: string, _fn: () => Promise<unknown>) => {
      capturedKey = key
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseEventos()
    expect(capturedKey).toBe('eventos')
  })

  it('propagates error on Supabase failure (edge case)', async () => {
    const testError = new Error('Connection timeout')
    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(null),
      error: ref(testError),
      pending: ref(false),
    })

    const { error, data } = await getUseEventos()
    expect(error.value).toBe(testError)
    expect(data.value).toBeNull()
  })
})
