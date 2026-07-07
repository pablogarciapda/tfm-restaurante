/**
 * dias-bloqueados.test.ts — Unit tests for dias-bloqueados handlers (BLO-004)
 *
 * Tests: list, create, create past-date reject, delete, delete 404, auth guard.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  handleListDiasBloqueados,
  handleCreateDiaBloqueado,
  handleDeleteDiaBloqueado,
} from '../../../server/api/dias-bloqueados/handlers'

function createMockSupabase(overrides: {
  selectResult?: { data: any; error: any }
  insertResult?: { data: any; error: any }
  deleteResult?: { error: any; count?: number }
}) {
  const selectFn = vi.fn().mockResolvedValue(overrides.selectResult ?? { data: [], error: null })
  const insertFn = vi.fn().mockResolvedValue(overrides.insertResult ?? { data: null, error: null })
  const deleteFn = vi.fn().mockResolvedValue(overrides.deleteResult ?? { error: null, count: 1 })

  function createChain(resolveFn: () => Promise<any>) {
    const chain: any = {
      then(resolve: any, reject: any) {
        return resolveFn().then(resolve, reject)
      },
      catch(reject: any) {
        return resolveFn().catch(reject)
      },
    }
    const ops = ['select', 'from', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'single']
    for (const op of ops) {
      chain[op] = (..._args: any[]) => chain
    }
    return chain
  }

  return {
    _selectFn: selectFn,
    _insertFn: insertFn,
    _deleteFn: deleteFn,
    from: (_table: string) => {
      const chain = createChain(selectFn)
      // Override insert/delete
      chain.insert = (..._args: any[]) => {
        const iChain = createChain(insertFn)
        iChain.select = (..._a: any[]) => iChain
        iChain.single = () => iChain
        return iChain
      }
      chain.delete = (..._args: any[]) => {
        const dChain = createChain(deleteFn)
        dChain.eq = (..._a: any[]) => dChain
        return dChain
      }
      return chain
    },
  }
}

describe('handleListDiasBloqueados', () => {
  it('returns blocked days ordered by fecha ASC', async () => {
    const mockSupabase = createMockSupabase({
      selectResult: {
        data: [
          { id: '1', fecha: '2026-07-04', recurrente: false, motivo: null },
          { id: '2', fecha: '2026-12-25', recurrente: true, motivo: 'Navidad' },
          { id: '3', fecha: '2027-01-01', recurrente: false, motivo: 'Año Nuevo' },
        ],
        error: null,
      },
    })

    const result = await handleListDiasBloqueados(mockSupabase as any)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body)).toBe(true)
    const body = result.body as any[]
    expect(body).toHaveLength(3)
    expect(body[0].fecha).toBe('2026-07-04')
    expect(body[2].fecha).toBe('2027-01-01')
  })

  it('returns empty array when no blocked days exist', async () => {
    const mockSupabase = createMockSupabase({
      selectResult: { data: [], error: null },
    })

    const result = await handleListDiasBloqueados(mockSupabase as any)

    expect(result.status).toBe(200)
    expect(result.body).toEqual([])
  })

  it('returns 500 on DB error', async () => {
    const mockSupabase = createMockSupabase({
      selectResult: { data: null, error: { message: 'DB error' } },
    })

    const result = await handleListDiasBloqueados(mockSupabase as any)

    expect(result.status).toBe(500)
    expect(result.body).toHaveProperty('error', 'DB error')
  })
})

describe('handleCreateDiaBloqueado', () => {
  it('creates a blocked day and returns 201', async () => {
    const created = {
      id: 'new-id',
      fecha: '2026-12-25',
      recurrente: true,
      motivo: 'Navidad',
      created_at: '2026-07-07T00:00:00Z',
    }
    const mockSupabase = createMockSupabase({
      insertResult: { data: created, error: null },
    })

    const result = await handleCreateDiaBloqueado(mockSupabase as any, {
      fecha: '2026-12-25',
      recurrente: true,
      motivo: 'Navidad',
    })

    expect(result.status).toBe(201)
    expect(result.body).toHaveProperty('id', 'new-id')
    expect(result.body).toHaveProperty('fecha', '2026-12-25')
    expect(result.body).toHaveProperty('recurrente', true)
  })

  it('rejects past date (non-recurrent)', async () => {
    const mockSupabase = createMockSupabase({})

    const result = await handleCreateDiaBloqueado(mockSupabase as any, {
      fecha: '2020-01-01',
      recurrente: false,
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'No se pueden bloquear fechas pasadas')
  })

  it('allows past date when recurrente=true (annual recurrence)', async () => {
    const created = {
      id: 'recurring-id',
      fecha: '2020-12-25',
      recurrente: true,
      motivo: 'Navidad',
      created_at: '2026-07-07T00:00:00Z',
    }
    const mockSupabase = createMockSupabase({
      insertResult: { data: created, error: null },
    })

    const result = await handleCreateDiaBloqueado(mockSupabase as any, {
      fecha: '2020-12-25',
      recurrente: true,
      motivo: 'Navidad',
    })

    expect(result.status).toBe(201)
  })

  it('rejects invalid date format', async () => {
    const mockSupabase = createMockSupabase({})

    const result = await handleCreateDiaBloqueado(mockSupabase as any, {
      fecha: 'not-a-date',
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Validation failed')
  })

  it('rejects missing fecha field', async () => {
    const mockSupabase = createMockSupabase({})

    const result = await handleCreateDiaBloqueado(mockSupabase as any, {})

    expect(result.status).toBe(400)
  })
})

describe('handleDeleteDiaBloqueado', () => {
  it('deletes by id and returns 200', async () => {
    const mockSupabase = createMockSupabase({
      deleteResult: { error: null, count: 1 },
    })

    const result = await handleDeleteDiaBloqueado(mockSupabase as any, 'existing-id')

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })

  it('returns 404 when id not found', async () => {
    const mockSupabase = createMockSupabase({
      deleteResult: { error: null, count: 0 },
    })

    const result = await handleDeleteDiaBloqueado(mockSupabase as any, 'non-existent-id')

    expect(result.status).toBe(404)
    expect(result.body).toHaveProperty('error', 'Día bloqueado no encontrado')
  })

  it('returns 400 when id is empty', async () => {
    const mockSupabase = createMockSupabase({})

    const result = await handleDeleteDiaBloqueado(mockSupabase as any, '')

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'ID es requerido')
  })

  it('returns 500 on DB error', async () => {
    const mockSupabase = createMockSupabase({
      deleteResult: { error: { message: 'DB error' }, count: undefined },
    })

    const result = await handleDeleteDiaBloqueado(mockSupabase as any, 'some-id')

    expect(result.status).toBe(500)
    expect(result.body).toHaveProperty('error', 'DB error')
  })
})
