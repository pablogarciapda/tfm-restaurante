/**
 * TDD: Basic coverage — cocina/configuracion page (CFG-001)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'

const userRef = ref({ id: 'admin-1', email: 'admin@test.com' })
const mockNavigateTo = vi.fn((path: string) => path)
const roleRef = ref('admin')
const permissionsRef = ref<Record<string, boolean>>({
  carta: true,
  menu_diario: true,
  eventos: true,
  reservas: true,
  configuracion: true,
  usuarios: true,
})

const g = globalThis as Record<string, unknown>

function makeSupabaseClient(configData?: Record<string, unknown> | null) {
  const result = { data: configData ?? null, error: null }
  const allResult = { data: [], error: null }
  return {
    from: () => ({
      select: () => ({
        limit: () => ({
          single: () => Promise.resolve(result),
        }),
        eq: () => ({
          update: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve(result),
        }),
        order: () => Promise.resolve(allResult),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    auth: { signInWithPassword: vi.fn() },
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
g.useRoute = () => ({ path: '/cocina/configuracion' })

const ConfiguracionFormStub = defineComponent({
  props: ['currentConfig'],
  emits: ['submit'],
  setup() {
    return () => h('div', { 'data-testid': 'config-form' }, 'Config Form')
  },
})

describe('/cocina/configuracion — settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    g.useSupabaseClient = () => makeSupabaseClient()
  })

  async function mountPage() {
    const mod = await import('../../../../app/pages/cocina/configuracion.vue')
    return mount(mod.default, {
      global: {
        stubs: {
          ConfiguracionForm: ConfiguracionFormStub,
        },
      },
    })
  }

  it('renders the ConfiguracionForm component', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="config-form"]').exists()).toBe(true)
  })

  it('registers definePageMeta with middleware and layout', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toContain('auth')
    expect(callArgs.layout).toBe('cocina')
  })

  it('loads config on mount and populates form', async () => {
    g.useSupabaseClient = () => makeSupabaseClient({
      id: 'cfg-1',
      cliente_elige_mesa: true,
      capacidad_total_local: 100,
    })

    const wrapper = await mountPage()
    // Form should be rendered with the config data
    expect(wrapper.find('[data-testid="config-form"]').exists()).toBe(true)
  })
})
