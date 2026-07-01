/**
 * TDD: RED → GREEN → TRIANGULATE — useAuth composable (AUTH-001, AUTH-004)
 *
 * Wraps Supabase auth operations: signIn, signOut, user, isLoading, error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockNavigateTo = vi.fn((p: string) => p)
const userRef = ref<{ id: string; email: string } | null>(null)

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({
  auth: {
    signInWithPassword: mockSignIn,
    signOut: mockSignOut,
  },
  from: vi.fn(),
})
g.useSupabaseUser = () => userRef
g.navigateTo = (...args: unknown[]) => mockNavigateTo(...args)
g.useRouter = () => ({ push: mockNavigateTo })
g.useRoute = () => ({ path: '/cocina' })

async function getUseAuth() {
  const mod = await import('../../../app/composables/useAuth')
  return mod.useAuth()
}

describe('useAuth composable (AUTH-001, AUTH-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = null
    mockSignIn.mockResolvedValue({ data: { user: null }, error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('signIn calls signInWithPassword and returns user on success', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: '1', email: 'admin@test.com' }, session: {} },
      error: null,
    })

    const { signIn } = await getUseAuth()
    const result = await signIn('admin@test.com', 'password123')

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'password123',
    })
    expect(result.data?.user?.email).toBe('admin@test.com')
  })

  it('signIn returns error on failure', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    })

    const { signIn } = await getUseAuth()
    const result = await signIn('wrong@test.com', 'wrongpass')

    expect(result.error).toBeDefined()
  })

  it('signOut calls signOut and navigates to /cocina', async () => {
    const { signOut } = await getUseAuth()
    await signOut()

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/cocina')
  })

  it('user is reactive and reflects useSupabaseUser', async () => {
    const { user } = await getUseAuth()
    expect(user.value).toBeNull()

    userRef.value = { id: '1', email: 'admin@test.com' }
    expect(user.value?.email).toBe('admin@test.com')
  })

  it('isLoading tracks signIn state', async () => {
    let resolveSignIn!: (v: unknown) => void
    mockSignIn.mockReturnValue(
      new Promise((resolve) => { resolveSignIn = resolve }),
    )

    const { signIn, isLoading } = await getUseAuth()

    const promise = signIn('admin@test.com', 'password123')
    expect(isLoading.value).toBe(true)

    resolveSignIn!({ data: { user: { id: '1' }, session: {} }, error: null })
    await promise
    expect(isLoading.value).toBe(false)
  })
})
