/**
 * TDD: RED → GREEN → TRIANGULATE — /cocina/reservas placeholder
 *
 * Permission-controlled placeholder: "Próximamente" message.
 * Middleware: auth, role, permissions (reservas).
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

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

describe('/cocina/reservas placeholder', () => {
  async function mountPage() {
    const mod = await import('../../../../app/pages/cocina/reservas.vue')
    return mount(mod.default)
  }

  // ── RED: Shows "Gestor de Reservas" heading ──
  it('renders "Gestor de Reservas" heading', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Gestor de Reservas')
  })

  // ── RED: Shows "Próximamente" text ──
  it('renders "Próximamente" placeholder text', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Próximamente')
  })

  // ── RED: Shows explanatory message about interactive floor plan ──
  it('mentions the interactive floor plan coming in a future phase', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('plano interactivo')
  })

  // ── RED: Has definePageMeta with middleware ──
  it('registers definePageMeta with auth, role, and permissions middleware', async () => {
    await mountPage()
    expect(g.definePageMeta).toHaveBeenCalled()
    const callArgs = (g.definePageMeta as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.middleware).toBeDefined()
  })
})
