/**
 * TDD: RED → GREEN → TRIANGULATE — useMenuDiario composable (MD-004, MD-005)
 *
 * Fetches today's menu: queries menu_diario_config for current day_of_week,
 * then menu_diario_items grouped by seccion. Returns config, items, precio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'

interface ChainSpy {
  methods: string[]
  table: string | null
  args: Record<string, unknown[]>
  resolveData: unknown
}

function createSpyChain(resolveData: unknown): { chain: unknown; spy: ChainSpy } {
  const spy: ChainSpy = { methods: [], table: null, args: {}, resolveData }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(resolveData).then(resolve, reject)
    },
    catch(reject: (e: unknown) => unknown) {
      return Promise.resolve(resolveData).catch(reject)
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

const fromSpies: ChainSpy[] = []
// Simulated config row (null = no menu today)
let mockConfig: unknown = null
const mockDishes: unknown[] = []

const mockUseSupabaseClient = () => ({
  from: (table: string) => {
    let resolveData: unknown
    if (table === 'menu_diario_config') {
      resolveData = { data: mockConfig, error: mockConfig ? null : { code: 'PGRST116' } }
    } else if (table === 'menu_diario_items') {
      resolveData = { data: mockDishes, error: null }
    } else {
      resolveData = { data: [], error: null }
    }
    const { chain, spy } = createSpyChain(resolveData)
    spy.table = table
    fromSpies.push(spy)
    return chain
  },
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
})

const g = globalThis as Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
g.computed = computed as any
let capturedKey = ''

describe('useMenuDiario composable (MD-004, MD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromSpies.length = 0
    mockConfig = null
    mockDishes.length = 0
    capturedKey = ''

    g.useSupabaseClient = mockUseSupabaseClient

    g.useAsyncData = (key: string, _fn: () => Promise<unknown>) => {
      capturedKey = key
      return {
        data: ref(null),
        error: ref(null),
        pending: ref(false),
      }
    }
  })

  async function getUseMenuDiario() {
    const mod = await import('../../../app/composables/useMenuDiario')
    return mod.useMenuDiario()
  }

  it('queries menu_diario_config for today\'s day_of_week with activo=true', async () => {
    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    expect(capturedFn).not.toBeNull()

    // Set up mock config for today
    mockConfig = { id: 'cfg-1', day_of_week: new Date().getDay(), precio: '16', activo: true }
    const result = await capturedFn!()

    // Verify config query with both filters
    const configSpy = fromSpies.find((s) => s.table === 'menu_diario_config')
    expect(configSpy).toBeDefined()
    expect(configSpy!.methods).toContain('select')
    // eq is called twice (day_of_week and activo)
    const eqCount = configSpy!.methods.filter((m) => m === 'eq').length
    expect(eqCount).toBeGreaterThanOrEqual(2)
    // single() is called for the singleton row
    expect(configSpy!.methods).toContain('single')
  })

  it('returns config and precio when menu exists for today', async () => {
    mockConfig = { id: 'cfg-mon', day_of_week: 1, precio: '16', activo: true }
    mockDishes.push(
      { id: 'd1', config_id: 'cfg-mon', seccion: 'primer', plato_nombre: 'Gazpacho', puesto: 1 },
      { id: 'd2', config_id: 'cfg-mon', seccion: 'segundo', plato_nombre: 'Paella', puesto: 1 },
    )

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return {
        data: ref(null),
        error: ref(null),
        pending: ref(false),
      }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result).toHaveProperty('config')
    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('precio')
    expect(result.precio).toBe('16')
  })

  it('groups dishes by seccion into primer/segundo/postre/bebida/pan', async () => {
    mockConfig = { id: 'cfg-mon', day_of_week: 1, precio: '16', activo: true }
    mockDishes.push(
      { id: 'd1', config_id: 'cfg-mon', seccion: 'primer', plato_nombre: 'Sopa', puesto: 1 },
      { id: 'd2', config_id: 'cfg-mon', seccion: 'primer', plato_nombre: 'Ensalada', puesto: 2 },
      { id: 'd3', config_id: 'cfg-mon', seccion: 'segundo', plato_nombre: 'Pescado', puesto: 1 },
      { id: 'd4', config_id: 'cfg-mon', seccion: 'postre', plato_nombre: 'Flan', puesto: 1 },
      { id: 'd5', config_id: 'cfg-mon', seccion: 'bebida', plato_nombre: 'Vino', puesto: 1 },
      { id: 'd6', config_id: 'cfg-mon', seccion: 'pan', plato_nombre: 'Pan artesano', puesto: 1 },
    )

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result.items.primer).toHaveLength(2)
    expect(result.items.segundo).toHaveLength(1)
    expect(result.items.postre).toHaveLength(1)
    expect(result.items.bebida).toHaveLength(1)
    expect(result.items.pan).toHaveLength(1)
  })

  it('returns null config/precio when no menu exists for today (fallback)', async () => {
    mockConfig = null // No config for today

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result.config).toBeNull()
    expect(result.precio).toBeNull()
    expect(result.items).toBeNull()
  })

  it('returns null when config exists but is inactive', async () => {
    // The query filters activo=true, so an inactive config won't be returned
    mockConfig = null // simulate no active config

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result.config).toBeNull()
  })
})
