/**
 * TDD: RED → GREEN → TRIANGULATE — Menu Diario migration (MD-001, MD-004, MD-005)
 *
 * Migrated from mockMenuDiario to useMenuDiario composable.
 * Variable per-day pricing from Supabase.
 * Holiday check via eventos table.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// --------------- Mock useMenuDiario ---------------
const mockConfigRef = ref<unknown>(null)
const mockItemsRef = ref<Record<string, unknown[]> | null>(null)
const mockPrecioRef = ref<string | null>(null)
const mockIsHolidayRef = ref(false)

const mockUseMenuDiario = () => ({
  config: mockConfigRef,
  items: mockItemsRef,
  precio: mockPrecioRef,
  isHoliday: mockIsHolidayRef,
  data: ref(null),
  error: ref(null),
  pending: ref(false),
  refresh: vi.fn(),
})

const g = globalThis as Record<string, unknown>
g.useMenuDiario = mockUseMenuDiario
const mockRealtimeChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }
g.useSupabaseClient = () => ({
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  channel: vi.fn().mockReturnValue(mockRealtimeChannel),
  removeChannel: vi.fn(),
})

describe('Menu Diario page — migrated to useMenuDiario (MD-001, MD-004, MD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigRef.value = null
    mockItemsRef.value = null
    mockPrecioRef.value = null
    mockIsHolidayRef.value = false
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
    expect(text).toContain('Primer plato')
    expect(text).toContain('Segundo plato')
    expect(text).toContain('Postre')
    expect(text).toContain('Bebida')
    expect(text).toContain('Pan y cubiertos')
  })

  it('shows "Hoy no disponemos de menú" when no active config', async () => {
    mockConfigRef.value = null
    mockPrecioRef.value = null
    mockItemsRef.value = null

    const wrapper = await mountMenuDiario()
    await flushPromises()

    expect(wrapper.text()).toContain('Hoy no disponemos de menú')
  })

  it('shows "Hoy no disponemos de menú" when isHoliday is true', async () => {
    mockConfigRef.value = { id: 'cfg-1', day_of_week: 1, precio: '16', activo: true }
    mockPrecioRef.value = '16'
    mockItemsRef.value = {
      primer: [{ id: 'd1', plato_nombre: 'Sopa', seccion: 'primer', puesto: 1 }],
      segundo: [], postre: [], bebida: [], pan: [],
    }
    mockIsHolidayRef.value = true

    const wrapper = await mountMenuDiario()
    await flushPromises()

    expect(wrapper.text()).toContain('Hoy no disponemos de menú')
  })

  it('displays the formatted date when menu is available', async () => {
    mockConfigRef.value = { id: 'cfg-1', day_of_week: 1, precio: '18', activo: true }
    mockPrecioRef.value = '18'
    mockItemsRef.value = {
      primer: [{ id: 'd1', plato_nombre: 'Sopa', seccion: 'primer', puesto: 1 }],
      segundo: [], postre: [], bebida: [], pan: [],
    }

    const wrapper = await mountMenuDiario()
    await flushPromises()

    // Should show the date in Spanish format (day name + date)
    const text = wrapper.text()
    // Today is a weekday, so the date line should appear
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}/)
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
