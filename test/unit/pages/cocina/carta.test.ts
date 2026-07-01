/**
 * TDD: RED → GREEN → TRIANGULATE — Carta admin page (CRUD-001–CRUD-005)
 *
 * /cocina/carta: list platos, create/edit/delete, toggle disponible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

let mockPlatos: unknown[] = []
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

function createChain(value: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject)
    },
    catch(reject: (e: unknown) => unknown) {
      return Promise.resolve(value).catch(reject)
    },
  }
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle', 'limit']) {
    chain[m] = () => chain
  }
  return chain
}

const g = globalThis as Record<string, unknown>
g.definePageMeta = (_meta: unknown) => {}
g.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
g.useSupabaseUser = () => ref({ id: '1', email: 'admin@test.com' })
g.useSupabaseClient = () => ({
  from: () => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }),
  auth: { signOut: vi.fn() },
})
g.useAuth = () => ({
  signOut: vi.fn(),
  user: ref({ id: '1', email: 'admin@test.com' }),
})
g.navigateTo = vi.fn()
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: vi.fn() })
g.useRoute = () => ({ path: '/cocina/carta' })

describe('/cocina/carta admin page (CRUD-001–CRUD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatos = [
      { id: '1', nombre: 'Croquetas', categoria: 'Entrantes', precio: 9.5, disponible: true, tipo_menu: 'carta', puesto: 1 },
    ]
    mockSelect.mockReturnValue(createChain({ data: mockPlatos, error: null }))
    mockInsert.mockReturnValue(createChain({ data: null, error: null }))
    mockUpdate.mockReturnValue(createChain({ data: null, error: null }))
    mockDelete.mockReturnValue(createChain({ data: null, error: null }))
  })

  async function mountPage() {
    const page = await import('../../../../app/pages/cocina/carta.vue')
    return mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar"><slot /></div>' },
          PlatoForm: {
            template: '<form class="plato-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
            props: ['initialPlato'],
            emits: ['submit', 'cancel'],
          },
          PlatosTable: {
            template: '<div class="platos-table">{{ platos.length }} platos</div>',
            props: ['platos'],
            emits: ['edit', 'delete', 'toggle-disponible'],
          },
        },
      },
    })
  }

  it('renders page heading "Gestión de Carta"', async () => {
    const wrapper = await mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Gestión de Carta')
  })

  it('loads platos from Supabase on mount', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(mockSelect).toHaveBeenCalled()
  })

  it('renders PlatosTable with loaded platos', async () => {
    mockPlatos = [
      { id: '1', nombre: 'A', categoria: 'E', precio: 10, disponible: true, tipo_menu: 'carta', puesto: 1 },
      { id: '2', nombre: 'B', categoria: 'E', precio: 12, disponible: false, tipo_menu: 'carta', puesto: 2 },
    ]
    mockSelect.mockReturnValue(createChain({ data: mockPlatos, error: null }))

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('2 platos')
  })

  it('shows empty table when no platos exist', async () => {
    mockPlatos = []
    mockSelect.mockReturnValue(createChain({ data: [], error: null }))

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('0 platos')
  })
})
