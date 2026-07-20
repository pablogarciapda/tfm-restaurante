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
const mockCheckAforoOverflow = vi.fn().mockReturnValue({
  overflow: false,
  blocked: false,
  needsOverride: false,
  disponible: 80,
  projected: 0,
})
vi.mock('../../../../app/features/mesas/composables/useMesasFusion', () => ({
  useMesasFusion: () => ({
    fuseMesas: mockFuseMesas,
    unfuseMesas: mockUnfuseMesas,
    cancelReservationsAndUnfuse: vi.fn().mockResolvedValue({ success: true }),
    moveReservationsToStandby: vi.fn().mockResolvedValue({ success: true }),
    getStandbyReservations: mockGetStandbyReservations,
    reassignStandbyReservation: mockReassignStandbyReservation,
    checkAforoOverflow: mockCheckAforoOverflow,
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

  it('renders "Listado de Reservas" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Listado de Reservas')
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

  it('MFU-007/008: capacidad_total is derived from zonas_config enabled zones, NOT capacidad_total_local', async () => {
    // zonas_config sum of enabled = 70 + 14 + 60 = 144 (disabled zone excluded)
    // deprecated capacidad_total_local = 999 — must be ignored
    g.useSupabaseClient = () => makeSupabaseClient({
      configData: {
        capacidad_total_local: 999,
        modo_ocupacion: 'auto',
        ocupacion_manual: 0,
        horarios_config: null,
        zonas_config: [
          { id: 'z1', nombre: 'Principal', capacidad: 70, enabled: true },
          { id: 'z2', nombre: 'Reservado', capacidad: 14, enabled: true },
          { id: 'z3', nombre: 'Zíngaro', capacidad: 60, enabled: true },
          { id: 'z4', nombre: 'Bar', capacidad: 20, enabled: false },
        ],
      },
    })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo.capacidad_total).toBe(144)
    expect(props.aforoInfo.capacidad_total).not.toBe(999)
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

  it('fetches configuracion from DB on mount and derives capacidad_total from zonas_config', async () => {
    // MFU-007/008: capacity ceiling MUST come from enabled zonas_config sum,
    // NOT the deprecated configuracion.capacidad_total_local column (AGENTS.md §4).
    g.useSupabaseClient = () => makeSupabaseClient({
      configData: {
        id: 'cfg-1',
        capacidad_total_local: 999, // deprecated — must be ignored
        modo_ocupacion: 'manual',
        ocupacion_manual: 45,
        zonas_config: [
          { id: 'z1', nombre: 'Principal', capacidad: 70, enabled: true },
          { id: 'z2', nombre: 'Reservado', capacidad: 14, enabled: true },
          { id: 'z3', nombre: 'Bar', capacidad: 36, enabled: true },
          { id: 'z4', nombre: 'Patio', capacidad: 200, enabled: false },
        ],
      },
    })

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    const props = toolbar.props()
    expect(props.aforoInfo.capacidad_total).toBe(120) // 70 + 14 + 36
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

  // ── MFU-007 / MFU-008: aforo overflow role-gated enforcement ──

  it('MFU-007: editor overflow → toast shown, fuseMesas NOT called', async () => {
    roleRef.value = 'editor'
    mockCheckAforoOverflow.mockReturnValue({
      overflow: true,
      blocked: true,
      needsOverride: false,
      disponible: 1,
      projected: 33,
    })
    mockFuseMesas.mockClear()

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')

    expect(mockCheckAforoOverflow).toHaveBeenCalled()
    expect(mockFuseMesas).not.toHaveBeenCalled()
    // Toast must be visible with the exact editor-blocked message
    const toast = wrapper.find('[data-testid="aforo-overflow-toast"]')
    expect(toast.exists()).toBe(true)
    expect(toast.text()).toContain('Aforo completo. Libere mesas primero.')
  })

  it('MFU-008: admin overflow → dialog shown, fuseMesas NOT called until confirmation', async () => {
    roleRef.value = 'admin'
    mockCheckAforoOverflow.mockReturnValue({
      overflow: true,
      blocked: false,
      needsOverride: true,
      disponible: 1,
      projected: 33,
    })
    mockFuseMesas.mockClear()

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')

    // Dialog should be shown, fuse NOT yet called
    const dialog = wrapper.find('[data-testid="aforo-overflow-dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Aforo excedido')
    expect(mockFuseMesas).not.toHaveBeenCalled()
  })

  it('MFU-008: admin "Forzar" → fuseMesas called, aforo bar overflow flag set', async () => {
    roleRef.value = 'admin'
    mockCheckAforoOverflow.mockReturnValue({
      overflow: true,
      blocked: false,
      needsOverride: true,
      disponible: 1,
      projected: 33,
    })
    mockFuseMesas.mockClear()

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')

    expect(mockFuseMesas).not.toHaveBeenCalled()

    // Click "Forzar"
    const forceBtn = wrapper.find('[data-testid="aforo-overflow-force"]')
    expect(forceBtn.exists()).toBe(true)
    await forceBtn.trigger('click')
    await flushPromises()

    expect(mockFuseMesas).toHaveBeenCalled()
    // AforoInfo must carry overflow=true so AforoIndicator renders red
    const toolbar2 = wrapper.findComponent(TableToolbarStub)
    expect(toolbar2.props('aforoInfo').overflow).toBe(true)
  })

  it('MFU-008: admin "Cancelar" → fuseMesas NOT called, dialog closed', async () => {
    roleRef.value = 'admin'
    mockCheckAforoOverflow.mockReturnValue({
      overflow: true,
      blocked: false,
      needsOverride: true,
      disponible: 1,
      projected: 33,
    })
    mockFuseMesas.mockClear()

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')

    const cancelBtn = wrapper.find('[data-testid="aforo-overflow-cancel"]')
    expect(cancelBtn.exists()).toBe(true)
    await cancelBtn.trigger('click')
    await flushPromises()

    expect(mockFuseMesas).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="aforo-overflow-dialog"]').exists()).toBe(false)
  })

  it('MFU-007/008: no overflow → proceeds directly without dialog or toast', async () => {
    roleRef.value = 'editor'
    mockCheckAforoOverflow.mockReturnValue({
      overflow: false,
      blocked: false,
      needsOverride: false,
      disponible: 76,
      projected: 4,
    })
    mockFuseMesas.mockClear()

    const wrapper = await mountPage()
    await flushPromises()

    const toolbar = wrapper.findComponent(TableToolbarStub)
    await toolbar.vm.$emit('fuse')
    await flushPromises()

    expect(mockFuseMesas).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="aforo-overflow-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="aforo-overflow-toast"]').exists()).toBe(false)
  })
})
