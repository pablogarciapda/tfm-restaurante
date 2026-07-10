/**
 * TDD: RED → GREEN → TRIANGULATE — Carta page migration (CN-006)
 *
 * Migrated from mockCarta fixture to usePlatos composable.
 * Groups Supabase platos by categoria, passes to ProductGrid.
 * Only one category visible at a time via activeCategory toggle.
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
g.refreshNuxtData = vi.fn()
const mockClient = {
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
}
g.useSupabaseClient = () => mockClient
g.useSupabaseUser = () => ref({ id: '1', email: 'test@test.com' })
const mockConfigRef = ref({ mostrar_recomendados: true, titulo_recomendados: 'NUESTRAS RECOMENDACIONES' })
const mockCategoriasRef = ref([
  { id: 'cat-1', nombre: 'CARNES', puesto: 10 },
  { id: 'cat-2', nombre: 'PESCADOS', puesto: 20 },
  { id: 'cat-3', nombre: 'ENTRANTES', puesto: 30 },
])
const mockFamiliasRef = ref<{ id: string; nombre: string; categoria_id: string; puesto: number }[]>([])
g.useAsyncData = vi.fn((key: string) => {
  if (key === 'carta-categorias') return { data: mockCategoriasRef }
  if (key === 'carta-familias') return { data: mockFamiliasRef }
  return { data: mockConfigRef }
})

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
          CategorySelector: {
            template: '<div class="category-selector"><button v-for="c in categories" :key="c" data-testid="cat-btn" @click="$emit(\'update:modelValue\', c)">{{ c }}</button></div>',
            props: ['categories', 'modelValue'],
          },
          ProductGrid: { template: '<div class="product-grid">{{ categories.length }} categoría(s)</div>', props: ['categories'] },
          PageHero: { template: '<div class="page-hero">{{ title }} — {{ subtitle }}</div>', props: ['title', 'subtitle'] },
          FamilySelector: { template: '<div class="family-selector" />', props: ['families', 'modelValue'] },
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

  it('passes only the active category to ProductGrid', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Croquetas', precio: 9.5, categoria: 'ENTRANTES', puesto: 1, disponible: true },
      { id: '2', nombre: 'Ensalada', precio: 8.0, categoria: 'ENTRANTES', puesto: 2, disponible: true },
      { id: '3', nombre: 'Jamón', precio: 12.0, categoria: 'ENTRANTES', puesto: 3, disponible: true },
    ]

    const wrapper = await mountCarta()
    await flushPromises()

    const grid = wrapper.findComponent({ name: 'ProductGrid' })
    expect(grid.exists()).toBe(true)

    // ENTRANTES is first category with platos → displayCategory fallback → 1 cat
    const categories = grid.props('categories') as Array<{ categoria: string; platos: unknown[] }>
    expect(categories).toHaveLength(1)
  })

  it('switches category when clicking a different category button', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Croquetas', precio: 9.5, categoria: 'ENTRANTES', puesto: 1, disponible: true },
      { id: '2', nombre: 'Ternera', precio: 14.0, categoria: 'CARNES', puesto: 2, disponible: true },
    ]

    const wrapper = await mountCarta()
    await flushPromises()

    // Initially should show first category with platos (CARNES has puesto 10 < ENTRANTES 30)
    let grid = wrapper.findComponent({ name: 'ProductGrid' })
    let cats = grid.props('categories') as Array<{ categoria: string }>
    expect(cats[0].categoria).toBe('CARNES')

    // Click ENTRANTES button (third DB category: REC, CARNES, PESCADOS, ENTRANTES)
    const buttons = wrapper.findAll('[data-testid="cat-btn"]')
    expect(buttons.length).toBeGreaterThanOrEqual(4)
    await buttons[3].trigger('click') // third cat button = ENTRANTES
    await flushPromises()

    // Now should show only ENTRANTES
    grid = wrapper.findComponent({ name: 'ProductGrid' })
    cats = grid.props('categories') as Array<{ categoria: string }>
    expect(cats).toHaveLength(1)
    expect(cats[0].categoria).toBe('ENTRANTES')
  })

  it('maps Supabase fields to ProductCard contract (nombre→plato, precio→string)', async () => {
    mockPlatosRef.value = [
      { id: '1', nombre: 'Paella', precio: 15.0, descripcion: 'Arroz del senyoret', categoria: 'CARNES', puesto: 1, disponible: true, imagen_url: '/img/paella.jpg', alergenos: ['Mariscos'], calorias: 450 },
    ]

    const wrapper = await mountCarta()
    await flushPromises()

    const grid = wrapper.findComponent({ name: 'ProductGrid' })
    const cats = grid.props('categories') as Array<{ categoria: string; platos: Array<{ plato: string; precio: string }> }>
    expect(cats).toBeTruthy()

    const carnes = cats.find((c) => c.categoria === 'CARNES')
    expect(carnes).toBeTruthy()
    expect(carnes!.platos).toHaveLength(1)
    expect(carnes!.platos[0].plato).toBe('Paella')
    expect(carnes!.platos[0].precio).toContain('15')
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
