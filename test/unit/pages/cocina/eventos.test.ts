/**
 * TDD: Basic coverage — cocina/eventos page (CEV-001)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'

const userRef = ref({ id: 'editor-1', email: 'editor@test.com' })
const mockNavigateTo = vi.fn((path: string) => path)
const roleRef = ref('editor')
const permissionsRef = ref<Record<string, boolean>>({
  carta: true,
  menu_diario: true,
  eventos: true,
  reservas: false,
  configuracion: false,
  usuarios: false,
})

const g = globalThis as Record<string, unknown>

function makeSupabaseClient() {
  return {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
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
g.useRoute = () => ({ path: '/cocina/eventos' })

const EventoFormStub = defineComponent({
  props: ['initialEvento'],
  emits: ['submit', 'cancel'],
  setup() {
    return () => h('div', { 'data-testid': 'evento-form' }, 'Form')
  },
})

const EventosTableStub = defineComponent({
  props: ['eventos'],
  emits: ['edit', 'delete', 'toggleActivo'],
  setup() {
    return () => h('div', { 'data-testid': 'eventos-table' }, 'Table')
  },
})

describe('/cocina/eventos — CRUD page', () => {
  beforeEach(() => {
    g.useSupabaseClient = () => makeSupabaseClient()
    vi.clearAllMocks()
  })

  async function mountPage() {
    const mod = await import('../../../../app/pages/cocina/eventos.vue')
    return mount(mod.default, {
      global: {
        stubs: {
          EventoForm: EventoFormStub,
          EventosTable: EventosTableStub,
        },
      },
    })
  }

  it('renders "Gestión de Eventos" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Gestión de Eventos')
  })

  it('shows "Nuevo evento" button when form is hidden', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('+ Nuevo evento')
  })

  it('shows EventosTable by default', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="eventos-table"]').exists()).toBe(true)
  })

  it('shows EventoForm when "Nuevo evento" is clicked', async () => {
    const wrapper = await mountPage()
    const btn = wrapper.find('button')
    await btn.trigger('click')
    expect(wrapper.find('[data-testid="evento-form"]').exists()).toBe(true)
  })

  it('registers definePageMeta with middleware and layout', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toContain('auth')
    expect(callArgs.layout).toBe('cocina')
  })

  it('cancels form and shows table again on cancel emit', async () => {
    const wrapper = await mountPage()
    // Show the form first
    const addBtn = wrapper.find('button')
    await addBtn.trigger('click')
    expect(wrapper.find('[data-testid="evento-form"]').exists()).toBe(true)

    // Emit cancel from the form
    const form = wrapper.findComponent(EventoFormStub)
    await form.vm.$emit('cancel')

    expect(wrapper.find('[data-testid="evento-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="eventos-table"]').exists()).toBe(true)
  })

  it('renders EventosTable when form is not shown', async () => {
    const wrapper = await mountPage()
    // Table should be visible since showForm starts as false
    expect(wrapper.find('[data-testid="eventos-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="evento-form"]').exists()).toBe(false)
  })
})
