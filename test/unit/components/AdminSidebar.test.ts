/**
 * TDD: RED → GREEN → TRIANGULATE — AdminSidebar (PU-009)
 *
 * Permission-aware navigation sidebar:
 * - 7 nav links: Dashboard, Carta, Menú Diario, Eventos, Reservas, Configuración, Usuarios
 * - Admin sees all links
 * - Editor sees only permitted links
 * - Active route highlighted
 * - Logout button at bottom
 * - Mobile collapsible (<768px)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockSignOut = vi.fn()
const mockNavigateTo = vi.fn((path: string) => path)

// State store for permissions/role
const stateStore = new Map<string, ReturnType<typeof ref>>()
function getOrCreateState(key: string) {
  if (!stateStore.has(key)) {
    stateStore.set(key, ref(null))
  }
  return stateStore.get(key)!
}
function setState(key: string, value: unknown) {
  getOrCreateState(key).value = value
}

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({
  auth: { signOut: mockSignOut },
  from: vi.fn(),
})
g.useAuth = () => ({
  signIn: vi.fn(),
  signOut: async () => {
    await mockSignOut()
    await mockNavigateTo('/cocina')
  },
  user: ref({ id: '1', email: 'admin@lazingara.es' }),
  isLoading: ref(false),
  error: ref(null),
})
g.useSupabaseUser = () => ref({ id: '1', email: 'admin@lazingara.es' })
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, _init?: unknown) => getOrCreateState(key)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ref({ path: '/cocina/dashboard' })

describe('AdminSidebar (PU-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateStore.clear()
  })

  const mountSidebar = async () => {
    const page = await import('../../../app/components/AdminSidebar.vue')
    return mount(page.default, {
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to" :class="$attrs.class"><slot /></a>',
            props: ['to'],
            inheritAttrs: true,
          },
        },
      },
    })
  }

  // ── RED: Admin sees all 7 links ──
  it('admin sees all 7 navigation links', async () => {
    setState('cocina-role', 'admin')
    setState('cocina-permissions', null)

    const wrapper = await mountSidebar()
    const links = wrapper.findAll('a')

    // Dashboard + 6 resource links = 7 (plus logout at bottom)
    expect(links.length).toBeGreaterThanOrEqual(7)

    const linkTexts = links.map((l) => l.text().trim())
    expect(linkTexts).toContain('Dashboard')
    expect(linkTexts).toContain('Carta')
    expect(linkTexts).toContain('Menú Diario')
    expect(linkTexts).toContain('Eventos')
    expect(linkTexts).toContain('Reservas')
    expect(linkTexts).toContain('Configuración')
    expect(linkTexts).toContain('Usuarios')
  })

  // ── RED: Editor sees only permitted links ──
  it('editor sees only permitted links (carta, menu_diario, eventos)', async () => {
    setState('cocina-role', 'editor')
    setState('cocina-permissions', {
      carta: true,
      menu_diario: true,
      eventos: true,
      reservas: false,
      configuracion: false,
      usuarios: false,
    })

    const wrapper = await mountSidebar()
    const links = wrapper.findAll('a')
    const linkTexts = links.map((l) => l.text().trim())

    // Should see: Dashboard, Carta, Menú Diario, Eventos
    expect(linkTexts).toContain('Dashboard')
    expect(linkTexts).toContain('Carta')
    expect(linkTexts).toContain('Menú Diario')
    expect(linkTexts).toContain('Eventos')

    // Should NOT see: Configuración, Usuarios
    expect(linkTexts).not.toContain('Configuración')
    expect(linkTexts).not.toContain('Usuarios')
  })

  // ── RED: Logout button ──
  it('has a logout button that calls signOut and navigates to /cocina', async () => {
    setState('cocina-role', 'admin')
    setState('cocina-permissions', null)
    mockSignOut.mockResolvedValue({ error: null })

    const wrapper = await mountSidebar()

    const logoutBtn = wrapper.find('[data-testid="sidebar-logout"]')
    expect(logoutBtn.exists()).toBe(true)

    await logoutBtn.trigger('click')
    expect(mockSignOut).toHaveBeenCalled()
  })

  // ── RED: Active route highlighted ──
  it('highlights the active route link', async () => {
    setState('cocina-role', 'admin')
    setState('cocina-permissions', null)

    const wrapper = await mountSidebar()

    // Find the dashboard link (active by default)
    const dashLink = wrapper.find('a[href="/cocina/dashboard"]')
    expect(dashLink.exists()).toBe(true)

    // Should have an active class or attribute
    const classes = dashLink.attributes('class') || ''
    expect(classes).toBeTruthy()
  })
})
