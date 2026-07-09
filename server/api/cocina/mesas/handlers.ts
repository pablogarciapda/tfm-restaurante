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

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Mesa } from '#shared/contracts/mesas.contract'
import { calculateFusedCapacity, canFuse } from '#shared/utils/fusion-math'

// ── Types ──

type SupabaseServerClient = SupabaseClient<Database>

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
  supabase: SupabaseServerClient,
): Promise<HandlerResult> {
  const { data, error } = await supabase.from('mesas').select('*').order('numero_mesa')

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
  supabase: SupabaseServerClient,
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
    forma: (body.forma as string) ?? 'rectangular',
    posicion_x: (body.posicion_x as number) ?? 0,
    posicion_y: (body.posicion_y as number) ?? 0,
    ancho: (body.ancho as number) ?? 100,
    alto: (body.alto as number) ?? 100,
    rotacion: (body.rotacion as number) ?? 0,
  }

  const { data, error } = await supabase
    .from('mesas')
    .insert(insertData as Database['public']['Tables']['mesas']['Insert'])
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
  supabase: SupabaseServerClient,
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
    'capacidad_actual', 'zona', 'numero_mesa', 'capacidad_base', 'forma',
  ]
  const updateData: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  const { error } = await supabase
    .from('mesas')
    .update(updateData as Database['public']['Tables']['mesas']['Update'])
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
  supabase: SupabaseServerClient,
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

// ─── handleFuseMesas ──────────────────────────────────────────────────

/**
 * Fuse N≥2 tables into a shared fusion group.
 *
 * Validates: same zone (AD-05), not already fused to different groups.
 * Calculates capacity: floor(sum(capacidad_base) × 0.75) (AD-04, MFU-002).
 * All tables receive shared id_fusion + mesa_padre_id (first selected).
 *
 * Body: { mesaIds: string[] }
 * Returns: { success: true, id_fusion, capacidad_actual }
 */
export async function handleFuseMesas(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { mesaIds } = body

  if (!mesaIds || !Array.isArray(mesaIds) || mesaIds.length < 2) {
    return {
      status: 400,
      body: { error: 'Se necesitan al menos 2 mesas en mesaIds para fusionar' },
    }
  }

  // Fetch the mesas to validate
  const { data: mesasData, error: fetchError } = await supabase
    .from('mesas')
    .select('*')
    .in('id', mesaIds)

  if (fetchError) {
    return {
      status: 500,
      body: { error: `Error al consultar mesas: ${fetchError.message}` },
    }
  }

  const mesas = (mesasData as Mesa[]) ?? []

  // Validate same zone
  if (!canFuse(mesas)) {
    const zones = new Set(mesas.map((m: Mesa) => m.zona))
    if (zones.size > 1) {
      return {
        status: 400,
        body: { error: 'Solo se pueden fusionar mesas de la misma zona' },
      }
    }
    return {
      status: 400,
      body: { error: 'Alguna mesa ya está fusionada. Desfusione primero.' },
    }
  }

  const fusionId = crypto.randomUUID()
  const parentId = mesaIds[0]
  const fusedCapacity = calculateFusedCapacity(mesas)

  // Update all selected mesas with fusion metadata
  const { error: updateError } = await supabase
    .from('mesas')
    .update({
      id_fusion: fusionId,
      mesa_padre_id: parentId,
      capacidad_actual: fusedCapacity,
    })
    .in('id', mesaIds)

  if (updateError) {
    return {
      status: 500,
      body: { error: `Error al fusionar mesas: ${updateError.message}` },
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      id_fusion: fusionId,
      capacidad_actual: fusedCapacity,
    },
  }
}

// ─── handleUnfuseMesas ────────────────────────────────────────────────

/**
 * Unfuse a fusion group. Actions:
 *  - 'force': Just clear fusion fields + restore capacity (no reservations)
 *  - 'cancel': Cancel active reservations + unfuse
 *  - 'standby': Move active reservations to standby + unfuse
 *
 * Body: { fusionId: string, action: 'force' | 'cancel' | 'standby' }
 * Returns: { success: true }
 */
export async function handleUnfuseMesas(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { fusionId, action } = body

  if (!fusionId || typeof fusionId !== 'string') {
    return {
      status: 400,
      body: { error: 'fusionId es requerido' },
    }
  }

  // Fetch all mesas in this fusion group
  const { data: fusedMesas, error: fetchError } = await supabase
    .from('mesas')
    .select('*')
    .eq('id_fusion', fusionId)

  if (fetchError) {
    return {
      status: 500,
      body: { error: `Error al consultar mesas: ${fetchError.message}` },
    }
  }

  const mesaList = (fusedMesas as Mesa[]) ?? []
  const mesaIds = mesaList.map((m: Mesa) => m.id)

  if (mesaIds.length === 0) {
    return {
      status: 400,
      body: { error: 'No se encontraron mesas con ese ID de fusión' },
    }
  }

  // Handle reservation state based on action
  if (action === 'cancel') {
    const { error: cancelError } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .in('mesa_id', mesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (cancelError) {
      return {
        status: 500,
        body: { error: `Error al cancelar reservas: ${cancelError.message}` },
      }
    }
  } else if (action === 'standby') {
    const { error: standbyError } = await supabase
      .from('reservas')
      .update({ estado: 'standby' })
      .in('mesa_id', mesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (standbyError) {
      return {
        status: 500,
        body: {
          error: `Error al mover reservas a standby: ${standbyError.message}`,
        },
      }
    }
  }

  // Clear fusion fields
  const { error: unfuseError } = await supabase
    .from('mesas')
    .update({ id_fusion: null, mesa_padre_id: null })
    .in('id', mesaIds)

  if (unfuseError) {
    return {
      status: 500,
      body: { error: `Error al desfusionar: ${unfuseError.message}` },
    }
  }

  // Restore capacidad_actual = capacidad_base for each mesa
  for (const mesa of mesaList) {
    const { error: restoreError } = await supabase
      .from('mesas')
      .update({ capacidad_actual: mesa.capacidad_base })
      .eq('id', mesa.id)

    if (restoreError) {
      return {
        status: 500,
        body: {
          error: `Error al restaurar capacidad: ${restoreError.message}`,
        },
      }
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}
