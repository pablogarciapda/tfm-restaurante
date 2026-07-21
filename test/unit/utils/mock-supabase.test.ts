import { describe, it, expect, vi } from 'vitest'
import { createMockSupabaseClient } from '../../../test/utils/mock-supabase'

describe('createMockSupabaseClient (TH-004)', () => {
  describe('from().select() chain', () => {
    it('select returns configurable data', async () => {
      const mockData = [{ id: 1, nombre: 'Gazpacho' }]
      const client = createMockSupabaseClient({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await client.from('platos').select()

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('select returns error when configured', async () => {
      const mockError = { message: 'Connection refused' }
      const client = createMockSupabaseClient({
        select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      })

      const result = await client.from('platos').select()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('returns empty array for empty response', async () => {
      const client = createMockSupabaseClient({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await client.from('platos').select()

      expect(result.data).toEqual([])
    })
  })

  describe('chainable query methods', () => {
    it('supports .eq() filter', async () => {
      const selectFn = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null })
      const client = createMockSupabaseClient({ select: selectFn })

      await client.from('platos').select().eq('categoria', 'ENSALADAS')

      // The chain returns itself; verify select was called
      expect(selectFn).toHaveBeenCalled()
    })

    it('supports .order() method', async () => {
      const selectFn = vi.fn().mockResolvedValue({ data: [], error: null })
      const client = createMockSupabaseClient({ select: selectFn })

      await client.from('platos').select().order('puesto')

      expect(selectFn).toHaveBeenCalled()
    })

    it('supports .single() method', async () => {
      const selectFn = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
      const client = createMockSupabaseClient({ select: selectFn })

      const result = await client.from('platos').select().single()

      expect(result.data).toEqual({ id: 1 })
    })
  })

  describe('insert()', () => {
    it('returns created row', async () => {
      const client = createMockSupabaseClient({
        insert: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
      })

      const result = await client.from('platos').insert({ nombre: 'Test' })

      expect(result.data).toEqual({ id: 99 })
      expect(result.error).toBeNull()
    })

    it('returns error on insert failure', async () => {
      const mockError = { message: 'Permission denied', code: '42501' }
      const client = createMockSupabaseClient({
        insert: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      })

      const result = await client.from('platos').insert({ nombre: 'Test' })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('update()', () => {
    it('returns updated row', async () => {
      const client = createMockSupabaseClient({
        update: vi.fn().mockResolvedValue({ data: { id: 1, nombre: 'Updated' }, error: null }),
      })

      const result = await client.from('platos').update({ nombre: 'Updated' }).eq('id', 1)

      expect(result.data).toEqual({ id: 1, nombre: 'Updated' })
    })
  })

  describe('delete()', () => {
    it('returns deleted data', async () => {
      const client = createMockSupabaseClient({
        delete: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      })

      const result = await client.from('platos').delete().eq('id', 1)

      expect(result.data).toEqual({ id: 1 })
    })
  })

  describe('auth mock', () => {
    it('signInWithPassword resolves with session', async () => {
      const client = createMockSupabaseClient({
        authSignIn: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'user-1', email: 'test@test-restaurant.com' },
            session: { access_token: 'token-abc' },
          },
          error: null,
        }),
      })

      const result = await client.auth.signInWithPassword({
        email: 'test@test-restaurant.com',
        password: 'pass',
      })

      expect(result.data.user.email).toBe('test@test-restaurant.com')
      expect(result.error).toBeNull()
    })

    it('signInWithPassword resolves with error on bad credentials', async () => {
      const client = createMockSupabaseClient({
        authSignIn: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials' },
        }),
      })

      const result = await client.auth.signInWithPassword({
        email: 'wrong@test-restaurant.com',
        password: 'wrong',
      })

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('signOut resolves successfully', async () => {
      const client = createMockSupabaseClient({
        authSignOut: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await client.auth.signOut()

      expect(result.error).toBeNull()
    })

    it('getUser returns configured user', async () => {
      const client = createMockSupabaseClient({
        authGetUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test-restaurant.com' } },
          error: null,
        }),
      })

      const result = await client.auth.getUser()

      expect(result.data.user.email).toBe('test@test-restaurant.com')
    })

    it('getUser returns null for unauthenticated', async () => {
      const client = createMockSupabaseClient({
        authGetUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      })

      const result = await client.auth.getUser()

      expect(result.data.user).toBeNull()
    })

    it('onAuthStateChange returns unsubscribe callback', () => {
      const client = createMockSupabaseClient({
        authOnAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      })

      const { data } = client.auth.onAuthStateChange(() => {})

      expect(data.subscription.unsubscribe).toBeInstanceOf(Function)
    })
  })

  describe('factory overrides', () => {
    it('uses default values when no overrides provided', async () => {
      const client = createMockSupabaseClient()

      const selectResult = await client.from('platos').select()
      expect(selectResult.data).toEqual([])
      expect(selectResult.error).toBeNull()

      const authResult = await client.auth.getUser()
      expect(authResult.data.user).toBeNull()
    })
  })
})
