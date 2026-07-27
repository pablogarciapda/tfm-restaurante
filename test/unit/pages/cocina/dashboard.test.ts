/**
 * TDD: RED → GREEN → TRIANGULATE — Dashboard Page (DASH-001–DASH-005)
 *
 * /cocina/dashboard: 3 metric cards — total platos, reservas hoy, eventos activos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const mockNavigateTo = vi.fn((p: string) => p)

// Dashboard now uses $fetch instead of Supabase client
let fetchResponse: unknown = null
let fetchShouldThrow = false
const mock$fetch = vi.fn(async () => {
  if (fetchShouldThrow) throw new Error('network error')
  return fetchResponse
})

const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
g.definePageMeta = (_meta: unknown) => {}
g.useSupabaseUser = () => ref({ id: '1', email: 'admin@test.com' })
g.useSupabaseClient = () => ({
  auth: { signOut: vi.fn() },
  from: vi.fn(),
})
g.$fetch = mock$fetch
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('Dashboard Page (DASH-001–DASH-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchShouldThrow = false
    fetchResponse = {
      totalPlatos: 12,
      reservasHoy: 5,
      eventosActivos: 3,
      totalClientes: 20,
      totalReservas: 40,
      mediaComensales: 2.5,
      aforoActual: { ocupadas: 3, capacidad: 10 },
      reservasUltimos30: [],
      topClientes: [],
      reservasPorDiaSemana: [],
      reservasPorEstado: [],
    }
  })

  async function mountDashboard() {
    const page = await import('../../../../app/pages/cocina/dashboard.vue')
    return mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          MetricCard: {
            template: '<div class="metric-card"><span class="m-label">{{ label }}</span><span class="m-value">{{ value }}</span></div>',
            props: ['label', 'value', 'loading', 'icon'],
          },
          ChartBarHorizontal: { template: '<div class="chart-bar-horizontal" />', props: ['data', 'title'] },
          ChartBar: { template: '<div class="chart-bar" />', props: ['data', 'title'] },
          ChartLine: { template: '<div class="chart-line" />', props: ['data', 'title'] },
          ChartDoughnut: { template: '<div class="chart-doughnut" />', props: ['data', 'title'] },
        },
      },
    })
  }

  it('renders "Panel de Control" heading', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()
    expect(wrapper.text()).toContain('Panel de Control')
  })

  it('renders 4 MetricCard components', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()
    expect(wrapper.findAll('.metric-card')).toHaveLength(4)
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
    fetchResponse = {
      totalPlatos: 42,
      reservasHoy: 7,
      eventosActivos: 1,
      totalClientes: 20,
      totalReservas: 40,
      mediaComensales: 2.5,
      aforoActual: { ocupadas: 3, capacidad: 10 },
      reservasUltimos30: [],
      topClientes: [],
      reservasPorDiaSemana: [],
      reservasPorEstado: [],
    }

    const wrapper = await mountDashboard()
    await flushPromises()

    const values = wrapper.findAll('.m-value')
    const texts = values.map((v) => v.text())
    expect(texts).toContain('42')
    expect(texts).toContain('7')
    expect(texts).toContain('1')
  })
})
