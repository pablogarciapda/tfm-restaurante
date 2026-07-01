/**
 * Usuarios Admin API — Pure Handler Functions (USR-001 to USR-005)
 *
 * All handlers receive a pre-configured Supabase client (service_role)
 * and raw request body. They return { status, body }.
 *
 * Nitro endpoint wrappers (create.post.ts, list.get.ts, etc.)
 * wire these to `serverSupabaseServiceRole(event)` and `readBody(event)`.
 *
 * AD-10: service_role key NEVER exposed to client; these only run server-side.
 */

// ── Types ──

interface AuthUser {
  id: string
  email: string
  created_at: string
}

interface Profile {
  id: string
  role: string
  permissions: Record<string, boolean>
  activo: boolean
}

interface UserListItem {
  id: string
  email: string
  role: string
  permissions: Record<string, boolean>
  activo: boolean
  created_at: string
}

interface SupabaseAdminClient {
  auth: {
    admin: {
      createUser: (params: {
        email: string
        password: string
        email_confirm: boolean
      }) => Promise<{
        data: { user: { id: string; email: string } | null } | null
        error: { message: string } | null
      }>
      generateLink: (params: {
        type: string
        email: string
      }) => Promise<{
        data: {
          properties: { action_link?: string }
        } | null
        error: { message: string } | null
      }>
      listUsers: () => Promise<{
        data: { users: AuthUser[] } | null
        error: { message: string } | null
      }>
    }
  }
  from: (table: string) => {
    select: (...args: unknown[]) => QueryChain
    update: (data: Record<string, unknown>) => QueryChain
    insert: (data: Record<string, unknown> | Record<string, unknown>[]) => QueryChain
  }
}

interface QueryChain {
  eq: (column: string, value: unknown) => QueryChain
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
  order: (column: string, opts?: { ascending: boolean }) => QueryChain
  then: (
    resolve: (value: { data: unknown; error: { message: string } | null }) => void,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

type HandlerResult = { status: number; body: Record<string, unknown> }

// ── Helpers ──

const VALID_ROLES = ['admin', 'editor']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

function isDuplicateError(error: { message: string }): boolean {
  return /duplicate|already exists/i.test(error.message)
}

// ─── USR-002: Create User ──────────────────────────────────────────
export async function handleCreateUser(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email, password, role } = body

  // Validate email
  if (!email || typeof email !== 'string') {
    return {
      status: 400,
      body: { error: 'Email es requerido' },
    }
  }
  if (!EMAIL_REGEX.test(email)) {
    return {
      status: 400,
      body: { error: 'Email no tiene formato válido' },
    }
  }

  // Validate password
  if (!password || typeof password !== 'string') {
    return {
      status: 400,
      body: { error: 'La contraseña es requerida' },
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 400,
      body: { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
    }
  }

  // Validate role
  const userRole = typeof role === 'string' && VALID_ROLES.includes(role) ? role : 'editor'

  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    if (isDuplicateError(error)) {
      return {
        status: 409,
        body: { error: 'Ya existe un usuario con ese email' },
      }
    }
    return {
      status: 500,
      body: { error: `Error al crear usuario: ${error.message}` },
    }
  }

  const createdUser = data?.user
  if (!createdUser) {
    return {
      status: 500,
      body: { error: 'Error al crear usuario: no se recibió confirmación' },
    }
  }

  // Update profile with specified role (trigger created default 'editor')
  if (userRole !== 'editor') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: userRole })
      .eq('id', createdUser.id)

    if (profileError) {
      return {
        status: 500,
        body: { error: `Usuario creado pero error al asignar rol: ${profileError.message}` },
      }
    }
  }

  return {
    status: 201,
    body: {
      success: true,
      user: { id: createdUser.id, email: createdUser.email },
    },
  }
}

// ─── USR-001, USR-006: List Users ──────────────────────────────────
export async function handleListUsers(
  supabase: SupabaseAdminClient,
): Promise<HandlerResult> {
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    return {
      status: 500,
      body: { error: `Error al listar usuarios: ${error.message}` },
    }
  }

  const users = data?.users ?? []

  // Resolve profiles for each user
  const enrichedUsers: UserListItem[] = await Promise.all(
    users.map(async (authUser): Promise<UserListItem> => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, permissions, activo')
        .eq('id', authUser.id)
        .single()

      return {
        id: authUser.id,
        email: authUser.email,
        role: (profile as Profile)?.role ?? 'editor',
        permissions: (profile as Profile)?.permissions ?? {
          carta: true,
          menu_diario: true,
          eventos: true,
          reservas: false,
          configuracion: false,
          usuarios: false,
        },
        activo: (profile as Profile)?.activo ?? true,
        created_at: authUser.created_at,
      }
    }),
  )

  return {
    status: 200,
    body: enrichedUsers as unknown as Record<string, unknown>,
  }
}

// ─── USR-003: Update User Role + Permissions ───────────────────────
export async function handleUpdateUser(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { id, role, permissions } = body

  if (!id || typeof id !== 'string') {
    return {
      status: 400,
      body: { error: 'ID de usuario es requerido' },
    }
  }

  if (role && (typeof role !== 'string' || !VALID_ROLES.includes(role))) {
    return {
      status: 400,
      body: { error: 'Rol no válido. Debe ser admin o editor' },
    }
  }

  const updateData: Record<string, unknown> = {}
  if (role) updateData.role = role
  if (permissions && typeof permissions === 'object') {
    updateData.permissions = permissions
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return {
      status: 500,
      body: { error: `Error al actualizar usuario: ${error.message}` },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}

// ─── USR-004: Deactivate User ──────────────────────────────────────
export async function handleDeactivateUser(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { id } = body

  if (!id || typeof id !== 'string') {
    return {
      status: 400,
      body: { error: 'ID de usuario es requerido' },
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ activo: false })
    .eq('id', id)

  if (error) {
    return {
      status: 500,
      body: { error: `Error al desactivar usuario: ${error.message}` },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}

// ─── USR-005: Reset Password ───────────────────────────────────────
export async function handleResetPassword(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { email } = body

  if (!email || typeof email !== 'string') {
    return {
      status: 400,
      body: { error: 'Email es requerido' },
    }
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) {
    return {
      status: 500,
      body: { error: `Error al generar enlace de restablecimiento: ${error.message}` },
    }
  }

  const link = data?.properties?.action_link
  if (!link) {
    return {
      status: 500,
      body: { error: 'No se pudo generar el enlace de restablecimiento' },
    }
  }

  return {
    status: 200,
    body: { success: true, link },
  }
}
