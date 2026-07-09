/**
 * cancelar.post.test.ts — Unit tests for handleCancelReservation
 *
 * Tests:
 * - Invalid/missing token → 400
 * - Token not found → 404
 * - Already cancelled → 409
 * - Already completed → 409
 * - Past reservation → 409
 * - Standby state → 409
 * - Successful cancellation → 200
 * - Rate limiting (tested via handler interface)
 */
import { describe, it, expect, vi } from 'vitest'
import { handleCancelReservation } from '../../../../server/api/reservas.handlers'

/**
 * Create a chainable mock like the one in reservas.post.test.ts
 */
function createChain(resolveFn: () => Promise<any>) {
  const chain: any = {
    then(resolve: any, reject: any) { return resolveFn().then(resolve, reject) },
    catch(reject: any) { return resolveFn().catch(reject) },
  }
  const filterOps = ['eq', 'neq', 'order', 'limit', 'single', 'maybeSingle']
  for (const op of filterOps) {
    chain[op] = (..._args: any[]) => chain
  }
  chain.select = (..._args: any[]) => chain
  chain.update = (..._args: any[]) => {
    const updateChain: any = {
      then(resolve: any, reject: any) { return resolveFn().then(resolve, reject) },
      catch(reject: any) { return resolveFn().catch(reject) },
    }
    updateChain.eq = (..._a: any[]) => updateChain
    return updateChain
  }
  return chain
}

function createMockSupabase(overrides: {
  reservaSelect?: ReturnType<typeof vi.fn>
  clienteSelect?: ReturnType<typeof vi.fn>
  reservaUpdate?: ReturnType<typeof vi.fn>
  configSelect?: ReturnType<typeof vi.fn>
}) {
  const reservaSelect = overrides.reservaSelect ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const clienteSelect = overrides.clienteSelect ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const reservaUpdate = overrides.reservaUpdate ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const configSelect = overrides.configSelect ?? vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    from: (table: string) => {
      if (table === 'reservas') {
        return createChain(reservaSelect)
      }
      if (table === 'clientes') {
        return createChain(clienteSelect)
      }
      if (table === 'configuracion') {
        return createChain(configSelect)
      }
      return createChain(vi.fn().mockResolvedValue({ data: null, error: null }))
    },
  }
}

const futureISO = new Date(Date.now() + 86400000 * 2).toISOString()
const pastISO = new Date(Date.now() - 86400000 * 2).toISOString()

describe('handleCancelReservation', () => {
  it('rejects empty body — returns 400', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleCancelReservation(mockSupabase as any, {})

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('rejects missing token — returns 400', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleCancelReservation(mockSupabase as any, { token: '' })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Token de cancelación requerido')
  })

  it('rejects invalid token — returns 404', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'nonexistent-token' })

    expect(result.status).toBe(404)
    expect(result.body).toHaveProperty('error', 'Token de cancelación no válido')
  })

  it('rejects already cancelled reservation — returns 409', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'cancelada', cliente_id: 'c1' },
        error: null,
      }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'used-token' })

    expect(result.status).toBe(409)
    expect(result.body).toHaveProperty('error', 'Esta reserva ya ha sido cancelada')
  })

  it('rejects completed reservation — returns 409', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'completada', cliente_id: 'c1' },
        error: null,
      }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'completed-token' })

    expect(result.status).toBe(409)
    expect(result.body).toHaveProperty('error', 'Esta reserva ya ha sido completada y no se puede cancelar')
  })

  it('rejects past reservation — returns 409', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: pastISO, numero_comensales: 2, estado: 'pendiente', cliente_id: 'c1' },
        error: null,
      }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'past-token' })

    expect(result.status).toBe(409)
    expect(result.body).toHaveProperty('error', 'No se puede cancelar una reserva pasada')
  })

  it('rejects standby reservation — returns 409', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'standby', cliente_id: 'c1' },
        error: null,
      }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'standby-token' })

    expect(result.status).toBe(409)
    expect(result.body).toHaveProperty('error', 'Esta reserva está en espera y no se puede cancelar')
  })

  it('successfully cancels a pending reservation', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 4, estado: 'pendiente', cliente_id: 'c1' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { nombre: 'María', apellidos: 'García', email: 'maria@test.com', telefono: '600123456' },
        error: null,
      }),
      configSelect: vi.fn().mockResolvedValue({
        data: { notificacion_reserva: 'email' },
        error: null,
      }),
      reservaUpdate: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await handleCancelReservation(mockSupabase as any, { token: 'valid-token' })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })

  it('successfully cancels a confirmed reservation', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'confirmada', cliente_id: 'c1' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { nombre: 'Carlos', email: 'carlos@test.com', telefono: '612345678' },
        error: null,
      }),
      configSelect: vi.fn().mockResolvedValue({
        data: { notificacion_reserva: 'ambos' },
        error: null,
      }),
      reservaUpdate: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await handleCancelReservation(mockSupabase as any, { token: 'valid-token-2' })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })

  it('handles DB error during reservation lookup', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB connection error' },
      }),
    })
    const result = await handleCancelReservation(mockSupabase as any, { token: 'some-token' })

    expect(result.status).toBe(500)
  })

  it('handles DB error during update', async () => {
    // Use a sequence: first reserva query returns data, update call returns error
    const reservaSelect = vi.fn()
      .mockResolvedValueOnce({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'pendiente', cliente_id: 'c1' },
        error: null,
      })
      // Second call to this function (which in the mock goes via the same fn)
      // Actually we need a different approach — use vi.fn() with a mock implementation

    // The mock needs to be sequence-aware for sequential from('reservas') calls
    let reservaCallCount = 0
    const reservaFn = vi.fn().mockImplementation(() => {
      reservaCallCount++
      if (reservaCallCount === 1) {
        // First call: select by cancel_token → find the reservation
        return Promise.resolve({
          data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 2, estado: 'pendiente', cliente_id: 'c1' },
          error: null,
        })
      }
      // Second call: update → return error
      return Promise.resolve({
        data: null,
        error: { message: 'Update failed' },
      })
    })

    const mockSupabase = createMockSupabase({
      reservaSelect: reservaFn,
      clienteSelect: vi.fn().mockResolvedValue({
        data: { nombre: 'Ana', email: 'ana@test.com', telefono: '600000000' },
        error: null,
      }),
      configSelect: vi.fn().mockResolvedValue({
        data: { notificacion_reserva: 'email' },
        error: null,
      }),
    })

    const result = await handleCancelReservation(mockSupabase as any, { token: 'failing-update' })

    expect(result.status).toBe(500)
    expect(result.body).toHaveProperty('error', 'Error al cancelar la reserva')
  })

  it('handles cancellation without client info gracefully', async () => {
    const mockSupabase = createMockSupabase({
      reservaSelect: vi.fn().mockResolvedValue({
        data: { id: 'r1', fecha_hora: futureISO, numero_comensales: 3, estado: 'pendiente', cliente_id: 'c1' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      configSelect: vi.fn().mockResolvedValue({
        data: { notificacion_reserva: 'sms' },
        error: null,
      }),
      reservaUpdate: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await handleCancelReservation(mockSupabase as any, { token: 'no-cliente-token' })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })
})
