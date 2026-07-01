/**
 * Supabase Mock Client Factory — per TH-004
 *
 * Returns a fully chainable mock Supabase client matching the real
 * @supabase/supabase-js fluent API: .from().select().eq().order().single().
 *
 * All methods return a chainable-thenable object; awaiting the chain
 * invokes the configured mock function for the last data operation.
 */

import { vi } from 'vitest'

export interface MockSupabaseOverrides {
  select?: ReturnType<typeof vi.fn>
  insert?: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
  delete?: ReturnType<typeof vi.fn>
  authSignIn?: ReturnType<typeof vi.fn>
  authSignOut?: ReturnType<typeof vi.fn>
  authGetUser?: ReturnType<typeof vi.fn>
  authOnAuthStateChange?: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock Supabase client for unit testing.
 *
 * The mock mimics the real chain:
 *   await client.from('platos').select().eq('id', 1).single()
 *
 * Chain methods (select, insert, update, delete, eq, order, single, etc.)
 * all return `this`, making the object infinitely chainable. Awaiting it
 * calls the mock function configured via overrides.
 */
export function createMockSupabaseClient(overrides: MockSupabaseOverrides = {}) {
  const selectFn = overrides.select ?? vi.fn().mockResolvedValue({ data: [], error: null })
  const insertFn = overrides.insert ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const updateFn = overrides.update ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteFn = overrides.delete ?? vi.fn().mockResolvedValue({ data: null, error: null })

  const authSignIn =
    overrides.authSignIn ??
    vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null })
  const authSignOut = overrides.authSignOut ?? vi.fn().mockResolvedValue({ error: null })
  const authGetUser =
    overrides.authGetUser ?? vi.fn().mockResolvedValue({ data: { user: null }, error: null })
  const authOnAuthStateChange =
    overrides.authOnAuthStateChange ??
    vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

  /**
   * Builds a thenable chainable object. All data methods return `this`.
   * When awaited, invokes the current resolve function (set by the most
   * recent data operation: select/insert/update/delete).
   */
  function createQueryBuilder() {
    let resolveFn: () => Promise<{ data: unknown; error: unknown }> = selectFn

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(resolve: any, reject: any) {
        return resolveFn().then(resolve, reject)
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch(reject: any) {
        return resolveFn().catch(reject)
      },
    }

    const dataOps = ['select', 'insert', 'update', 'delete']
    const filterOps = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single',
      'match', 'ilike', 'like', 'is', 'in', 'contains', 'range', 'textSearch',
      'not', 'or', 'filter']

    for (const op of dataOps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chain[op] = (..._args: any[]) => {
        if (op === 'select') resolveFn = selectFn
        else if (op === 'insert') resolveFn = insertFn
        else if (op === 'update') resolveFn = updateFn
        else if (op === 'delete') resolveFn = deleteFn
        return chain
      }
    }

    for (const op of filterOps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chain[op] = (..._args: any[]) => chain
    }

    return chain
  }

  const client = {
    from: (_table: string) => createQueryBuilder(),

    auth: {
      signInWithPassword: authSignIn,
      signOut: authSignOut,
      getUser: authGetUser,
      onAuthStateChange: authOnAuthStateChange,
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },

    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),

    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
  }

  return client
}
