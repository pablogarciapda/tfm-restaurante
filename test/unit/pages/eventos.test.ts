/**
 * TDD: RED → GREEN → TRIANGULATE — Eventos page migration (EG-001)
 *
 * Migrated from mockEventos to useEventos composable.
 * Only shows active, future events. Sorted by fecha ASC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// --------------- Mock useEventos ---------------
const mockDataRef = ref<unknown[]>([])
const mockErrorRef = ref<Error | null>(null)
const mockPendingRef = ref(false)

const mockUseEventos = () => ({
  data: mockDataRef,
  error: mockErrorRef,
  pending: mockPendingRef,
})

const g = globalThis as Record<string, unknown>
g.useEventos = mockUseEventos
g.useSupabaseClient = () => ({
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
})

describe('Eventos page — migrated to useEventos (EG-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDataRef.value = []
    mockErrorRef.value = null
    mockPendingRef.value = false
  })

  async function mountEventos() {
    const page = await import('../../../app/pages/eventos.vue')
    return mount(page.default, {
      global: {
        components: {
          PageHero: { template: '<div class="page-hero">{{ title }}</div>', props: ['title', 'subtitle'] },
          EventCard: {
            template: '<div class="event-card">{{ evento.titulo }}</div>',
            props: ['evento'],
          },
          BaseButton: { template: '<button><slot /></button>' },
        },
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
        },
      },
    })
  }

  it('renders PageHero with "Eventos" title', async () => {
    mockDataRef.value = [
      { id: '1', titulo: 'Fiesta', fecha: '2027-08-15T20:00:00Z', categoria: 'festivo', activo: true },
    ]

    const wrapper = await mountEventos()
    await flushPromises()
    expect(wrapper.text()).toContain('Eventos')
  })

  it('renders EventCard for each event', async () => {
    mockDataRef.value = [
      { id: '1', titulo: 'Noche Flamenca', fecha: '2027-08-15T20:00:00Z', categoria: 'espectaculo', activo: true },
      { id: '2', titulo: 'San Juan', fecha: '2027-06-23T20:00:00Z', categoria: 'festivo', activo: true },
    ]

    const wrapper = await mountEventos()
    await flushPromises()

    const cards = wrapper.findAll('.event-card')
    expect(cards).toHaveLength(2)
    expect(wrapper.text()).toContain('Noche Flamenca')
    expect(wrapper.text()).toContain('San Juan')
  })

  it('shows "No hay eventos programados" when empty', async () => {
    mockDataRef.value = []

    const wrapper = await mountEventos()
    await flushPromises()

    expect(wrapper.text()).toContain('No hay eventos programados')
  })

  it('shows error state when fetch fails', async () => {
    mockDataRef.value = null
    mockErrorRef.value = new Error('Network error')

    const wrapper = await mountEventos()
    await flushPromises()

    expect(wrapper.text()).toContain('Error al cargar los eventos')
  })

  it('shows "Próximos eventos" heading', async () => {
    mockDataRef.value = [
      { id: '1', titulo: 'Evento futuro', fecha: '2027-12-25T20:00:00Z', categoria: 'festivo', activo: true },
    ]

    const wrapper = await mountEventos()
    await flushPromises()

    expect(wrapper.text()).toContain('Próximos eventos')
  })
})
