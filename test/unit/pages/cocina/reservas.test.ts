/**
 * TDD: Slice 4 update — /cocina/reservas page (MCA-008, fusion wiring)
 *
 * Tests: heading, canvas, toolbar, fusion dialog, standby banner,
 * aforo info, fusion buttons, and middleware config.
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
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() })
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

// Mock useMesasFusion composable (Slice 4)
const mockFuseMesas = vi.fn().mockResolvedValue({ success: true, id_fusion: 'f1' })
const mockUnfuseMesas = vi.fn().mockResolvedValue({ success: true, hasReservations: false })
const mockGetStandbyReservations = vi.fn().mockResolvedValue([])
const mockReassignStandbyReservation = vi.fn().mockResolvedValue({ success: true })
vi.mock('../../../../app/features/mesas/composables/useMesasFusion', () => ({
  useMesasFusion: () => ({
    fuseMesas: mockFuseMesas,
    unfuseMesas: mockUnfuseMesas,
    cancelReservationsAndUnfuse: vi.fn().mockResolvedValue({ success: true }),
    moveReservationsToStandby: vi.fn().mockResolvedValue({ success: true }),
    getStandbyReservations: mockGetStandbyReservations,
    reassignStandbyReservation: mockReassignStandbyReservation,
  }),
}))

// Stubs
const TableCanvasStub = defineComponent({
  setup() {
    return () => h('div', { 'data-testid': 'table-canvas' }, 'Canvas')
  },
})

const TableToolbarStub = defineComponent({
  props: ['selectedMesa', 'aforoInfo', 'canFuse', 'canUnfuse'],
  emits: ['add', 'delete', 'save', 'fuse', 'unfuse'],
  template: '<div data-testid="table-toolbar"><slot /></div>',
})

const FusionConfirmDialogStub = defineComponent({
  props: ['show', 'reservations', 'fusionId'],
  emits: ['cancel', 'standby', 'close'],
  template: '<div data-testid="fusion-dialog"><slot /></div>',
})

const StandbyBannerStub = defineComponent({
  props: ['reservations'],
  emits: ['assign'],
  template: '<div data-testid="standby-banner"><slot /></div>',
})

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
          FusionConfirmDialog: FusionConfirmDialogStub,
          StandbyBanner: StandbyBannerStub,
          AforoIndicator: true,
        },
      },
    })
  }

  // ── Page heading ──

  it('renders "Gestor de Mesas" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Gestor de Mesas')
  })

  // ── TableCanvas ──

  it('renders the TableCanvas component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="table-canvas"]').exists()).toBe(true)
  })

  // ── Meta ──

  it('registers definePageMeta with middleware and layout', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toContain('auth')
    expect(callArgs.middleware).toContain('role')
    expect(callArgs.middleware).toContain('permissions')
    expect(callArgs.layout).toBe('cocina')
  })

  // ── Slice 3: No placeholder ──

  it('no longer shows "Próximamente" placeholder text', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).not.toContain('Próximamente')
  })

  // ── Slice 3: Toolbar + Aforo ──

  it('renders the TableToolbar component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="table-toolbar"]').exists()).toBe(true)
  })

  it('passes aforoInfo prop to the TableToolbar', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo).toBeDefined()
    expect(props.aforoInfo.capacidad_total).toBe(80)
    expect(props.aforoInfo.modo).toBe('auto')
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

  // ── Slice 4: Fusion + Standby ──

  it('renders StandbyBanner component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="standby-banner"]').exists()).toBe(true)
  })

  it('renders FusionConfirmDialog component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="fusion-dialog"]').exists()).toBe(true)
  })

  it('wires toolbar @fuse to fuseMesas', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')
    expect(mockFuseMesas).toHaveBeenCalled()
  })

  it('calls getStandbyReservations on mount', async () => {
    mockGetStandbyReservations.mockResolvedValue([])
    await mountPage()
    expect(mockGetStandbyReservations).toHaveBeenCalled()
  })

  it('passes canFuse and canUnfuse props to toolbar', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    expect(toolbar.props('canFuse')).toBeDefined()
    expect(toolbar.props('canUnfuse')).toBeDefined()
  })
})
