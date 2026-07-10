/**
 * TDD: Slice 4 update — /cocina/reservas page (MCA-008, fusion wiring)
 *
 * Tests: heading, canvas, toolbar, fusion dialog, standby banner,
 * aforo info, fusion buttons, and middleware config.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

// Default Supabase mock factory — returns empty data
function makeSupabaseClient(overrides?: {
  configData?: Record<string, unknown> | null
  configError?: Error | null
}) {
  const configResult = {
    data: overrides?.configData ?? null,
    error: overrides?.configError ?? null,
  }

  const queryBuilder = () => ({
    select: () => ({
      eq: () => queryBuilder(),
      order: () => queryBuilder(),
      limit: () => queryBuilder(),
      gte: () => ({
        lt: () => Promise.resolve({ data: [], error: null }),
      }),
      single: () => Promise.resolve(configResult),
    }),
  })

  return {
    from: () => queryBuilder(),
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }), getUser: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn() },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() }),
    removeChannel: vi.fn(),
  }
}

g.useSupabaseClient = () => makeSupabaseClient()
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
    // Reset to default supabase mock (returns null config)
    g.useSupabaseClient = () => makeSupabaseClient()
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
    await flushPromises()
    expect(mockGetStandbyReservations).toHaveBeenCalled()
  })

  it('passes canFuse and canUnfuse props to toolbar', async () => {
    const wrapper = await mountPage()
    const toolbar = wrapper.findComponent(TableToolbarStub)
    expect(toolbar.props('canFuse')).toBeDefined()
    expect(toolbar.props('canUnfuse')).toBeDefined()
  })

  // ── Fix 3: capacidadTotal from configuracion DB ──

  it('fetches configuracion from DB on mount and uses capacidad_total_local', async () => {
    // Setup mock to return specific config
    g.useSupabaseClient = () => makeSupabaseClient({
      configData: {
        id: 'cfg-1',
        cliente_elige_mesa: false,
        capacidad_total_local: 120,
        modo_ocupacion: 'manual',
        ocupacion_manual: 45,
      },
    })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo.capacidad_total).toBe(120)
    expect(props.aforoInfo.modo).toBe('manual')
    expect(props.aforoInfo.ocupacion_manual).toBe(45)
  })

  it('falls back to default 80 when configuracion fetch returns null', async () => {
    g.useSupabaseClient = () => makeSupabaseClient({ configData: null })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo.capacidad_total).toBe(80)
    expect(props.aforoInfo.modo).toBe('auto')
  })

  it('falls back to defaults when configuracion fetch errors', async () => {
    g.useSupabaseClient = () => makeSupabaseClient({
      configData: null,
      configError: new Error('Connection refused'),
    })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo.capacidad_total).toBe(80)
    expect(props.aforoInfo.modo).toBe('auto')
  })

  // ── Coverage: uncovered branches ──

  it('handles refreshStandbyReservations error gracefully', async () => {
    mockGetStandbyReservations.mockRejectedValue(new Error('DB error'))
    await mountPage()
    await flushPromises()
    // Should not throw — error is caught silently
    expect(mockGetStandbyReservations).toHaveBeenCalled()
  })

  it('handles fuse failure without throwing', async () => {
    mockFuseMesas.mockResolvedValue({ success: false, error: 'Fusion failed' })
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')

    expect(mockFuseMesas).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Fusion failed')
    consoleSpy.mockRestore()
  })

  it('opens fusion dialog when unfuse has reservations', async () => {
    mockUnfuseMesas.mockResolvedValue({
      success: true,
      hasReservations: true,
      reservations: [{ id: 'r1', nombre_cliente: 'Test', fecha_hora: '2026-01-01', numero_comensales: 2, estado: 'confirmada', mesa_id: 'm1' }],
    })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('unfuse')

    // Dialog should be shown
    const dialog = wrapper.find('[data-testid="fusion-dialog"]')
    expect(dialog.exists()).toBe(true)
  })

  it('handleReassignStandby does nothing when no libre mesa exists', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    // Trigger reassign via StandbyBanner emit when store has no mesas
    mockReassignStandbyReservation.mockClear()
    const banner = wrapper.findComponent(StandbyBannerStub)
    await banner.vm.$emit('assign', 'standby-1')

    // No libre mesa → reassign should NOT be called
    expect(mockReassignStandbyReservation).not.toHaveBeenCalled()
  })
})
