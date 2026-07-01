/**
 * TDD: RED → GREEN → TRIANGULATE — Permissions Middleware (PERM-005)
 *
 * Checks if the current route's resource is allowed by the user's
 * permissions JSON. Admin → always pass. Editor → check permissions[resource].
 * Denied → redirect to /cocina/dashboard with error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ---------- Shared mocks ----------
const mockNavigateTo = vi.fn((path: string) => path)

// ---------- Shared state store (simulating Nuxt useState registry) ----------
const stateStore = new Map<string, ReturnType<typeof ref>>()
function getOrCreateState(key: string) {
  if (!stateStore.has(key)) {
    stateStore.set(key, ref(null))
  }
  return stateStore.get(key)!
}

function setStateValue(key: string, value: unknown) {
  const r = getOrCreateState(key)
  r.value = value
}

// ---------- Inject Nuxt auto-imports on globalThis ----------
const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: Function) => fn
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useState = (key: string, _init?: unknown) => getOrCreateState(key)
g.useSupabaseUser = () => ref({ id: 'user-1', email: 'test@test.com' })
g.useSupabaseClient = () => ({
  auth: { signOut: vi.fn() },
  from: vi.fn(),
})
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina/dashboard' })

describe('permissions middleware (PERM-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateStore.clear()
  })

  // ── Admin → always pass ──
  it('allows admin to access any route', async () => {
    setStateValue('cocina-role', 'admin')
    setStateValue('cocina-permissions', null)

    const mod = await import('../../../app/middleware/permissions')
    const result = mod.default(
      { path: '/cocina/usuarios', fullPath: '/cocina/usuarios' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  // ── Editor → check permissions jsonb ──
  it('allows editor access to permitted resource', async () => {
    setStateValue('cocina-role', 'editor')
    setStateValue('cocina-permissions', {
      carta: true,
      menu_diario: false,
      eventos: false,
      reservas: false,
      configuracion: false,
      usuarios: false,
    })

    const mod = await import('../../../app/middleware/permissions')
    const result = mod.default(
      { path: '/cocina/carta', fullPath: '/cocina/carta' },
      { path: '/', fullPath: '/' },
    )

    expect(result).toBeUndefined()
  })

  // ── Editor denied → redirect ──
  it('redirects editor when resource permission is false', async () => {
    setStateValue('cocina-role', 'editor')
    setStateValue('cocina-permissions', {
      carta: true,
      menu_diario: false,
      eventos: false,
      reservas: false,
      configuracion: false,
      usuarios: false,
    })

    const mod = await import('../../../app/middleware/permissions')
    mod.default(
      { path: '/cocina/usuarios', fullPath: '/cocina/usuarios' },
      { path: '/', fullPath: '/' },
    )

    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina/dashboard')
  })

  // ── TRIANGULATE: Dashboard always accessible ──
  it('allows both admin and editor to access dashboard', async () => {
    const mod = await import('../../../app/middleware/permissions')

    // Admin
    setStateValue('cocina-role', 'admin')
    setStateValue('cocina-permissions', null)
    mockNavigateTo.mockClear()
    let result = mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()

    // Editor with no permissions
    setStateValue('cocina-role', 'editor')
    setStateValue('cocina-permissions', {
      carta: false, menu_diario: false, eventos: false,
      reservas: false, configuracion: false, usuarios: false,
    })
    mockNavigateTo.mockClear()
    result = mod.default(
      { path: '/cocina/dashboard', fullPath: '/cocina/dashboard' },
      { path: '/', fullPath: '/' },
    )
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  // ── TRIANGULATE: All resource mappings ──
  it('maps all /cocina routes to correct resource keys', async () => {
    setStateValue('cocina-role', 'editor')
    setStateValue('cocina-permissions', {
      carta: true,
      menu_diario: true,
      eventos: false,
      reservas: false,
      configuracion: false,
      usuarios: false,
    })

    const mod = await import('../../../app/middleware/permissions')

    // carta → should pass (true)
    mockNavigateTo.mockClear()
    let result = mod.default(
      { path: '/cocina/carta', fullPath: '/cocina/carta' },
      { path: '/', fullPath: '/' },
    )
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()

    // eventos → should fail (false)
    mockNavigateTo.mockClear()
    mod.default(
      { path: '/cocina/eventos', fullPath: '/cocina/eventos' },
      { path: '/', fullPath: '/' },
    )
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina/dashboard')
  })
})
