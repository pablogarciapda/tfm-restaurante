/**
 * TDD: RED → GREEN → TRIANGULATE — /cocina/usuarios (USR-001 to USR-006)
 *
 * Admin user management page. Middleware-protected (auth, role, permissions).
 * Lists users, create/edit/delete/reset password via UsuarioForm + UsuariosTable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ── Nuxt auto-import mocks ──
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

const mockUsers = [
  { id: 'u1', email: 'admin@test.com', role: 'admin', permissions: {}, activo: true, created_at: '2026-01-01' },
  { id: 'u2', email: 'editor@test.com', role: 'editor', permissions: {}, activo: true, created_at: '2026-02-01' },
]

const mock$fetch = vi.fn().mockResolvedValue(mockUsers)

const g = globalThis as Record<string, unknown>
g.definePageMeta = vi.fn()
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => {
  if (key === 'cocina-role') return roleRef
  if (key === 'cocina-permissions') return permissionsRef
  return ref(init ?? null)
}
g.$fetch = mock$fetch
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/usuarios' })

describe('/cocina/usuarios (USR-001 to USR-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock$fetch.mockResolvedValue(mockUsers)
  })

  async function mountPage() {
    const mod = await import('../../../../app/pages/cocina/usuarios.vue')
    return mount(mod.default, {
      global: {
        stubs: {
          UsuarioForm: { template: '<div class="usuario-form-stub"><slot /></div>', props: ['mode', 'initialEmail', 'initialRole', 'initialPermissions'] },
          UsuariosTable: { template: '<div class="usuarios-table-stub"><slot /></div>', props: ['users'] },
        },
      },
    })
  }

  // ── RED: Page renders heading ──
  it('renders "Gestión de Usuarios" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Gestión de Usuarios')
  })

  // ── RED: "Nuevo usuario" button visible ──
  it('renders "Nuevo usuario" button', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Nuevo usuario')
  })

  // ── RED: Has definePageMeta with middleware ──
  it('registers definePageMeta with middleware', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toBeDefined()
    expect(callArgs.middleware).toContain('auth')
    expect(callArgs.middleware).toContain('permissions')
  })

  // ── RED: Opens UsuarioForm in create mode when "Nuevo usuario" clicked ──
  it('shows UsuarioForm in create mode when "Nuevo usuario" is clicked', async () => {
    const wrapper = await mountPage()
    const newBtn = wrapper.find('[data-testid="new-user-btn"]')
    await newBtn.trigger('click')
    // UsuarioForm stub should appear
    expect(wrapper.find('.usuario-form-stub').exists()).toBe(true)
  })

  // ── TRIANGULATE: Cancel button hides the form ──
  it('hides form when cancel is clicked', async () => {
    const wrapper = await mountPage()
    // Open create form
    await wrapper.find('[data-testid="new-user-btn"]').trigger('click')
    expect(wrapper.find('.usuario-form-stub').exists()).toBe(true)

    // Cancel
    await wrapper.find('[data-testid="cancel-form-btn"]').trigger('click')
    expect(wrapper.find('.usuario-form-stub').exists()).toBe(false)
  })
})
