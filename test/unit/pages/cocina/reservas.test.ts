/**
 * TDD: RED → GREEN → TRIANGULATE — /cocina/reservas page (MCA-008)
 *
 * Replaces placeholder with TableCanvas + "Gestor de Mesas" title.
 * Uses TableCanvas component (stubbed), loads mesas on mount,
 * subscribes/unsubscribes Realtime on mount/unmount.
 *
 * Middleware: auth, role, permissions (reservas). Layout: cocina.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Nuxt auto-import mocks ──
const userRef = ref({ id: 'editor-1', email: 'editor@test.com' })
const mockNavigateTo = vi.fn((path: string) => path)
const roleRef = ref('editor')
const permissionsRef = ref<Record<string, boolean>>({
  carta: true,
  menu_diario: true,
  eventos: true,
  reservas: true,
  configuracion: false,
  usuarios: false,
})

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => {
  if (key === 'cocina-role') return roleRef
  if (key === 'cocina-permissions') return permissionsRef
  return ref(init ?? null)
}
g.definePageMeta = vi.fn()
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/reservas' })

// Mock useMesas composable
vi.mock('../../../../app/features/mesas/composables/useMesas', () => ({
  useMesas: () => ({
    loadMesas: vi.fn().mockResolvedValue(undefined),
    createMesa: vi.fn(),
    updateMesa: vi.fn(),
    deleteMesa: vi.fn(),
    subscribeRealtime: vi.fn(),
    unsubscribeRealtime: vi.fn(),
  }),
}))

// Stub TableCanvas — renders a placeholder div
const TableCanvasStub = defineComponent({
  setup() {
    return () => h('div', { 'data-testid': 'table-canvas' }, 'Canvas')
  },
})

// ============================================================================
// /cocina/reservas Page Tests
// ============================================================================

describe('/cocina/reservas — table manager page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  async function mountPage() {
    const mod = await import('../../../../app/pages/cocina/reservas.vue')
    return mount(mod.default, {
      global: {
        stubs: {
          TableCanvas: TableCanvasStub,
        },
      },
    })
  }

  // ── Page heading ──

  it('renders "Gestor de Mesas" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Gestor de Mesas')
  })

  // ── TableCanvas rendering ──

  it('renders the TableCanvas component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="table-canvas"]').exists()).toBe(true)
  })

  // ── Page meta middleware ──

  it('registers definePageMeta with auth, role, and permissions middleware', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toBeDefined()
    expect(callArgs.middleware).toContain('auth')
    expect(callArgs.middleware).toContain('role')
    expect(callArgs.middleware).toContain('permissions')
  })

  it('page meta includes layout: cocina', async () => {
    await mountPage()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.layout).toBe('cocina')
  })

  // ── Removed placeholder assertions ──

  it('no longer shows "Próximamente" placeholder text', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).not.toContain('Próximamente')
  })

  it('no longer references interactive floor plan as future feature', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).not.toContain('plano interactivo')
  })
})
