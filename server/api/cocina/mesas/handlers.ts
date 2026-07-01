/**
 * Mesas Admin API — Pure Handler Functions (MCA-003, SCH-008/009/010)
 *
 * All handlers receive a pre-configured Supabase client (service_role)
 * and raw request body. They return { status, body }.
 *
 * Nitro endpoint wrappers (create.post.ts, list.get.ts, etc.)
 * wire these to `serverSupabaseServiceRole(event)` and `readBody(event)`.
 *
 * Pattern: follows `usuarios/handlers.ts` (AD-10).
 */

// ── Types ──

interface SupabaseAdminClient {
  from: (table: string) => {
    select: (...args: unknown[]) => QueryChain
    insert: (data: Record<string, unknown> | Record<string, unknown>[]) => InsertChain
    update: (data: Record<string, unknown>) => UpdateChain
    delete: () => DeleteChain
  }
}

interface QueryChain {
  order: (column: string) => QueryChain
  then: (
    resolve: (value: { data: unknown; error: { message: string } | null }) => void,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

interface InsertChain {
  select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> }
}

interface UpdateChain {
  eq: (column: string, value: unknown) => Promise<{ data: unknown; error: { message: string } | null }>
}

interface DeleteChain {
  eq: (column: string, value: unknown) => Promise<{ data: unknown; error: { message: string } | null }>
}

type HandlerResult = { status: number; body: Record<string, unknown> }

// ── Constants ──

const VALID_ZONAS = ['Principal', 'Zingaro', 'Privado', 'Terraza', 'Bar']

function isValidZona(zona: unknown): zona is string {
  return typeof zona === 'string' && VALID_ZONAS.includes(zona)
}

// ─── handleListMesas ─────────────────────────────────────────────────

/**
 * List all mesas ordered by numero_mesa.
 */
export async function handleListMesas(
  supabase: SupabaseAdminClient,
): Promise<HandlerResult> {
  const query = supabase.from('mesas').select('*').order('numero_mesa')

  const { data, error } = await new Promise<{
    data: unknown
    error: { message: string } | null
  }>((resolve) => query.then(resolve))

  if (error) {
    return {
      status: 500,
      body: { error: `Error al listar mesas: ${error.message}` },
    }
  }

  return {
    status: 200,
    body: (Array.isArray(data) ? data : []) as unknown as Record<string, unknown>,
  }
}

// ─── handleCreateMesa ────────────────────────────────────────────────

/**
 * Create a new mesa with sensible defaults.
 * Required: numero_mesa, capacidad_base, zona.
 * Optional: posicion_x, posicion_y, ancho, alto, rotacion.
 * Defaults: position (0,0), size (100,100), rotation 0.
 * capacidad_actual = capacidad_base on creation.
 */
export async function handleCreateMesa(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { numero_mesa, capacidad_base, zona } = body

  // Validate required fields
  if (numero_mesa === undefined || numero_mesa === null) {
    return { status: 400, body: { error: 'El número de mesa es requerido' } }
  }
  if (capacidad_base === undefined || capacidad_base === null || typeof capacidad_base !== 'number') {
    return { status: 400, body: { error: 'La capacidad base es requerida' } }
  }
  if (!zona || !isValidZona(zona)) {
    return {
      status: 400,
      body: { error: 'La zona es requerida y debe ser: Principal, Zingaro, Privado, Terraza o Bar' },
    }
  }

  const insertData: Record<string, unknown> = {
    numero_mesa: numero_mesa as number,
    capacidad_base: capacidad_base as number,
    capacidad_actual: capacidad_base as number,
    zona,
    posicion_x: (body.posicion_x as number) ?? 0,
    posicion_y: (body.posicion_y as number) ?? 0,
    ancho: (body.ancho as number) ?? 100,
    alto: (body.alto as number) ?? 100,
    rotacion: (body.rotacion as number) ?? 0,
  }

  const { data, error } = await supabase
    .from('mesas')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return {
      status: 500,
      body: { error: `Error al crear mesa: ${error.message}` },
    }
  }

  return {
    status: 201,
    body: { success: true, mesa: data as unknown as Record<string, unknown> },
  }
}

// ─── handleUpdateMesa ────────────────────────────────────────────────

/**
 * Update an existing mesa (partial update).
 * Allowed fields: posicion_x, posicion_y, ancho, alto, rotacion,
 * capacidad_actual, zona, numero_mesa, capacidad_base.
 */
export async function handleUpdateMesa(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { id } = body

  if (!id || typeof id !== 'string') {
    return { status: 400, body: { error: 'ID de mesa es requerido' } }
  }

  // Validate zona if provided
  if (body.zona !== undefined && !isValidZona(body.zona)) {
    return {
      status: 400,
      body: { error: 'zona no válida. Debe ser: Principal, Zingaro, Privado, Terraza o Bar' },
    }
  }

  // Build update payload (only include fields present in body)
  const allowedFields = [
    'posicion_x', 'posicion_y', 'ancho', 'alto', 'rotacion',
    'capacidad_actual', 'zona', 'numero_mesa', 'capacidad_base',
  ]
  const updateData: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  const { error } = await supabase
    .from('mesas')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return {
      status: 500,
      body: { error: `Error al actualizar mesa: ${error.message}` },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}

// ─── handleDeleteMesa ────────────────────────────────────────────────

/**
 * Delete a mesa. If the mesa was a fusion parent (has children with
 * mesa_padre_id pointing to it), clear id_fusion and mesa_padre_id on
 * children before deleting the parent.
 *
 * AD-12: ON DELETE SET NULL already handles the FK, but we clear fusion
 * fields explicitly so children don't retain stale id_fusion values.
 */
export async function handleDeleteMesa(
  supabase: SupabaseAdminClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { id } = body

  if (!id || typeof id !== 'string') {
    return { status: 400, body: { error: 'ID de mesa es requerido' } }
  }

  // Clear fusion children: SET id_fusion = NULL, mesa_padre_id = NULL
  // where mesa_padre_id = id (this mesa was the fusion parent)
  const { error: clearError } = await supabase
    .from('mesas')
    .update({ id_fusion: null, mesa_padre_id: null })
    .eq('mesa_padre_id', id)

  if (clearError) {
    return {
      status: 500,
      body: { error: `Error al eliminar mesa: ${clearError.message}` },
    }
  }

  // Delete the mesa itself
  const { error: deleteError } = await supabase
    .from('mesas')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return {
      status: 500,
      body: { error: `Error al eliminar mesa: ${deleteError.message}` },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}
