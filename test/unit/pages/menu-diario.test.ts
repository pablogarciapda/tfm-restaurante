/**
 * TDD: RED → GREEN → TRIANGULATE — Menu Diario migration (MD-001, MD-004, MD-005)
 *
 * Migrated from mockMenuDiario to useMenuDiario composable.
 * Variable per-day pricing from Supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// --------------- Mock useMenuDiario ---------------
const mockConfigRef = ref<unknown>(null)
const mockItemsRef = ref<Record<string, unknown[]> | null>(null)
const mockPrecioRef = ref<string | null>(null)

const mockUseMenuDiario = () => ({
  config: mockConfigRef,
  items: mockItemsRef,
  precio: mockPrecioRef,
  data: ref(null),
  error: ref(null),
  pending: ref(false),
})

const g = globalThis as Record<string, unknown>
g.useMenuDiario = mockUseMenuDiario
g.useSupabaseClient = () => ({
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
})

describe('Menu Diario page — migrated to useMenuDiario (MD-001, MD-004, MD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigRef.value = null
    mockItemsRef.value = null
    mockPrecioRef.value = null
  })

  async function mountMenuDiario() {
    const page = await import('../../../app/pages/menu-diario.vue')
    return mount(page.default, {
      global: {
        components: {
          PageHero: { template: '<div class="page-hero">{{ title }}</div>', props: ['title', 'subtitle'] },
        },
      },
    })
  }

  it('renders PageHero with "Menú del Día"', async () => {
    mockConfigRef.value = { id: 'cfg-1', day_of_week: 1, precio: '16', activo: true }
    mockPrecioRef.value = '16'
    mockItemsRef.value = {
      primer: [{ id: 'd1', plato_nombre: 'Sopa', seccion: 'primer', puesto: 1 }],
      segundo: [],
      postre: [],
      bebida: [],
      pan: [],
    }

    const wrapper = await mountMenuDiario()
    await flushPromises()
    expect(wrapper.text()).toContain('Menú del Día')
  })

  it('displays variable price from Supabase', async () => {
    mockConfigRef.value = { id: 'cfg-sat', day_of_week: 6, precio: '25', activo: true }
    mockPrecioRef.value = '25'
    mockItemsRef.value = {
      primer: [], segundo: [], postre: [], bebida: [], pan: [],
    }

    const wrapper = await mountMenuDiario()
    await flushPromises()

    expect(wrapper.text()).toContain('25€')
    expect(wrapper.text()).toContain('IVA incluido')
  })

  it('renders 5 sections in Spanish', async () => {
    mockConfigRef.value = { id: 'cfg-1', day_of_week: 1, precio: '16', activo: true }
    mockPrecioRef.value = '16'
    mockItemsRef.value = {
      primer: [{ id: 'd1', plato_nombre: 'Gazpacho', seccion: 'primer', puesto: 1 }],
      segundo: [{ id: 'd2', plato_nombre: 'Paella', seccion: 'segundo', puesto: 1 }],
      postre: [{ id: 'd3', plato_nombre: 'Flan', seccion: 'postre', puesto: 1 }],
      bebida: [{ id: 'd4', plato_nombre: 'Vino', seccion: 'bebida', puesto: 1 }],
      pan: [{ id: 'd5', plato_nombre: 'Pan', seccion: 'pan', puesto: 1 }],
    }

    const wrapper = await mountMenuDiario()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Primer Plato')
    expect(text).toContain('Segundo Plato')
    expect(text).toContain('Postre')
    expect(text).toContain('Bebida')
    expect(text).toContain('Pan y Cubiertos')
  })

  it('shows "Menú no disponible hoy" when no active config', async () => {
    mockConfigRef.value = null
    mockPrecioRef.value = null
    mockItemsRef.value = null

    const wrapper = await mountMenuDiario()
    await flushPromises()

    expect(wrapper.text()).toContain('Menú no disponible hoy')
  })

  it('displays dish names within sections', async () => {
    mockConfigRef.value = { id: 'cfg-1', day_of_week: 3, precio: '16', activo: true }
    mockPrecioRef.value = '16'
    mockItemsRef.value = {
      primer: [
        { id: 'd1', plato_nombre: 'Gazpacho andaluz', seccion: 'primer', puesto: 1, descripcion: 'Con guarnición' },
      ],
      segundo: [],
      postre: [],
      bebida: [],
      pan: [],
    }

    const wrapper = await mountMenuDiario()
    await flushPromises()

    expect(wrapper.text()).toContain('Gazpacho andaluz')
  })
})
