/**
 * TDD: RED → GREEN → TRIANGULATE — /cocina/reservas page (MCA-008)
 *
 * Slice 2: TableCanvas + "Gestor de Mesas" title, loadMesas, Realtime.
 * Slice 3: TableToolbar + AforoIndicator + aforoInfo computation + event wiring.
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
const mockCreateMesa = vi.fn()
const mockDeleteMesa = vi.fn()
vi.mock('../../../../app/features/mesas/composables/useMesas', () => ({
  useMesas: () => ({
    loadMesas: vi.fn().mockResolvedValue(undefined),
    createMesa: mockCreateMesa,
    updateMesa: vi.fn(),
    deleteMesa: mockDeleteMesa,
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

// Stub TableToolbar — renders placeholder with slot for selected mesa text
const TableToolbarStub = defineComponent({
  props: ['selectedMesa', 'aforoInfo'],
  emits: ['add', 'delete', 'save'],
  template: '<div data-testid="table-toolbar"><slot /></div>',
})

// Stub AforoIndicator — renders placeholder
const AforoIndicatorStub = defineComponent({
  props: ['aforoInfo'],
  emits: ['mode-change', 'manual-change'],
  template: '<div data-testid="aforo-indicator">{{ aforoInfo?.disponible || 0 }}</div>',
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
          TableToolbar: TableToolbarStub,
          AforoIndicator: AforoIndicatorStub,
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

  // ── Slice 3: Toolbar + Aforo ──

  it('renders the TableToolbar component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="table-toolbar"]').exists()).toBe(true)
  })

  it('passes aforoInfo prop to the TableToolbar', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    expect(toolbar.exists()).toBe(true)
    // aforoInfo should be a computed object with the expected shape
    const props = toolbar.props()
    expect(props.aforoInfo).toBeDefined()
    expect(props.aforoInfo.capacidad_total).toBe(80)
    expect(props.aforoInfo.modo).toBe('auto')
    expect(typeof props.aforoInfo.disponible).toBe('number')
  })

  it('passes selectedMesa prop to toolbar (null when nothing selected)', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    expect(toolbar.props('selectedMesa')).toBeNull()
  })

  it('wires toolbar @add to createMesa', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('add')
    expect(mockCreateMesa).toHaveBeenCalled()
  })
})
