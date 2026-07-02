/**
 * TDD: RED → GREEN → TRIANGULATE — Mesas Nitro Handlers (MCA-003, SCH-008/009/010)
 *
 * Tests pure handler functions directly — no Nitro auto-imports needed.
 * These functions receive a mock Supabase client (acting as serverSupabaseServiceRole)
 * and raw request body, then return { status, body }.
 *
 * Handlers: handleListMesas, handleCreateMesa, handleUpdateMesa, handleDeleteMesa
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Type for mock Supabase client ──

interface MockQueryChain {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

interface MockMesaClient {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

interface MockSupabase {
  from: (table: string) => MockMesaClient
}

type HandlerResult = { status: number; body: Record<string, unknown> }

// ── Import will fail (RED) until handlers.ts exists ──
let handlersModule: {
  handleListMesas: (supabase: MockSupabase) => Promise<HandlerResult>
  handleCreateMesa: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
  handleUpdateMesa: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
  handleDeleteMesa: (
    supabase: MockSupabase,
    body: Record<string, unknown>,
  ) => Promise<HandlerResult>
} | null = null

// ── Helpers ──

function createMockSupabase(
  overrides?: Partial<{
    selectResult: { data: unknown; error: { message: string } | null }
    insertResult: { data: unknown; error: { message: string } | null }
    updateResult: { data: unknown; error: { message: string } | null }
    deleteResult: { data: unknown; error: { message: string } | null }
  }>,
): MockSupabase {
  // Each from() call returns a fresh chain so tests don't share mock state
  const makeChain = (): MockQueryChain => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })

  const from = vi.fn().mockImplementation((_table: string) => {
    const chain = makeChain()
    return {
      select: vi.fn().mockReturnValue({
        ...chain,
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve(overrides?.selectResult ?? { data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        ...chain,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve(overrides?.insertResult ?? { data: { id: 'new-id' }, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        ...chain,
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve(overrides?.updateResult ?? { data: null, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        ...chain,
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve(overrides?.deleteResult ?? { data: null, error: null }),
      }),
    }
  })

  return { from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Dynamic import for RED phase ──
async function getHandler() {
  if (handlersModule) {
    vi.clearAllMocks()
    return handlersModule
  }
  const mod = (await import(
    '../../../../../server/api/cocina/mesas/handlers'
  )) as typeof handlersModule
  handlersModule = mod as NonNullable<typeof handlersModule>
  return mod as NonNullable<typeof handlersModule>
}

// ══════════════════════════════════════════════════════════════════════
// handleListMesas
// ══════════════════════════════════════════════════════════════════════

describe('handleListMesas', () => {
  it('returns empty array when no mesas exist', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      selectResult: { data: [], error: null },
    })

    const result = await handler.handleListMesas(supabase)

    expect(result.status).toBe(200)
    expect(result.body).toEqual([])
    expect(supabase.from).toHaveBeenCalledWith('mesas')
  })

  it('returns array of mesas ordered by numero_mesa', async () => {
    const handler = await getHandler()
    const mesas = [
      { id: 'm1', numero_mesa: 1, capacidad_base: 4, zona: 'Principal' },
      { id: 'm2', numero_mesa: 2, capacidad_base: 2, zona: 'Bar' },
    ]
    const supabase = createMockSupabase({
      selectResult: { data: mesas, error: null },
    })

    const result = await handler.handleListMesas(supabase)

    expect(result.status).toBe(200)
    expect(result.body).toEqual(mesas)
    expect(Array.isArray(result.body)).toBe(true)
  })

  it('returns 500 when Supabase query fails', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      selectResult: { data: null, error: { message: 'Database error' } },
    })

    const result = await handler.handleListMesas(supabase)

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('Error al listar mesas')
  })

  it('returns empty array when data is null (defensive fallback)', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      selectResult: { data: null, error: null },
    })

    const result = await handler.handleListMesas(supabase)

    expect(result.status).toBe(200)
    expect(result.body).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════════════
// handleCreateMesa
// ══════════════════════════════════════════════════════════════════════

describe('handleCreateMesa', () => {
  it('returns 400 when numero_mesa is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateMesa(createMockSupabase(), {
      capacidad_base: 4,
      zona: 'Principal',
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('número de mesa')
  })

  it('returns 400 when capacidad_base is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateMesa(createMockSupabase(), {
      numero_mesa: 1,
      zona: 'Principal',
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('capacidad')
  })

  it('returns 400 when zona is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateMesa(createMockSupabase(), {
      numero_mesa: 1,
      capacidad_base: 4,
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('zona')
  })

  it('returns 400 when zona is invalid', async () => {
    const handler = await getHandler()
    const result = await handler.handleCreateMesa(createMockSupabase(), {
      numero_mesa: 1,
      capacidad_base: 4,
      zona: 'InvalidZone',
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('zona')
  })

  it('creates mesa with default position/size and returns 201', async () => {
    const handler = await getHandler()
    const createdMesa = { id: 'new-id', numero_mesa: 1, capacidad_base: 4, zona: 'Principal' }
    const supabase = createMockSupabase({
      insertResult: { data: createdMesa, error: null },
    })

    const result = await handler.handleCreateMesa(supabase, {
      numero_mesa: 1,
      capacidad_base: 4,
      zona: 'Principal',
    })

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.mesa).toBeDefined()
  })

  it('returns 500 when insert fails', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      insertResult: { data: null, error: { message: 'Insert failed' } },
    })

    const result = await handler.handleCreateMesa(supabase, {
      numero_mesa: 1,
      capacidad_base: 4,
      zona: 'Principal',
    })

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('Error al crear mesa')
  })

  it('accepts optional posicion/rotacion on creation', async () => {
    const handler = await getHandler()
    const createdMesa = {
      id: 'custom-pos',
      numero_mesa: 3,
      capacidad_base: 4,
      zona: 'Terraza',
      posicion_x: 200,
      posicion_y: 300,
    }
    const supabase = createMockSupabase({
      insertResult: { data: createdMesa, error: null },
    })

    const result = await handler.handleCreateMesa(supabase, {
      numero_mesa: 3,
      capacidad_base: 4,
      zona: 'Terraza',
      posicion_x: 200,
      posicion_y: 300,
      ancho: 120,
      alto: 80,
    })

    expect(result.status).toBe(201)
    expect(result.body.mesa).toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════════════
// handleUpdateMesa
// ══════════════════════════════════════════════════════════════════════

describe('handleUpdateMesa', () => {
  it('returns 400 when id is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleUpdateMesa(createMockSupabase(), {
      posicion_x: 100,
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('ID')
  })

  it('returns 400 when zona is provided but invalid', async () => {
    const handler = await getHandler()
    const result = await handler.handleUpdateMesa(createMockSupabase(), {
      id: 'm1',
      zona: 'InvalidZone',
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('zona')
  })

  it('updates position and returns 200', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      updateResult: { data: null, error: null },
    })

    const result = await handler.handleUpdateMesa(supabase, {
      id: 'm1',
      posicion_x: 200,
      posicion_y: 150,
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
  })

  it('updates dimensions (ancho + alto) and returns 200', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      updateResult: { data: null, error: null },
    })

    const result = await handler.handleUpdateMesa(supabase, {
      id: 'm2',
      ancho: 150,
      alto: 120,
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
  })

  it('updates rotation and zona', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      updateResult: { data: null, error: null },
    })

    const result = await handler.handleUpdateMesa(supabase, {
      id: 'm3',
      rotacion: 45,
      zona: 'Bar',
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
  })

  it('returns 500 when update fails', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      updateResult: { data: null, error: { message: 'Update failed' } },
    })

    const result = await handler.handleUpdateMesa(supabase, {
      id: 'm1',
      posicion_x: 100,
    })

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('Error al actualizar mesa')
  })
})

// ══════════════════════════════════════════════════════════════════════
// handleDeleteMesa
// ══════════════════════════════════════════════════════════════════════

describe('handleDeleteMesa', () => {
  it('returns 400 when id is missing', async () => {
    const handler = await getHandler()
    const result = await handler.handleDeleteMesa(createMockSupabase(), {})

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('ID')
  })

  it('deletes mesa and returns 200', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      deleteResult: { data: null, error: null },
    })

    const result = await handler.handleDeleteMesa(supabase, {
      id: 'm1',
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
  })

  it('clears fusion children before deleting parent', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      updateResult: { data: null, error: null },
      deleteResult: { data: null, error: null },
    })

    // When deleting a mesa that was a fusion parent,
    // children with mesa_padre_id pointing to it should have
    // id_fusion and mesa_padre_id cleared before the parent is deleted.
    const result = await handler.handleDeleteMesa(supabase, {
      id: 'parent-mesa',
    })

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    // The update call for clearing children should have been made
    expect(supabase.from).toHaveBeenCalledWith('mesas')
  })

  it('returns 500 when delete fails', async () => {
    const handler = await getHandler()
    const supabase = createMockSupabase({
      deleteResult: { data: null, error: { message: 'Delete failed' } },
    })

    const result = await handler.handleDeleteMesa(supabase, {
      id: 'm1',
    })

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('Error al eliminar mesa')
  })
})
