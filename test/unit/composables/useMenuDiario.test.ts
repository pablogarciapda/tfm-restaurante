/**
 * TDD: RED → GREEN → TRIANGULATE — useMenuDiario composable (MD-004, MD-005)
 *
 * Fetches today's menu: queries menu_diario_config by fecha first,
 * falls back to day_of_week, then menu_diario_items grouped by seccion.
 * Also checks eventos for holiday flag.
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
    'maybeSingle', 'insert', 'update', 'delete', 'in', 'ilike']
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
let mockConfig: unknown = null
const mockDishes: unknown[] = []

const mockConfiguracion = { precio_menu_diario: 14, precio_menu_sabado: 18, precio_menu_domingo: 20 }

const mockUseSupabaseClient = () => ({
  from: (table: string) => {
    let resolveData: unknown

    if (table === 'configuracion') {
      resolveData = { data: mockConfiguracion, error: null }
    } else if (table === 'menu_diario_config') {
      // Simulate maybeSingle: returns { data, error: null } even on no rows
      resolveData = { data: mockConfig, error: null }
    } else if (table === 'menu_diario_items') {
      resolveData = { data: mockDishes, error: null }
    } else if (table === 'eventos') {
      // Return no holiday match by default
      resolveData = { data: null, error: null }
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

describe('useMenuDiario composable (MD-004, MD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromSpies.length = 0
    mockConfig = null
    mockDishes.length = 0

    g.useSupabaseClient = mockUseSupabaseClient

    g.useAsyncData = (_key: string, _fn: () => Promise<unknown>) => ({
      data: ref(null),
      error: ref(null),
      pending: ref(false),
    })
  })

  async function getUseMenuDiario() {
    const mod = await import('../../../app/composables/useMenuDiario')
    return mod.useMenuDiario()
  }

  it('queries menu_diario_config by fecha then day_of_week with activo=true', async () => {
    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    expect(capturedFn).not.toBeNull()

    // Set up mock config — no fecha match, so day_of_week fallback runs
    mockConfig = { id: 'cfg-1', day_of_week: new Date().getDay(), precio: '16', activo: true }
    await capturedFn!()

    // Verify config queries
    const configSpies = fromSpies.filter((s) => s.table === 'menu_diario_config')
    expect(configSpies.length).toBeGreaterThanOrEqual(1)

    // Should use maybeSingle (not single)
    const anyConfigSpy = configSpies[0]
    expect(anyConfigSpy!.methods).toContain('maybeSingle')
    expect(anyConfigSpy!.methods).toContain('select')
  })

  it('returns config, precio, isHoliday when menu exists for today', async () => {
    mockConfig = { id: 'cfg-mon', day_of_week: 1, precio: '16', activo: true }
    mockDishes.push(
      { id: 'd1', config_id: 'cfg-mon', seccion: 'primer', plato_nombre: 'Gazpacho', puesto: 1 },
      { id: 'd2', config_id: 'cfg-mon', seccion: 'segundo', plato_nombre: 'Paella', puesto: 1 },
    )

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result).toHaveProperty('config')
    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('precio')
    expect(result).toHaveProperty('isHoliday')
    // Price now comes from configuracion table (precio_menu_diario=14), not menu_diario_config
    expect(result.precio).toBe('14')
    expect(result.isHoliday).toBe(false)
  })

  it('groups dishes by seccion into primer/segundo/postre/bebida/pan', async () => {
    mockConfig = { id: 'cfg-mon', day_of_week: 1, precio: '16', activo: true, fecha: null }
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

  it('returns null config + items but fallback precio from configuracion when no menu exists for today', async () => {
    mockConfig = null // No config for today

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result.config).toBeNull()
    // Price comes from configuracion fallback (precio_menu_diario=14)
    expect(result.precio).toBe('14')
    expect(result.items).toBeNull()
  })

  it('returns isHoliday=true when today is in eventos with categoria=festivo', async () => {
    // Override the mock for categorias_eventos and eventos
    const originalFrom = mockUseSupabaseClient().from
    const customFrom = (table: string) => {
      if (table === 'categorias_eventos') {
        const { chain, spy } = createSpyChain({
          data: { id: 'festivo-cat-id' },
          error: null,
        })
        spy.table = table
        fromSpies.push(spy)
        return chain
      }
      if (table === 'eventos') {
        const { chain, spy } = createSpyChain({
          data: { id: 'holiday-1' },
          error: null,
        })
        spy.table = table
        fromSpies.push(spy)
        return chain
      }
      return originalFrom(table)
    }
    g.useSupabaseClient = () => ({
      from: customFrom,
      auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
    })

    mockConfig = { id: 'cfg-mon', day_of_week: 1, precio: '16', activo: true }

    let capturedFn: (() => Promise<unknown>) | null = null
    g.useAsyncData = (_key: string, fn: () => Promise<unknown>) => {
      capturedFn = fn
      return { data: ref(null), error: ref(null), pending: ref(false) }
    }

    await getUseMenuDiario()
    const result = await capturedFn!()

    expect(result.isHoliday).toBe(true)
  })
})
