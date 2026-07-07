/**
 * Clientes Admin API — Pure Handler Functions (CLI-001–CLI-004)
 *
 * All handlers receive a pre-configured Supabase client (service_role)
 * and raw request data. They return { status, body }.
 *
 * AD-10: service_role key NEVER exposed to client.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { normalizePhone } from '#shared/utils/phone'

type SupabaseServerClient = SupabaseClient<Database>
type HandlerResult = { status: number; body: Record<string, unknown> | unknown[] }

// ─── CLI-001: List/Search Clientes ────────────────────────────────
export async function handleListClientes(
  supabase: SupabaseServerClient,
  search?: string,
): Promise<HandlerResult> {
  let query = supabase
    .from('clientes')
    .select('id, nombre, apellidos, telefono, email, created_at, updated_at', { count: 'exact' })

  if (search) {
    const term = `%${search}%`
    query = query.or(`nombre.ilike.${term},telefono.ilike.${term},email.ilike.${term}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50)

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  // Fetch reservas_count for each cliente
  const enriched = await Promise.all(
    (data || []).map(async (cliente) => {
      const { count } = await supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)

      return {
        ...cliente,
        reservas_count: count ?? 0,
      }
    }),
  )

  return { status: 200, body: enriched as unknown as Record<string, unknown> }
}

// ─── CLI-002: Create Cliente ──────────────────────────────────────
export async function handleCreateCliente(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { nombre, apellidos, telefono, email } = body

  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return { status: 400, body: { error: 'Nombre es requerido' } }
  }

  if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
    return { status: 400, body: { error: 'Teléfono es requerido' } }
  }

  const normalizedPhone = normalizePhone(telefono as string)
  if (!normalizedPhone) {
    return { status: 400, body: { error: 'Formato de teléfono no válido' } }
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: (nombre as string).trim(),
      apellidos: apellidos ? (apellidos as string).trim() : null,
      telefono: normalizedPhone,
      email: email ? (email as string).trim() : null,
    })
    .select('id, nombre, telefono')
    .single()

  if (error) {
    if (/duplicate|already exists/i.test(error.message)) {
      return { status: 409, body: { error: 'Ya existe un cliente con ese teléfono' } }
    }
    return { status: 500, body: { error: error.message } }
  }

  return { status: 201, body: data as unknown as Record<string, unknown> }
}

// ─── CLI-003: Update Cliente ──────────────────────────────────────
export async function handleUpdateCliente(
  supabase: SupabaseServerClient,
  id: string,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  if (!id) {
    return { status: 400, body: { error: 'ID de cliente es requerido' } }
  }

  const updateData: Record<string, unknown> = {}
  if (body.nombre && typeof body.nombre === 'string') {
    updateData.nombre = (body.nombre as string).trim()
  }
  if (body.apellidos !== undefined) {
    updateData.apellidos = body.apellidos ? (body.apellidos as string).trim() : null
  }
  if (body.email !== undefined) {
    updateData.email = body.email ? (body.email as string).trim() : null
  }

  // telefono is read-only on update — never included in updateData
  if (Object.keys(updateData).length === 0) {
    return { status: 400, body: { error: 'No hay campos para actualizar' } }
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(updateData as any)
    .eq('id', id)
    .select('id, nombre, apellidos, telefono, email, updated_at')
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: data as unknown as Record<string, unknown> }
}

// ─── CLI-004: Get Cliente Reservas ────────────────────────────────
export async function handleGetClienteReservas(
  supabase: SupabaseServerClient,
  clienteId: string,
): Promise<HandlerResult> {
  if (!clienteId) {
    return { status: 400, body: { error: 'ID de cliente es requerido' } }
  }

  const { data, error } = await supabase
    .from('reservas')
    .select('id, fecha_hora, numero_comensales, estado, created_at')
    .eq('cliente_id', clienteId)
    .order('fecha_hora', { ascending: false })

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: data as unknown as Record<string, unknown> }
}
