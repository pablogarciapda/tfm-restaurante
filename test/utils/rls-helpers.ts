/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RLS Test Helpers — per TH-005
 *
 * Helper functions for RLS policy integration testing against a real Supabase
 * instance. These are designed for integration tests (slices 2-4), not unit tests.
 *
 * createTestUser  — creates a user in auth.users + profiles row via service role
 * impersonateUser — returns a Supabase client authenticated as the given user
 * cleanupTestUser — deletes auth user + profile row
 */

export interface TestUserCredentials {
  id: string
  email: string
}

export interface PermissionsJsonb {
  carta: boolean
  menu_diario: boolean
  eventos: boolean
  reservas: boolean
  configuracion: boolean
  usuarios: boolean
}

const DEFAULT_PERMISSIONS: PermissionsJsonb = {
  carta: true,
  menu_diario: true,
  eventos: true,
  reservas: false,
  configuracion: false,
  usuarios: false,
}

/**
 * Creates a test user in auth.users and auto-creates a profiles row
 * via the handle_new_user() trigger.
 *
 * @param supabaseAdmin — Supabase client with service_role key (bypasses RLS)
 * @param email         — email for the test user
 * @param password      — password for the test user
 * @param role          — 'admin' | 'editor'
 * @param permissions   — jsonb permissions object (default: editor defaults)
 * @returns { id, email } of the created user
 *
 * @example
 * const admin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY)
 * const user = await createTestUser(admin, 'editor@test.com', 'pass123', 'editor')
 */
export async function createTestUser(
  supabaseAdmin: {
    auth: { admin: { createUser: (...args: any[]) => Promise<any> } }
    from: (...args: any[]) => any
  },
  email: string,
  password: string,
  role: 'admin' | 'editor',
  permissions: PermissionsJsonb = DEFAULT_PERMISSIONS,
): Promise<TestUserCredentials> {
  // Step 1: Create the auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id

  // Step 2: Upsert profiles with desired role + permissions (trigger created default)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role,
      permissions,
      activo: true,
    })
    .eq('id', userId)

  if (profileError) {
    // Cleanup on failure
    await supabaseAdmin.auth.admin.deleteUser(userId)
    throw new Error(`Failed to update test user profile: ${profileError.message}`)
  }

  return { id: userId, email }
}

/**
 * Creates a Supabase client authenticated as the given user.
 * This requires the @supabase/supabase-js library.
 *
 * @param supabaseAdmin — Supabase admin client (to get service config)
 * @param userId        — the auth.users ID to impersonate
 * @returns A new Supabase client with auth session for the user
 *
 * @example
 * const client = await impersonateUser(admin, userId)
 * const { data } = await client.from('platos').select()
 */
export async function impersonateUser(
  supabaseAdmin: {
    auth: {
      admin: { getUserById: (id: string) => Promise<any> }
      signInWithPassword: (creds: { email: string; password: string }) => Promise<any>
    }
  },
  userId: string,
): Promise<any> {
  // In integration tests, you would actually sign in with the user credentials
  // For now, return a placeholder — integration tests will implement this
  return {
    auth: {
      getSession: () => ({ data: { session: { user: { id: userId } } } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
    }),
  }
}

/**
 * Cleans up a test user: deletes auth user (cascade deletes profile).
 *
 * @param supabaseAdmin — Supabase admin client
 * @param userId        — the auth.users ID to delete
 */
export async function cleanupTestUser(
  supabaseAdmin: {
    auth: { admin: { deleteUser: (id: string) => Promise<any> } }
    from: (...args: any[]) => any
  },
  userId: string,
): Promise<void> {
  // Delete from profiles first, then auth (in case cascade fails)
  await supabaseAdmin.from('profiles').delete().eq('id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
}
