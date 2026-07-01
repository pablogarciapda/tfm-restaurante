/**
 * TDD: RED → GREEN → TRIANGULATE — Auth Middleware (AUTH-003)
 *
 * Checks useSupabaseUser() is non-null. If null → redirect to /cocina.
 * If user exists → proceed (no return value = allow).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ---------- Shared mocks ----------
const userRef = ref<{ id: string; email: string } | null>(null)
const mockNavigateTo = vi.fn((path: string) => path)
const mockSignOut = vi.fn()

// ---------- Inject Nuxt auto-imports ----------
const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useSupabaseClient = () => ({
  auth: { signOut: mockSignOut },
  from: vi.fn(),
})
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('auth middleware (AUTH-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = null
  })

  // ── RED: Unauthenticated → redirect ──
  it('redirects to /cocina when user is null', async () => {
    userRef.value = null

    const mod = await import('../../../app/middleware/auth')
    const result = mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeDefined()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })

  // ── RED: Authenticated → proceed ──
  it('returns nothing when user is authenticated', async () => {
    userRef.value = { id: '1', email: 'admin@test.com' }

    const mod = await import('../../../app/middleware/auth')
    const result = mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  // ── TRIANGULATE: different route redirects to /cocina ──
  it('redirects to /cocina regardless of which protected route was requested', async () => {
    userRef.value = null

    const mod = await import('../../../app/middleware/auth')

    // Try diferentes routes
    for (const route of ['/cocina/carta', '/cocina/eventos', '/cocina/reservas']) {
      mockNavigateTo.mockClear()
      mod.default(
        { path: route, fullPath: route },
        { path: '/', fullPath: '/' },
      )
      expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
    }
  })

  // ── TRIANGULATE: user with session passes ──
  it('allows any authenticated user through', async () => {
    // Different user shapes should all pass
    const users = [
      { id: '1', email: 'admin@test.com' },
      { id: '2', email: 'editor@test.com' },
    ]

    const mod = await import('../../../app/middleware/auth')

    for (const user of users) {
      userRef.value = user
      mockNavigateTo.mockClear()

      const result = mod.default(
        { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
        { path: '/', fullPath: '/' },
      )

      expect(result).toBeUndefined()
      expect(mockNavigateTo).not.toHaveBeenCalled()
    }
  })
})
