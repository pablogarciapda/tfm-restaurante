/**
 * TDD: RED → GREEN → TRIANGULATE — Login Page (/cocina)
 *
 * AUTH-001 / AUTH-005 scenarios.
 *
 * Mock strategy: Nuxt auto-imported composables are injected on
 * globalThis before the SFC module evaluates, because the Vite+Vue
 * plugin does not resolve `#imports` in unit-test mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ---------- Shared mutable mocks ----------
const mockSignIn = vi.fn()
const mockNavigateTo = vi.fn()
const userRef = ref<{ id: string; email: string } | null>(null)

// ---------- Inject Nuxt auto-imports onto globalThis BEFORE any import ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

g.useSupabaseClient = () => ({
  auth: {
    signInWithPassword: mockSignIn,
    signOut: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
})

g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, init?: unknown) => {
  // Simple reactive state per key
  if (!g.__stateMap) g.__stateMap = new Map()
  if (!g.__stateMap.has(key)) {
    g.__stateMap.set(key, ref(init ?? null))
  }
  return g.__stateMap.get(key)
}
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina' })

describe('Login Page — /cocina', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    g.__stateMap?.clear()
    userRef.value = null
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
  })

  // ================================================================
  // AUTH-001: Form rendering
  // ================================================================
  describe('AUTH-001: Form rendering', () => {
    it('renders email input with type="email" and placeholder "Email"', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
      expect(emailInput.attributes('placeholder')).toBe('Email')
    })

    it('renders password input with type="password" and placeholder "Contraseña"', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      const passInput = wrapper.find('input[type="password"]')
      expect(passInput.exists()).toBe(true)
      expect(passInput.attributes('placeholder')).toBe('Contraseña')
    })

    it('renders "Entrar" submit button', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Entrar')
    })

    it('displays "Iniciar sesión" heading', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      expect(wrapper.text()).toContain('Iniciar sesión')
    })
  })

  // ================================================================
  // AUTH-001: Successful login
  // ================================================================
  describe('AUTH-001: Successful login', () => {
    it('calls signInWithPassword with email and password on submit', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com' }, session: {} },
        error: null,
      })

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@lazingara.es')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'admin@lazingara.es',
        password: 'password123',
      })
    })

    it('hard-redirects to /cocina/dashboard after successful login', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '1' }, session: {} },
        error: null,
      })

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@lazingara.es')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(window.location.pathname).toBe('/cocina/dashboard')
    })

    it('does NOT navigate on login failure', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('wrong@test.com')
      await wrapper.find('input[type="password"]').setValue('wrongpass')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockNavigateTo).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // AUTH-001: Invalid credentials
  // ================================================================
  describe('AUTH-001: Invalid credentials error message', () => {
    it('shows "Credenciales incorrectas" on invalid credentials', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('wrong@test.com')
      await wrapper.find('input[type="password"]').setValue('wrongpass')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Credenciales incorrectas')
    })
  })

  // ================================================================
  // AUTH-001: Form validation
  // ================================================================
  describe('AUTH-001: Form validation', () => {
    it('shows Spanish validation error for invalid email format', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('notanemail')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toMatch(/email/i)
    })

    it('shows Spanish validation error for password shorter than 6 chars', async () => {
      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@test.com')
      await wrapper.find('input[type="password"]').setValue('12345')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toMatch(/contraseña|caracteres/i)
    })

    it('clears field-specific error when user starts typing', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '1' }, session: {} },
        error: null,
      })

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      // Submit with empty fields → validation errors appear
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toMatch(/email/i)

      // Type valid email → error should clear
      await wrapper.find('input[type="email"]').setValue('admin@test.com')
      await flushPromises()

      const pTags = wrapper.findAll('p')
      const emailErrorVisible = pTags.some(
        (p) => p.text().includes('email') && p.text().includes('válido'),
      )
      expect(emailErrorVisible).toBe(false)
    })
  })

  // ================================================================
  // AUTH-001: Loading state
  // ================================================================
  describe('AUTH-001: Loading state', () => {
    it('disables the submit button while login is in progress', async () => {
      let resolveSignIn!: (value: unknown) => void
      mockSignIn.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve
        }),
      )

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@test.com')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeDefined()

      resolveSignIn!({ data: { user: { id: '1' }, session: {} }, error: null })
      await flushPromises()
    })

    it('shows "Entrando..." text on button while loading', async () => {
      let resolveSignIn!: (value: unknown) => void
      mockSignIn.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve
        }),
      )

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@test.com')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      const button = wrapper.find('button[type="submit"]')
      expect(button.text()).toContain('Entrando')

      resolveSignIn!({ data: { user: { id: '1' }, session: {} }, error: null })
      await flushPromises()
    })
  })

  // ================================================================
  // AUTH-001: Network error
  // ================================================================
  describe('AUTH-001: Network error', () => {
    it('shows "Error de conexión. Inténtelo de nuevo." on network error', async () => {
      mockSignIn.mockRejectedValue(new Error('Network Error'))

      const page = await import('../../../../app/pages/cocina/index.vue')
      const wrapper = mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await wrapper.find('input[type="email"]').setValue('admin@test.com')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Error de conexión')
    })
  })

  // ================================================================
  // AUTH-005: Already authenticated redirect
  // ================================================================
  describe('AUTH-005: Redirect if already authenticated', () => {
    it('redirects to /cocina/dashboard when user is already logged in', async () => {
      userRef.value = { id: '1', email: 'admin@test.com' }

      const page = await import('../../../../app/pages/cocina/index.vue')
      mount(page.default, {
        global: {
          stubs: {
            NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
          },
        },
      })

      await flushPromises()

      expect(mockNavigateTo).toHaveBeenCalledWith('/cocina/dashboard')
    })
  })
})
