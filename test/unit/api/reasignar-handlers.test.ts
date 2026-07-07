/**
 * reasignar-handlers.test.ts — Unit tests for admin/reasignar handlers (ADM-002)
 *
 * Tests: update zona only, update mesa with zone validation, invalid zona,
 * mesa not in zone, missing reserva_id.
 */
import { describe, it, expect, vi } from 'vitest'
import { handleReasignReserva } from '../../../server/api/admin/reasignar.handlers'

function createMockSupabase(overrides: {
  configSelect?: { data: any; error: any }
  mesaSelect?: { data: any; error: any }
  reservaUpdate?: { data: any; error: any }
}) {
  const configSelect = vi.fn().mockResolvedValue(overrides.configSelect ?? { data: null, error: null })
  const mesaSelect = vi.fn().mockResolvedValue(overrides.mesaSelect ?? { data: null, error: null })
  const reservaUpdate = vi.fn().mockResolvedValue(overrides.reservaUpdate ?? { data: null, error: null })

  function createChain(resolveFn: () => Promise<any>, _override?: { insert?: boolean; update?: boolean }) {
    const chain: any = {
      then(resolve: any, reject: any) {
        return resolveFn().then(resolve, reject)
      },
      catch(reject: any) {
        return resolveFn().catch(reject)
      },
    }
    const ops = ['select', 'from', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'single', 'maybeSingle']
    for (const op of ops) {
      chain[op] = (..._args: any[]) => chain
    }
    return chain
  }

  // Track current table to return appropriate chain
  return {
    _configSelect: configSelect,
    _mesaSelect: mesaSelect,
    _reservaUpdate: reservaUpdate,
    from: (table: string) => {
      if (table === 'configuracion') return createChain(configSelect)
      if (table === 'mesas') return createChain(mesaSelect)
      if (table === 'reservas') {
        const chain = createChain(reservaUpdate)
        // update needs special handling
        chain.update = (..._args: any[]) => {
          const uChain = createChain(reservaUpdate)
          uChain.select = (..._a: any[]) => uChain
          uChain.single = () => uChain
          uChain.eq = (..._a: any[]) => uChain
          return uChain
        }
        return chain
      }
      return createChain(vi.fn().mockResolvedValue({ data: null, error: null }))
    },
  }
}

const defaultZonas = [
  { id: 'principal', nombre: 'Principal', capacidad: 70, enabled: true },
  { id: 'terraza', nombre: 'Terraza', capacidad: 100, enabled: true },
  { id: 'bar', nombre: 'Bar', capacidad: 20, enabled: false },
]

describe('handleReasignReserva', () => {
  it('returns 400 if reserva_id is missing', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleReasignReserva(mockSupabase as any, {})

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'reserva_id es requerido')
  })

  it('returns 400 if neither nueva_zona_id nor nueva_mesa_id provided', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Se requiere nueva_zona_id o nueva_mesa_id')
  })

  it('returns 400 if zona is not found or disabled', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'vip', // not in zonas_config
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Zona no válida o no habilitada')
  })

  it('returns 400 if zona is disabled', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'bar', // disabled
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Zona no válida o no habilitada')
  })

  it('returns 400 if mesa not found', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      mesaSelect: { data: null, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_mesa_id: 'non-existent-mesa',
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Mesa no encontrada')
  })

  it('returns 400 if mesa does not belong to selected zone', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      mesaSelect: {
        data: { id: 'mesa-5', zona: 'Bar', zona_nombre: 'Bar' },
        error: null,
      },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'terraza',
      nueva_mesa_id: 'mesa-5',
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'La mesa no pertenece a la zona seleccionada')
  })

  it('updates zona successfully', async () => {
    const updated = { id: 'res-1', zona_id: 'Terraza', mesa_id: null, estado: 'confirmada' }
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      reservaUpdate: { data: updated, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'terraza',
      motivo: 'Cliente solicitó terraza',
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('zona_id', 'Terraza')
  })

  it('updates mesa with matching zone', async () => {
    const updated = { id: 'res-1', zona_id: 'Principal', mesa_id: 'mesa-3', estado: 'confirmada' }
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      mesaSelect: {
        data: { id: 'mesa-3', zona: 'Principal', zona_nombre: 'Principal' },
        error: null,
      },
      reservaUpdate: { data: updated, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'principal',
      nueva_mesa_id: 'mesa-3',
      motivo: 'Reasignación manual',
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('zona_id', 'Principal')
    expect(result.body).toHaveProperty('mesa_id', 'mesa-3')
  })

  it('matches zona by nombre as well as id', async () => {
    const updated = { id: 'res-1', zona_id: 'Terraza', mesa_id: null, estado: 'confirmada' }
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      reservaUpdate: { data: updated, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'res-1',
      nueva_zona_id: 'Terraza', // by name instead of id
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('zona_id', 'Terraza')
  })

  it('returns 404 if reserva not found after update', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: { data: { zonas_config: defaultZonas }, error: null },
      reservaUpdate: { data: null, error: null },
    })

    const result = await handleReasignReserva(mockSupabase as any, {
      reserva_id: 'non-existent',
      nueva_zona_id: 'principal',
    })

    expect(result.status).toBe(404)
    expect(result.body).toHaveProperty('error', 'Reserva no encontrada')
  })
})
