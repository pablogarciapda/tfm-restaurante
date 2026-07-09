/**
 * TDD: RED → GREEN → TRIANGULATE — Cocina Admin Layout (PU-010)
 *
 * Admin layout for /cocina/** pages:
 * - Top bar: "La Zíngara" + user email + logout button
 * - AdminSidebar component
 * - main slot for page content
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'

const mockSignOut = vi.fn()
const mockNavigateTo = vi.fn((path: string) => path)
const userRef = ref<{ id: string; email: string } | null>({ id: '1', email: 'admin@lazingara.es' })

const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
g.useSupabaseUser = () => userRef
g.useAuth = () => ({
  signIn: vi.fn(),
  signOut: async () => {
    await mockSignOut()
    await mockNavigateTo('/cocina')
  },
  user: userRef,
  isLoading: ref(false),
  error: ref(null),
})
g.useSupabaseClient = () => ({
  auth: { signOut: mockSignOut },
  from: vi.fn(),
})
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

// Mock useRestaurantConfig for multi-tenant name
g.ref = ref

g.useRestaurantConfig = () => {
  const restaurant = ref({
    nombre: 'La Zíngara',
    direccion: '',
    telefono: '',
    maps_url: '',
    logo_url: null,
    site_url: '',
    email: '',
    instagram_url: '',
    facebook_url: '',
    poblacion: '',
  })
  return {
    restaurant,
    direccionLineas: ref([]),
    logoUrl: ref('/images/logo.png'),
    nombre: computed(() => restaurant.value.nombre),
    telefono: computed(() => restaurant.value.telefono),
    mapsUrl: computed(() => restaurant.value.maps_url),
    siteUrl: computed(() => restaurant.value.site_url),
    email: computed(() => restaurant.value.email),
    instagramUrl: computed(() => restaurant.value.instagram_url),
    facebookUrl: computed(() => restaurant.value.facebook_url),
    poblacion: computed(() => restaurant.value.poblacion),
  }
}

describe('cocina layout (PU-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { id: '1', email: 'admin@lazingara.es' }
  })

  it('renders the restaurant name "La Zíngara" in top bar', async () => {
    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar-mock"><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('La Zíngara')
  })

  it('renders the user email in the top bar', async () => {
    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar-mock"><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('admin@lazingara.es')
  })

  it('renders "Cerrar sesión" logout button', async () => {
    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar-mock"><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Cerrar sesión')
  })

  it('renders AdminSidebar component', async () => {
    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<nav data-testid="admin-sidebar">Sidebar</nav>' },
        },
      },
    })

    expect(wrapper.find('[data-testid="admin-sidebar"]').exists()).toBe(true)
  })

  it('renders page content in a main slot', async () => {
    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar-mock"><slot /></div>' },
        },
      },
      slots: {
        default: '<p data-testid="page-content">Test Content</p>',
      },
    })

    expect(wrapper.find('[data-testid="page-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-content"]').text()).toBe('Test Content')
  })

  it('calls signOut and navigates to /cocina on logout click', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    const page = await import('../../../app/layouts/cocina.vue')
    const wrapper = mount(page.default, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          AdminSidebar: { template: '<div class="sidebar-mock"><slot /></div>' },
        },
      },
    })

    // Find and click the logout button
    const logoutBtn = wrapper.find('[data-testid="logout-button"]')
    await logoutBtn.trigger('click')
    await flushPromises()

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })
})
