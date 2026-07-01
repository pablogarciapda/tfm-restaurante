/**
 * TDD: RED → GREEN → TRIANGULATE — Usuarios Nitro Handlers (USR-001 to USR-005)
 *
 * Tests pure handler functions directly — no Nitro auto-imports needed.
 * These functions receive a mock Supabase client (acting as serverSupabaseServiceRole)
 * and raw request body, then return { status, body }.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Type for mock Supabase admin client ──
interface MockAdminClient {
  createUser: ReturnType<typeof vi.fn>
  generateLink: ReturnType<typeof vi.fn>
  listUsers: ReturnType<typeof vi.fn>
}

interface MockProfileClient {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
}

interface MockSupabase {
  auth: { admin: MockAdminClient }
  from: (table: string) => MockProfileClient
}

type HandlerResult = { status: number; body: Record<string, unknown> }

// ── Import will fail (RED) until handlers.ts exists ──
let handlersModule: {
  handleCreateUser: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
  handleListUsers: (supabase: MockSupabase) => Promise<HandlerResult>
  handleUpdateUser: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
  handleDeactivateUser: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
  handleResetPassword: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
}

// ── Helpers ──
function createMockAdmin(overrides?: Partial<MockAdminClient>): MockSupabase {
  const admin: MockAdminClient = {
    createUser: overrides?.createUser ?? vi.fn(),
    generateLink: overrides?.generateLink ?? vi.fn(),
    listUsers: overrides?.listUsers ?? vi.fn(),
  }

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null }),
  })

  return { auth: { admin }, from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── 4.3 (task 4.3) USR-002 — Create User ───────────────────────────
describe('handleCreateUser (USR-002)', () => {
  it('returns 400 when email is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateUser(createMockAdmin(), {
      password: 'pass1234',
      role: 'editor',
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('Email')
  })

  it('returns 400 when email format is invalid', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateUser(createMockAdmin(), {
      email: 'not-an-email',
      password: 'pass1234',
      role: 'editor',
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('Email')
  })

  it('returns 400 when password is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateUser(createMockAdmin(), {
      email: 'cook@test.com',
      role: 'editor',
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('contraseña')
  })

  it('returns 400 when password is less than 6 characters (RED: will exist after impl)', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateUser(createMockAdmin(), {
      email: 'cook@test.com',
      password: '12345',
      role: 'editor',
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('caracteres')
  })

  it('calls auth.admin.createUser with correct params and returns success', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'cook@test.com' } },
      error: null,
    })

    const handler = await getHandler()
    const result = await handler.handleCreateUser(
      createMockAdmin({ createUser }),
      {
        email: 'cook@test.com',
        password: 'pass1234',
        role: 'editor',
      },
    )

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.user).toBeDefined()
    expect(result.body.user.email).toBe('cook@test.com')
    expect(createUser).toHaveBeenCalledWith({
      email: 'cook@test.com',
      password: 'pass1234',
      email_confirm: true,
    })
  })

  it('returns 409 when Supabase returns a duplicate key error', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    })

    const handler = await getHandler()
    const result = await handler.handleCreateUser(
      createMockAdmin({ createUser }),
      {
        email: 'exists@test.com',
        password: 'pass1234',
        role: 'editor',
      },
    )

    expect(result.status).toBe(409)
    expect(result.body.error).toContain('Ya existe')
  })

  it('returns 500 on unexpected error from Supabase', async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const handler = await getHandler()
    const result = await handler.handleCreateUser(
      createMockAdmin({ createUser }),
      {
        email: 'user@test.com',
        password: 'pass1234',
        role: 'editor',
      },
    )

    expect(result.status).toBe(500)
  })

  it('updates profile with specified role when user creation succeeds (TRIANGULATE)', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin2@test.com' } },
      error: null,
    })
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    const supabase = createMockAdmin({ createUser })
    supabase.from = vi.fn().mockReturnValue({ update: updateFn })

    const handler = await getHandler()
    const result = await handler.handleCreateUser(supabase, {
      email: 'admin2@test.com',
      password: 'pass1234',
      role: 'admin',
    })

    expect(result.status).toBe(201)
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
    )
  })
})

// ─── 4.4 (task 4.4) USR-001, USR-006 — List Users ──────────────────
describe('handleListUsers (USR-001, USR-006)', () => {
  it('returns user list combining auth.users email + profiles data', async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'admin@test.com', created_at: '2026-01-01' },
          { id: 'u2', email: 'editor@test.com', created_at: '2026-02-01' },
        ],
      },
      error: null,
    })

    // Mock profiles query return
    const selectChain = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValueOnce({
            data: {
              role: 'admin',
              permissions: { carta: true },
              activo: true,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              role: 'editor',
              permissions: { carta: true },
              activo: false,
            },
            error: null,
          }),
      }),
    })

    const supabase = createMockAdmin({ listUsers })
    supabase.auth.admin = { ...supabase.auth.admin, listUsers }
    supabase.from = vi.fn().mockReturnValue({ select: selectChain })

    const handler = await getHandler()
    const result = await handler.handleListUsers(supabase)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body)).toBe(true)
    expect(result.body).toHaveLength(2)
    expect(result.body[0].email).toBe('admin@test.com')
    expect(result.body[0].role).toBe('admin')
    expect(result.body[1].activo).toBe(false)
  })

  it('returns empty array when no users exist', async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    })

    const handler = await getHandler()
    const result = await handler.handleListUsers(
      createMockAdmin({ listUsers }),
    )

    expect(result.status).toBe(200)
    expect(result.body).toEqual([])
  })

  it('returns 500 on listUsers failure', async () => {
    const listUsers = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Auth error' } })

    const handler = await getHandler()
    const result = await handler.handleListUsers(
      createMockAdmin({ listUsers }),
    )

    expect(result.status).toBe(500)
  })

  it('handles users with missing profiles gracefully (TRIANGULATE)', async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [{ id: 'u1', email: 'orphan@test.com', created_at: '2026-01-01' }],
      },
      error: null,
    })

    const selectChain = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    })

    const supabase = createMockAdmin({ listUsers })
    supabase.from = vi.fn().mockReturnValue({ select: selectChain })

    const handler = await getHandler()
    const result = await handler.handleListUsers(supabase)

    expect(result.status).toBe(200)
    expect(result.body).toHaveLength(1)
    expect(result.body[0].email).toBe('orphan@test.com')
    expect(result.body[0].role).toBe('editor') // default fallback
  })
})

// ─── 4.5 (task 4.5) USR-003 — Update User Role + Permissions ───────
describe('handleUpdateUser (USR-003)', () => {
  it('returns 400 when id is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleUpdateUser(createMockAdmin(), {
      role: 'editor',
      permissions: { carta: true },
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('ID')
  })

  it('returns 400 when role is invalid', async () => {
    const handler = await getHandler()
    const result = await handler.handleUpdateUser(createMockAdmin(), {
      id: 'user-1',
      role: 'superadmin',
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('Rol')
  })

  it('updates profile role and permissions successfully', async () => {
    const updateChain = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const supabase = createMockAdmin()
    supabase.from = vi.fn().mockReturnValue({ update: updateChain })

    const handler = await getHandler()
    const result = await handler.handleUpdateUser(supabase, {
      id: 'user-1',
      role: 'editor',
      permissions: { carta: true, menu_diario: false },
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(updateChain).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'editor',
        permissions: { carta: true, menu_diario: false },
      }),
    )
  })

  it('returns 500 on update failure (TRIANGULATE)', async () => {
    const updateChain = vi.fn().mockReturnValue({
      eq: vi
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
    })
    const supabase = createMockAdmin()
    supabase.from = vi.fn().mockReturnValue({ update: updateChain })

    const handler = await getHandler()
    const result = await handler.handleUpdateUser(supabase, {
      id: 'user-1',
      role: 'editor',
    })

    expect(result.status).toBe(500)
  })
})

// ─── 4.6 (task 4.6) USR-004 — Deactivate User ──────────────────────
describe('handleDeactivateUser (USR-004)', () => {
  it('returns 400 when id is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleDeactivateUser(createMockAdmin(), {})
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('ID')
  })

  it('sets activo=false on the user profile', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateChain = vi.fn().mockReturnValue({ eq: eqFn })
    const supabase = createMockAdmin()
    supabase.from = vi.fn().mockReturnValue({ update: updateChain })

    const handler = await getHandler()
    const result = await handler.handleDeactivateUser(supabase, {
      id: 'user-1',
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(updateChain).toHaveBeenCalledWith({ activo: false })
    expect(eqFn).toHaveBeenCalledWith('id', 'user-1')
  })

  it('returns 500 on deactivation failure (TRIANGULATE)', async () => {
    const eqFn = vi
      .fn()
      .mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      })
    const updateChain = vi.fn().mockReturnValue({ eq: eqFn })
    const supabase = createMockAdmin()
    supabase.from = vi.fn().mockReturnValue({ update: updateChain })

    const handler = await getHandler()
    const result = await handler.handleDeactivateUser(supabase, {
      id: 'user-1',
    })

    expect(result.status).toBe(500)
  })
})

// ─── 4.7 (task 4.7) USR-005 — Reset Password ───────────────────────
describe('handleResetPassword (USR-005)', () => {
  it('returns 400 when email is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleResetPassword(createMockAdmin(), {})
    expect(result.status).toBe(400)
    expect(result.body.error).toContain('Email')
  })

  it('calls auth.admin.generateLink with type recovery and returns link', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        properties: { action_link: 'https://app.supabase.com/reset?token=abc' },
      },
      error: null,
    })

    const handler = await getHandler()
    const result = await handler.handleResetPassword(
      createMockAdmin({ generateLink }),
      { email: 'user@test.com' },
    )

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.link).toBe(
      'https://app.supabase.com/reset?token=abc',
    )
    expect(generateLink).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'user@test.com',
    })
  })

  it('returns 500 on generateLink failure (TRIANGULATE)', async () => {
    const generateLink = vi
      .fn()
      .mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      })

    const handler = await getHandler()
    const result = await handler.handleResetPassword(
      createMockAdmin({ generateLink }),
      { email: 'noexist@test.com' },
    )

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('enlace')
  })

  it('returns 403 when generateLink has no action_link in response (TRIANGULATE)', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: {} },
      error: null,
    })

    const handler = await getHandler()
    const result = await handler.handleResetPassword(
      createMockAdmin({ generateLink }),
      { email: 'user@test.com' },
    )

    expect(result.status).toBe(500)
  })
})

// ── Dynamic import for RED phase ──
// This will fail with "Cannot find module" BEFORE handlers.ts is created (RED).
// After GREEN, it returns the actual module.
async function getHandler() {
  if (handlersModule) return handlersModule
  const mod = (await import(
    '../../../../../server/api/cocina/usuarios/handlers'
  )) as typeof handlersModule
  handlersModule = mod
  return mod
}
