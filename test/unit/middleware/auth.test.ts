/**
 * TDD: RED → GREEN → TRIANGULATE — Auth Middleware (AUTH-003)
 *
 * Checks useSupabaseUser() is non-null. If null → fallback to getSession()
 * before redirecting. This handles the SPA boot timing where useSupabaseUser()
 * may not have resolved yet.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ---------- Shared mocks ----------
const userRef = ref<{ id: string; email: string } | null>(null)
const mockNavigateTo = vi.fn((path: string) => path)
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()

// ---------- Inject Nuxt auto-imports ----------
const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useSupabaseClient = () => ({
  auth: {
    signOut: mockSignOut,
    getSession: mockGetSession,
  },
  from: vi.fn(),
})
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('auth middleware (AUTH-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = null
    // Default: no session in storage
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  // ── RED: Unauthenticated → redirect ──
  it('redirects to /cocina when user is null and no session exists', async () => {
    const mod = await import('../../../app/middleware/auth')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeDefined()
    expect(mockGetSession).toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })

  // ── FIX: SPA boot with existing session ──
  it('allows through when useSupabaseUser is null but session exists in storage', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1', email: 'admin@test.com' } } },
      error: null,
    })

    const mod = await import('../../../app/middleware/auth')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockGetSession).toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  // ── RED: Authenticated → proceed ──
  it('skips getSession and proceeds when useSupabaseUser is set', async () => {
    userRef.value = { id: '1', email: 'admin@test.com' }

    const mod = await import('../../../app/middleware/auth')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  // ── TRIANGULATE: different routes all redirect ──
  it('redirects to /cocina regardless of which protected route was requested', async () => {
    const mod = await import('../../../app/middleware/auth')

    for (const route of ['/cocina/carta', '/cocina/eventos', '/cocina/reservas']) {
      mockNavigateTo.mockClear()
      mockGetSession.mockClear()
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

      const result = await mod.default(
        { path: route, fullPath: route },
        { path: '/', fullPath: '/' },
      )

      expect(result).toBeDefined()
      expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
    }
  })

  // ── TRIANGULATE: different authenticated users pass ──
  it('allows any authenticated user through', async () => {
    const users = [
      { id: '1', email: 'admin@test.com' },
      { id: '2', email: 'editor@test.com' },
    ]

    const mod = await import('../../../app/middleware/auth')

    for (const user of users) {
      userRef.value = user
      mockNavigateTo.mockClear()
      mockGetSession.mockClear()

      const result = await mod.default(
        { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
        { path: '/', fullPath: '/' },
      )

      expect(result).toBeUndefined()
      expect(mockGetSession).not.toHaveBeenCalled()
      expect(mockNavigateTo).not.toHaveBeenCalled()
    }
  })
})
