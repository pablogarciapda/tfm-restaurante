/**
 * TDD: RED → GREEN → TRIANGULATE — Dashboard Page (DASH-001–DASH-005)
 *
 * /cocina/dashboard: 3 metric cards — total platos, reservas hoy, eventos activos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const mockNavigateTo = vi.fn((p: string) => p)

/**
 * Creates a chainable-thenable mock for Supabase query chains.
 * Any method call returns `this`. When awaited, returns the configured response.
 */
function createQueryChain(resolveValue: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(resolveValue).then(resolve, reject)
    },
    catch(reject: (e: unknown) => unknown) {
      return Promise.resolve(resolveValue).catch(reject)
    },
  }

  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single', 'maybeSingle']
  for (const m of methods) {
    chain[m] = () => chain
  }

  return chain
}

// Query responses (count-based)
let queryResponses: Array<{ count: number; error: null | Error }> = [
  { count: 12, error: null },
  { count: 5, error: null },
  { count: 3, error: null },
]
let queryIndex = 0

const mockSelect = vi.fn(() => {
  const resp = queryResponses[queryIndex] ?? { count: 0, error: null }
  queryIndex++
  return createQueryChain(resp)
})

const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: Function) => fn
g.definePageMeta = (_meta: unknown) => {}
g.useSupabaseUser = () => ref({ id: '1', email: 'admin@test.com' })
g.useSupabaseClient = () => ({
  auth: { signOut: vi.fn() },
  from: () => ({ select: mockSelect }),
})
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('Dashboard Page (DASH-001–DASH-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryIndex = 0
    queryResponses = [
      { count: 12, error: null },
      { count: 5, error: null },
      { count: 3, error: null },
    ]
  })

  async function mountDashboard() {
    const page = await import('../../../../app/pages/cocina/dashboard.vue')
    return mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          MetricCard: {
            template: '<div class="metric-card"><span class="m-label">{{ label }}</span><span class="m-value">{{ value }}</span></div>',
            props: ['label', 'value', 'loading'],
          },
        },
      },
    })
  }

  it('renders "Panel de Control" heading', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()
    expect(wrapper.text()).toContain('Panel de Control')
  })

  it('renders 3 MetricCard components', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()
    expect(wrapper.findAll('.metric-card')).toHaveLength(3)
  })

  it('displays labels in Spanish', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Platos en carta')
    expect(text).toContain('Reservas hoy')
    expect(text).toContain('Eventos activos')
  })

  it('shows metric values from Supabase', async () => {
    queryResponses = [
      { count: 42, error: null },
      { count: 7, error: null },
      { count: 1, error: null },
    ]

    const wrapper = await mountDashboard()
    await flushPromises()

    const values = wrapper.findAll('.m-value')
    const texts = values.map((v) => v.text())
    expect(texts).toContain('42')
    expect(texts).toContain('7')
    expect(texts).toContain('1')
  })
})
