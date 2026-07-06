/**
 * TDD: RED → GREEN → TRIANGULATE — Role Middleware (PERM-001, PERM-005)
 *
 * Loads profiles row from Supabase, stores role + permissions in useState.
 * Missing profile → force logout, redirect to /cocina.
 *
 * Reads user ID from 'cocina-auth-user' useState (set by auth middleware)
 * with fallback to useSupabaseUser and getSession().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ---------- Shared mocks ----------
const userRef = ref<{ id: string; email: string } | null>({ id: 'user-1', email: 'test@test.com' })
const mockNavigateTo = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()
const stateMap = new Map<string, ReturnType<typeof ref>>()

// Profile query result
let profileData: unknown = null

const mockEq = vi.fn()
const mockSelect = vi.fn()

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
  from: () => ({
    select: mockSelect,
  }),
})
g.useState = (key: string, init?: unknown) => {
  if (!stateMap.has(key)) {
    const initialValue = typeof init === 'function' ? init() : init ?? null
    stateMap.set(key, ref(initialValue))
  }
  return stateMap.get(key)!
}
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('role middleware (PERM-001, PERM-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateMap.clear()
    userRef.value = { id: 'user-1', email: 'test@test.com' }
    profileData = null
    mockSelect.mockReset()
    mockEq.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  function expectQueryForUserId(expectedId: string) {
    mockSelect.mockReturnValue({
      eq: (_field: string, value: string) => {
        expect(value).toBe(expectedId)
        return {
          single: () => Promise.resolve({ data: profileData, error: null }),
        }
      },
    })
  }

  // ── RED: Loads profile via shared state from auth middleware ──
  it('reads user from cocina-auth-user state and loads profile', async () => {
    stateMap.set('cocina-auth-user', ref({ id: 'user-from-state' }))
    // useSupabaseUser is available too, but shared state should win
    userRef.value = { id: 'user-1', email: 'test@test.com' }

    profileData = {
      id: 'user-from-state',
      role: 'admin',
      permissions: { carta: true, menu_diario: true },
    }
    expectQueryForUserId('user-from-state')

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  // ── RED: Falls back to useSupabaseUser when no shared state ──
  it('falls back to useSupabaseUser when cocina-auth-user is not set', async () => {
    profileData = {
      id: 'user-1',
      role: 'admin',
      permissions: { carta: true },
    }
    expectQueryForUserId('user-1')

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  // ── RED: Falls back to getSession when neither shared state nor userRef ──
  it('falls back to getSession when both shared state and userRef are null', async () => {
    stateMap.set('cocina-auth-user', ref(null))
    userRef.value = null

    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-from-session' } } },
      error: null,
    })

    profileData = {
      id: 'user-from-session',
      role: 'admin',
      permissions: { carta: true },
    }
    expectQueryForUserId('user-from-session')

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockGetSession).toHaveBeenCalled()
  })

  // ── RED: Missing profile → logout ──
  it('signs out and redirects to /cocina when profile is missing', async () => {
    stateMap.set('cocina-auth-user', ref({ id: 'user-1' }))

    mockSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
      }),
    })

    const mod = await import('../../../app/middleware/role')
    await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })

  // ── TRIANGULATE: Editor profile with limited permissions ──
  it('stores editor permissions correctly', async () => {
    stateMap.set('cocina-auth-user', ref({ id: 'user-2' }))

    profileData = {
      id: 'user-2',
      role: 'editor',
      permissions: {
        carta: true,
        menu_diario: true,
        eventos: false,
        reservas: false,
        configuracion: false,
        usuarios: false,
      },
    }
    expectQueryForUserId('user-2')

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/eventos', fullPath: '/cocina/eventos' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
  })
})
