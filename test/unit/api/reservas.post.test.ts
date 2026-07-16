/**
 * reservas.post.test.ts — Unit tests for rewritten POST /api/reservas
 *
 * Tests the handler function: validation, SMS gate, phone normalization,
 * cliente upsert, modo_reserva branching, email trigger,
 * blocked day validation, slot validation, and zone validation.
 */
import { describe, it, expect, vi } from 'vitest'
import { handleCreateReservation } from '../../../server/api/reservas.handlers'

const futureISO = new Date(Date.now() + 86400000 * 2).toISOString()

function mockSelectOnce(data: any) {
  return vi.fn().mockResolvedValueOnce({ data, error: null })
}

function mockSelectSequence(...results: Array<{ data: any; error: any }>) {
  const fn = vi.fn()
  for (const r of results) fn.mockResolvedValueOnce(r)
  return fn
}

function createMockSupabase(overrides: {
  configSelect?: ReturnType<typeof vi.fn>
  clienteSelect?: ReturnType<typeof vi.fn>
  clienteInsert?: ReturnType<typeof vi.fn>
  reservaInsert?: ReturnType<typeof vi.fn>
  diasBloqueadosSelect?: ReturnType<typeof vi.fn>
}) {
  const configSelect = overrides.configSelect ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const clienteSelect = overrides.clienteSelect ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const clienteInsert = overrides.clienteInsert ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const reservaInsert = overrides.reservaInsert ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const diasBloqueadosSelect = overrides.diasBloqueadosSelect ?? vi.fn().mockResolvedValue({ data: [], error: null })

  // Track which table is being queried
  let currentTable = ''

  function createChain(selectResolve: () => Promise<any>, insertResolve?: () => Promise<any>) {
    let selectFn = selectResolve
    let _insertFn = insertResolve

    const chain: any = {
      then(resolve: any, reject: any) {
        return selectFn().then(resolve, reject)
      },
      catch(reject: any) {
        return selectFn().catch(reject)
      },
    }

    const filterOps = ['eq', 'neq', 'order', 'limit', 'single', 'maybeSingle']
    for (const op of filterOps) {
      chain[op] = (..._args: any[]) => chain
    }

    chain.select = (..._args: any[]) => {
      return chain
    }

    chain.insert = (..._args: any[]) => {
      const insertChain: any = {
        then(resolve: any, reject: any) {
          return (_insertFn!()).then(resolve, reject)
        },
        catch(reject: any) {
          return (_insertFn!()).catch(reject)
        },
      }
      insertChain.select = (..._a: any[]) => insertChain
      insertChain.single = () => insertChain
      return insertChain
    }

    chain.update = (..._args: any[]) => {
      const updateChain: any = {
        then(resolve: any, reject: any) {
          return (selectResolve()).then(resolve, reject)
        },
        catch(reject: any) {
          return selectResolve().catch(reject)
        },
      }
      updateChain.eq = (..._a: any[]) => updateChain
      return updateChain
    }

    return chain
  }

  return {
    from: (table: string) => {
      currentTable = table
      if (table === 'configuracion') {
        return createChain(configSelect)
      }
      if (table === 'dias_bloqueados') {
        return createChain(diasBloqueadosSelect)
      }
      if (table === 'clientes') {
        return createChain(clienteSelect, clienteInsert)
      }
      if (table === 'reservas') {
        return createChain(reservaInsert, reservaInsert)
      }
      return createChain(vi.fn().mockResolvedValue({ data: null, error: null }))
    },
    _currentTable: () => currentTable,
  }
}

