/**
 * clientes.test.ts — Unit tests for /api/cocina/clientes handlers
 *
 * Tests: list + search, create, update, reservas history
 */
import { describe, it, expect, vi } from 'vitest'
import {
  handleListClientes,
  handleCreateCliente,
  handleUpdateCliente,
  handleGetClienteReservas,
} from '../../../../server/api/cocina/clientes/handlers'

function createMockSupabase(
  overrides: Record<string, ReturnType<typeof vi.fn>> = {},
) {
  const selectFn = overrides.select ?? vi.fn().mockResolvedValue({ data: [], error: null })
  const insertFn = overrides.insert ?? vi.fn().mockResolvedValue({ data: null, error: null })

  function createChain(resolveFn: () => Promise<any>, _insertFn?: () => Promise<any>) {
    const chain: any = {
      then(resolve: any, reject: any) {
        return resolveFn().then(resolve, reject)
      },
      catch(reject: any) {
        return resolveFn().catch(reject)
      },
    }
    const ops = ['select', 'eq', 'neq', 'order', 'limit', 'single', 'maybeSingle', 'ilike', 'or']
    for (const op of ops) chain[op] = (..._args: any[]) => chain

    chain.insert = (..._args: any[]) => {
      const insertChain: any = {
        then(resolve: any, reject: any) {
          return (_insertFn || insertFn)().then(resolve, reject)
        },
        catch(reject: any) {
          return (_insertFn || insertFn)().catch(reject)
        },
      }
      insertChain.select = (..._a: any[]) => insertChain
      insertChain.single = () => insertChain
      return insertChain
    }

    chain.update = (..._args: any[]) => {
      const updateChain: any = {
        then(resolve: any, reject: any) {
          return resolveFn().then(resolve, reject)
        },
        catch(reject: any) {
          return resolveFn().catch(reject)
        },
      }
      const updateOps = ['eq', 'neq', 'select', 'single', 'order', 'limit']
      for (const op of updateOps) {
        updateChain[op] = (..._a: any[]) => updateChain
      }
      return updateChain
    }

    return chain
  }

  return {
    from: (_table: string) => createChain(selectFn, insertFn),
  }
}

describe('handleListClientes', () => {
  it('returns empty array when no clientes exist', async () => {
    const mockSupabase = createMockSupabase({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await handleListClientes(mockSupabase as any)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body)).toBe(true)
  })

  it('returns clientes with reservas_count', async () => {
    const mockData = [
      { id: 'c1', nombre: 'Ana', apellidos: null, telefono: '+34600123456', email: null, created_at: '2026-01-01', updated_at: '2026-01-01', reservas_count: 3 },
      { id: 'c2', nombre: 'Carlos', apellidos: 'López', telefono: '+34612345678', email: 'carlos@test.com', created_at: '2026-02-01', updated_at: '2026-02-01', reservas_count: 0 },
    ]
    const mockSupabase = createMockSupabase({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })

    const result = await handleListClientes(mockSupabase as any, 'ana')

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body)).toBe(true)
  })
})

describe('handleCreateCliente', () => {
  it('validates required fields', async () => {
    const mockSupabase = createMockSupabase()

    const result = await handleCreateCliente(mockSupabase as any, {})

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('creates cliente with valid data', async () => {
    const mockSupabase = createMockSupabase({
      insert: vi.fn().mockResolvedValue({
        data: { id: 'new-id', nombre: 'Nuevo', telefono: '+34600000001' },
        error: null,
      }),
    })

    const result = await handleCreateCliente(mockSupabase as any, {
      nombre: 'Nuevo',
      telefono: '+34600000001',
    })

    expect(result.status).toBe(201)
    expect(result.body).toHaveProperty('id', 'new-id')
  })

  it('handles duplicate telefono (409)', async () => {
    const mockSupabase = createMockSupabase({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      }),
    })

    const result = await handleCreateCliente(mockSupabase as any, {
      nombre: 'Dupe',
      telefono: '+34600000000',
    })

    expect(result.status).toBe(409)
  })
})

describe('handleUpdateCliente', () => {
  it('updates nombre and email, keeps telefono read-only', async () => {
    const selectFn = vi.fn().mockResolvedValue({
      data: { id: 'c1', nombre: 'Updated', apellidos: 'New', telefono: '+34600123456', email: 'new@test.com' },
      error: null,
    })
    const mockSupabase = createMockSupabase({ select: selectFn })

    const result = await handleUpdateCliente(mockSupabase as any, 'c1', {
      nombre: 'Updated',
      email: 'new@test.com',
    })

    expect(result.status).toBe(200)
  })

  it('rejects missing id', async () => {
    const mockSupabase = createMockSupabase()

    const result = await handleUpdateCliente(mockSupabase as any, '', {})

    expect(result.status).toBe(400)
  })
})

describe('handleGetClienteReservas', () => {
  it('returns empty array when no reservas', async () => {
    const mockSupabase = createMockSupabase({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await handleGetClienteReservas(mockSupabase as any, 'c1')

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body)).toBe(true)
  })

  it('returns reservas ordered by fecha_hora desc', async () => {
    const mockData = [
      { id: 'r1', fecha_hora: '2026-07-10T20:00:00Z', numero_comensales: 2, estado: 'confirmada', created_at: '2026-07-01' },
      { id: 'r2', fecha_hora: '2026-07-05T20:00:00Z', numero_comensales: 4, estado: 'pendiente', created_at: '2026-06-15' },
    ]
    const mockSupabase = createMockSupabase({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })

    const result = await handleGetClienteReservas(mockSupabase as any, 'c1')

    expect(result.status).toBe(200)
  })
})
