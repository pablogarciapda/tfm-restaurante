/**
 * TDD: RED → GREEN → TRIANGULATE — Role Middleware (PERM-001, PERM-005)
 *
 * Loads profiles row from Supabase, stores role + permissions in useState.
 * Missing profile → force logout, redirect to /cocina.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ---------- Shared mocks ----------
const userRef = ref<{ id: string; email: string } | null>({ id: 'user-1', email: 'test@test.com' })
const mockNavigateTo = vi.fn()
const mockSignOut = vi.fn()

// Profile query result
let profileData: unknown = null
let profileError: unknown = null

const mockFromSelect = vi.fn()

// ---------- Inject Nuxt auto-imports ----------
const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: Function) => fn
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useSupabaseClient = () => ({
  auth: { signOut: mockSignOut },
  from: () => ({
    select: mockFromSelect,
  }),
})
g.useState = (key: string, init?: unknown) => ref(init ?? null)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('role middleware (PERM-001, PERM-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { id: 'user-1', email: 'test@test.com' }
    profileData = null
    profileError = null
    mockFromSelect.mockReset()
  })

  // ── RED: Loads profile and stores role ──
  it('loads profile and stores role + permissions in useState', async () => {
    profileData = {
      id: 'user-1',
      role: 'admin',
      permissions: { carta: true, menu_diario: true },
    }

    mockFromSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: profileData, error: null }),
      }),
    })

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
  })

  // ── RED: Missing profile → logout ──
  it('signs out and redirects to /cocina when profile is missing', async () => {
    mockFromSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
      }),
    })

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })

  // ── TRIANGULATE: Editor profile with limited permissions ──
  it('stores editor permissions correctly', async () => {
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

    mockFromSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: profileData, error: null }),
      }),
    })

    const mod = await import('../../../app/middleware/role')
    const result = await mod.default(
      { path: '/cocina/eventos', fullPath: '/cocina/eventos' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
  })
})