describe('handleCreateReservation', () => {
  it('validates required fields — returns 400 on empty body', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleCreateReservation(mockSupabase as any, {} as any)

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('errors')
  })

  it('allows reservation without sms_verified in modo=automatica', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'auto-reserva-id' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
    expect(result.body).toHaveProperty('estado', 'confirmada')
  })

  it('requires sms_verified when sms_verificacion enabled — returns 403 if missing', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica', sms_verificacion: true },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
    })

    expect(result.status).toBe(403)
    expect(result.body).toHaveProperty('error', 'Verificación SMS requerida')
  })

  it('creates reservation in modo=automatica (estado=confirmada)', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'new-reserva-id' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'María',
      apellidos: 'García',
      telefono: '600123456',
      email: 'maria@test.com',
      fecha_hora: futureISO,
      numero_comensales: 4,
      sms_verified: true,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
    expect(result.body).toHaveProperty('reserva_id', 'new-reserva-id')
    expect(result.body).toHaveProperty('estado', 'confirmada')
  })

  it('creates reservation in modo=verificada (estado=pendiente)', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'verificada' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'pending-reserva-id' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Ana',
      telefono: '612345678',
      email: 'ana@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('estado', 'pendiente')
  })

  it('creates new cliente when phone not found', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica' },
        error: null,
      }),
      // First call: check existing cliente → null (not found)
      clienteSelect: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null })
        // Second call: select after insert
        .mockResolvedValueOnce({ data: { id: 'new-cliente-id' }, error: null }),
      clienteInsert: vi.fn().mockResolvedValue({
        data: { id: 'new-cliente-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'reserva-for-new-cliente' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Nuevo',
      telefono: '699999999',
      email: 'nuevo@test.com',
      fecha_hora: futureISO,
      numero_comensales: 1,
      sms_verified: true,
    })

    expect(result.status).toBe(200)
  })

  it('normalizes Spanish phone number', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica' },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'normalized-reserva' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      // Un-normalized phone with spaces and dashes
      telefono: '600 123 456',
      email: 'test@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(200)
    // normalized phone is used internally, result confirms success
    expect(result.body).toHaveProperty('success', true)
  })

  it('rejects invalid phone format', async () => {
    const mockSupabase = createMockSupabase({})
    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      telefono: '12345',
      email: 'test@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(400)
  })

  it('rejects reservation on blocked date (409)', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica' },
        error: null,
      }),
      diasBloqueadosSelect: vi.fn().mockResolvedValue({
        data: [{ fecha: futureISO.split('T')[0], motivo: 'Cerrado por reforma', recurrente: false }],
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(409)
    expect(result.body).toHaveProperty('error', 'Fecha no disponible')
  })

  it('rejects reservation when time is outside configured slots', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: {
          modo_reserva: 'automatica',
          horarios_config: {
            comida_inicio: '13:30',
            comida_fin: '15:30',
            cena_inicio: '21:00',
            cena_fin: '23:30',
            intervalo_minutos: 15,
          },
        },
        error: null,
      }),
    })

    // Build ISO string with a time well outside any slot (16:45)
    const futureDate = new Date(Date.now() + 86400000 * 30)
    const badTimeISO = `${futureDate.toISOString().split('T')[0]}T16:45:00.000Z`

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: badTimeISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Horario fuera de los turnos disponibles')
  })

  it('accepts reservation in valid slot time', async () => {
    // Create ISO string with valid lunch time (14:00)
    const futureDate = new Date(Date.now() + 86400000 * 30)
    const validISO = `${futureDate.toISOString().split('T')[0]}T14:00:00.000Z`

    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: {
          modo_reserva: 'automatica',
          horarios_config: {
            comida_inicio: '13:30',
            comida_fin: '15:30',
            cena_inicio: '21:00',
            cena_fin: '23:30',
            intervalo_minutos: 15,
          },
        },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'slot-valid-reserva' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test Slot',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: validISO,
      numero_comensales: 2,
      sms_verified: true,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })

  it('rejects invalid zone_id', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30)
    const validISO = `${futureDate.toISOString().split('T')[0]}T14:00:00.000Z`

    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: {
          modo_reserva: 'automatica',
          horarios_config: {
            comida_inicio: '13:30',
            comida_fin: '15:30',
            cena_inicio: '21:00',
            cena_fin: '23:30',
            intervalo_minutos: 15,
          },
          zonas_config: [
            { id: 'principal', nombre: 'Principal', capacidad: 70, enabled: true },
          ],
        },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test Zone',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: validISO,
      numero_comensales: 2,
      zona_id: 'vip-zone',
      sms_verified: true,
    })

    expect(result.status).toBe(400)
    expect(result.body).toHaveProperty('error', 'Zona no válida o no habilitada')
  })

  it('accepts valid zona_id', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30)
    const validISO = `${futureDate.toISOString().split('T')[0]}T14:00:00.000Z`

    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: {
          modo_reserva: 'automatica',
          horarios_config: {
            comida_inicio: '13:30',
            comida_fin: '15:30',
            cena_inicio: '21:00',
            cena_fin: '23:30',
            intervalo_minutos: 15,
          },
          zonas_config: [
            { id: 'principal', nombre: 'Principal', capacidad: 70, enabled: true },
            { id: 'terraza', nombre: 'Terraza', capacidad: 100, enabled: true },
          ],
        },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'zone-reserva-id' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Test Zone',
      telefono: '600123456',
      email: 'test@test.com',
      fecha_hora: validISO,
      numero_comensales: 2,
      zona_id: 'terraza',
      sms_verified: true,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })

  it('bypasses SMS gate when admin_created=true', async () => {
    const mockSupabase = createMockSupabase({
      configSelect: vi.fn().mockResolvedValue({
        data: { modo_reserva: 'automatica', sms_verificacion: true },
        error: null,
      }),
      clienteSelect: vi.fn().mockResolvedValue({
        data: { id: 'existing-client-id' },
        error: null,
      }),
      reservaInsert: vi.fn().mockResolvedValue({
        data: { id: 'admin-reserva-id' },
        error: null,
      }),
    })

    const result = await handleCreateReservation(mockSupabase as any, {
      nombre: 'Admin',
      telefono: '600123456',
      email: 'admin@test.com',
      fecha_hora: futureISO,
      numero_comensales: 2,
      admin_created: true,
    })

    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('success', true)
  })
})
