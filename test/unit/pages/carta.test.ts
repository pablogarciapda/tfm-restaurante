/**
 * TDD: RED → GREEN → TRIANGULATE — Carta page migration (CN-006)
 *
 * Migrated from mockCarta fixture to usePlatos composable.
 * Groups Supabase platos by categoria, passes to ProductGrid.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// --------------- Mock usePlatos ---------------
const mockPlatosRef = ref<unknown[]>([])
const mockErrorRef = ref<Error | null>(null)
const mockPendingRef = ref(false)

const mockUsePlatos = () => ({
  data: mockPlatosRef,
  error: mockErrorRef,
  pending: mockPendingRef,
})

// --------------- GlobalThis injections ---------------
const g = globalThis as Record<string, unknown>
g.usePlatos = mockUsePlatos
g.useSupabaseClient = () => ({
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
})
g.useSupabaseUser = () => ref({ id: '1', email: 'test@test.com' })
g.useAsyncData = vi.fn()

describe('Carta page — migrated to usePlatos (CN-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatosRef.value = []
    mockErrorRef.value = null
    mockPendingRef.value = false
  })

  async function mountCarta() {
    const page = await import('../../../app/pages/carta.vue')
    return mount(page.default, {
      global: {
        components: {
          CategorySelector: { template: '<div class="category-selector"><slot /></div>', props: ['categories', 'modelValue'] },
          ProductGrid: { template: '<div class="product-grid"><slot /></div>', props: ['categories'] },
          PageHero: { template: '<div class="page-hero">{{ title }} — {{ subtitle }}</div>', props: ['title', 'subtitle'] },
        },
      },
    })
  }

  it('renders PageHero with "Nuestra Carta" title', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Croquetas', precio: 9.5, categoria: 'Entrantes', puesto: 1, disponible: true },
    ]

    const wrapper = await mountCarta()
    await flushPromises()
    expect(wrapper.text()).toContain('Nuestra Carta')
  })

  it('groups platos by categoria and passes categories to ProductGrid', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Croquetas', precio: 9.5, categoria: 'Entrantes', puesto: 1, disponible: true },
      { id: '2', nombre: 'Ensalada', precio: 8.0, categoria: 'Ensaladas', puesto: 2, disponible: true },
      { id: '3', nombre: 'Jamón', precio: 12.0, categoria: 'Entrantes', puesto: 1, disponible: true },
    ]

    const wrapper = await mountCarta()
    await flushPromises()

    const grid = wrapper.findComponent({ name: 'ProductGrid' })
    expect(grid.exists()).toBe(true)

    const categories = grid.props('categories') as Array<{ categoria: string; platos: unknown[] }>
    expect(categories).toBeTruthy()
    expect(categories.length).toBeGreaterThanOrEqual(2)
  })

  it('maps Supabase fields to ProductCard contract (nombre→plato, precio→string)', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Paella', precio: 15.0, descripcion: 'Arroz del senyoret', categoria: 'Arroces', puesto: 1, disponible: true, imagen_url: '/img/paella.jpg', alergenos: ['Mariscos'], calorias: 450 },
    ]

    const wrapper = await mountCarta()
    await flushPromises()

    const grid = wrapper.findComponent({ name: 'ProductGrid' })
    const cats = grid.props('categories') as Array<{ categoria: string; platos: Array<{ plato: string; precio: string }> }>
    expect(cats).toBeTruthy()

    // At least one category with dishes
    const arroces = cats.find((c) => c.categoria === 'Arroces')
    expect(arroces).toBeTruthy()
    expect(arroces!.platos).toHaveLength(1)
    expect(arroces!.platos[0].plato).toBe('Paella')
    expect(arroces!.platos[0].precio).toContain('15')
  })

  it('shows "Carta no disponible" when platos array is empty', async () => {
    mockPlatosRef.value = []

    const wrapper = await mountCarta()
    await flushPromises()

    expect(wrapper.text()).toContain('Carta no disponible')
  })

  it('shows error state when Supabase fetch fails', async () => {
    mockPlatosRef.value = null
    mockErrorRef.value = new Error('Connection refused')

    const wrapper = await mountCarta()
    await flushPromises()

    expect(wrapper.text()).toContain('Error al cargar la carta')
  })
})
