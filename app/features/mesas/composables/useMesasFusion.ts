/**
 * useMesasFusion.ts — Fusion/unfusion composable (MFU-001 to MFU-008)
 *
 * Wraps fusion-math pure functions (shared/utils/fusion-math.ts) with
 * Supabase DB operations and Pinia store updates.
 *
 * Design decisions: AD-04 (fusion capacity), AD-05 (same-zone),
 * AD-08 (standby), AD-09 (aforo role-gated).
 */
import { useCanvasStore } from '../stores/canvas-store'
import {
  canFuse as pureCanFuse,
  calculateFusedCapacity,
  unfuseTables as pureUnfuseTables,
  getAforoDisponible,
} from '#shared/utils/fusion-math'
import { generateUUID } from '#shared/utils/safe-uuid'
import type { Mesa, CocinaRole, AforoOverflowCheck } from '#shared/contracts/mesas.contract'

// ── Types ──

interface ReservaStandby {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

interface FuseResult {
  success: boolean
  id_fusion?: string
  error?: string
}

interface UnfuseResult {
  success: boolean
  hasReservations?: boolean
  reservations?: ReservaStandby[]
  count?: number
  error?: string
}

/** Time window for turno filtering (half-open [start, end) in minutes from 00:00). */
interface TurnoWindow {
  start: number
  end: number
}

/**
 * Filter reservations to only those falling within the given turno window.
 * Handles cena crossing midnight (end < start).
 */
function filterByTurno(
  reservas: ReservaStandby[],
  turnoWindow: TurnoWindow,
): ReservaStandby[] {
  return reservas.filter((r) => {
    const d = new Date(r.fecha_hora)
    const mins = d.getHours() * 60 + d.getMinutes()
    if (turnoWindow.end <= turnoWindow.start) {
      // Cena crosses midnight: [start, 24:00) ∪ [0, end)
      return mins >= turnoWindow.start || mins < turnoWindow.end
    }
    return mins >= turnoWindow.start && mins < turnoWindow.end
  })
}

export function useMesasFusion() {
  const client = useSupabaseClient()
  const store = useCanvasStore()

  // ─────────────────────────────────────────────────────────────────────────
  // fuseMesas
  // ─────────────────────────────────────────────────────────────────────────

  async function fuseMesas(selectedIds: string[], forcedCapacity?: number): Promise<FuseResult> {
    if (selectedIds.length < 2) {
      return { success: false, error: 'Se necesitan al menos 2 mesas para fusionar' }
    }

    const selectedMesas = store.mesas.filter((m) => selectedIds.includes(m.id))

    // Validate same zone via pure function
    if (!pureCanFuse(selectedMesas)) {
      // Check if any are already fused (stricter error)
      const hasFusion = selectedMesas.some((m) => m.id_fusion !== null)
      if (hasFusion) {
        return { success: false, error: 'Alguna mesa ya está fusionada. Desfusione primero.' }
      }
      return { success: false, error: 'Solo se pueden fusionar mesas de la misma zona' }
    }

    const fusionId = generateUUID()
    const parentId = selectedIds[0]
    const fusedCapacity = forcedCapacity ?? calculateFusedCapacity(selectedMesas)
    const childIds = selectedIds.filter((id) => id !== parentId)

    // ── DB: update fusion fields only (positions stay where waiter placed them) ──
    // Parent: id_fusion + capacidad_actual
    const { error: parentError } = await client
      .from('mesas')
      .update({ id_fusion: fusionId, capacidad_actual: fusedCapacity })
      .eq('id', parentId)

    if (parentError) {
      return { success: false, error: `Error al fusionar: ${parentError.message}` }
    }

    // Children: id_fusion + mesa_padre_id + capacidad_actual
    for (const childId of childIds) {
      const { error: childError } = await client
        .from('mesas')
        .update({
          id_fusion: fusionId,
          mesa_padre_id: parentId,
          capacidad_actual: fusedCapacity,
        })
        .eq('id', childId)

      if (childError) {
        return { success: false, error: `Error al fusionar: ${childError.message}` }
      }
    }

    // ── Store: atomic batch update ──
    const batchUpdates: Array<{ id: string; data: Partial<Mesa> }> = []
    for (const id of selectedIds) {
      batchUpdates.push({
        id,
        data: {
          id_fusion: fusionId,
          mesa_padre_id: id === parentId ? null : parentId,
          capacidad_actual: fusedCapacity,
        } as Partial<Mesa>,
      })
    }
    store.batchUpdateMesas(batchUpdates)

    return { success: true, id_fusion: fusionId }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // unfuseMesas — check reservations first, return them to UI
  // ─────────────────────────────────────────────────────────────────────────

  async function unfuseMesas(
    fusionId: string,
    fecha?: string,
    turnoWindow?: TurnoWindow,
  ): Promise<UnfuseResult> {
    // Find all mesas in this fusion group
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Check for active reservations on the selected date only
    let query = client
      .from('reservas')
      .select('*')
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (fecha) {
      query = query.gte('fecha_hora', fecha + 'T00:00:00').lte('fecha_hora', fecha + 'T23:59:59')
    }

    const { data: reservas, error: reservasError } = await query

    if (reservasError) {
      return { success: false, error: `Error al consultar reservas: ${reservasError.message}` }
    }

    let activeReservas = (reservas as ReservaStandby[]) ?? []

    // Filter by turno if provided — don't block unfuse for reservations in other turns
    if (turnoWindow) {
      activeReservas = filterByTurno(activeReservas, turnoWindow)
    }

    if (activeReservas.length > 0) {
      return {
        success: false,
        hasReservations: true,
        count: activeReservas.length,
        reservations: activeReservas,
      }
    }

    // No reservations — perform unfusion directly
    return await performUnfusion(fusedMesaIds)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // cancelReservationsAndUnfuse
  // ─────────────────────────────────────────────────────────────────────────

  async function cancelReservationsAndUnfuse(
    fusionId: string,
    fecha?: string,
    turnoWindow?: TurnoWindow,
  ): Promise<UnfuseResult> {
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Fetch active reservations on the selected date
    let query = client
      .from('reservas')
      .select('id')
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (fecha) {
      query = query.gte('fecha_hora', fecha + 'T00:00:00').lte('fecha_hora', fecha + 'T23:59:59')
    }

    const { data: reservas, error: fetchError } = await query

    if (fetchError) {
      return { success: false, error: `Error al consultar reservas: ${fetchError.message}` }
    }

    let toCancel = (reservas as Array<{ id: string }>) ?? []

    // Filter by turno if provided
    if (turnoWindow && toCancel.length > 0) {
      // Re-fetch with fecha_hora to filter by turno
      let fullQuery = client
        .from('reservas')
        .select('id, fecha_hora')
        .in('mesa_id', fusedMesaIds)
        .in('estado', ['pendiente', 'confirmada'])

      if (fecha) {
        fullQuery = fullQuery
          .gte('fecha_hora', fecha + 'T00:00:00')
          .lte('fecha_hora', fecha + 'T23:59:59')
      }

      const { data: fullReservas } = await fullQuery
      const filtered = filterByTurno(
        (fullReservas as ReservaStandby[]) ?? [],
        turnoWindow,
      )
      toCancel = filtered.map((r) => ({ id: r.id }))
    }

    // Cancel only turno-matching reservations
    if (toCancel.length > 0) {
      const ids = toCancel.map((r) => r.id)
      const { error: cancelError } = await client
        .from('reservas')
        .update({ estado: 'cancelada' })
        .in('id', ids)

      if (cancelError) {
        return { success: false, error: `Error al cancelar reservas: ${cancelError.message}` }
      }
    }

    return await performUnfusion(fusedMesaIds)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // moveReservationsToStandby
  // ─────────────────────────────────────────────────────────────────────────

  async function moveReservationsToStandby(
    fusionId: string,
    fecha?: string,
    turnoWindow?: TurnoWindow,
  ): Promise<UnfuseResult> {
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Fetch active reservations on the selected date
    let query = client
      .from('reservas')
      .select('id')
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (fecha) {
      query = query.gte('fecha_hora', fecha + 'T00:00:00').lte('fecha_hora', fecha + 'T23:59:59')
    }

    const { data: reservas, error: fetchError } = await query

    if (fetchError) {
      return { success: false, error: `Error al consultar reservas: ${fetchError.message}` }
    }

    let toStandby = (reservas as Array<{ id: string }>) ?? []

    // Filter by turno if provided
    if (turnoWindow && toStandby.length > 0) {
      let fullQuery = client
        .from('reservas')
        .select('id, fecha_hora')
        .in('mesa_id', fusedMesaIds)
        .in('estado', ['pendiente', 'confirmada'])

      if (fecha) {
        fullQuery = fullQuery
          .gte('fecha_hora', fecha + 'T00:00:00')
          .lte('fecha_hora', fecha + 'T23:59:59')
      }

      const { data: fullReservas } = await fullQuery
      const filtered = filterByTurno(
        (fullReservas as ReservaStandby[]) ?? [],
        turnoWindow,
      )
      toStandby = filtered.map((r) => ({ id: r.id }))
    }

    // Move only turno-matching reservations to standby
    if (toStandby.length > 0) {
      const ids = toStandby.map((r) => r.id)
      const { error: standbyError } = await client
        .from('reservas')
        .update({ estado: 'standby', mesa_id: null, zona_id: null })
        .in('id', ids)

      if (standbyError) {
        return { success: false, error: `Error al mover reservas a standby: ${standbyError.message}` }
      }
    }

    return await performUnfusion(fusedMesaIds)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getStandbyReservations
  // ─────────────────────────────────────────────────────────────────────────

  async function getStandbyReservations(): Promise<ReservaStandby[]> {
    const { data, error } = await client
      .from('reservas')
      .select('*')
      .eq('estado', 'standby')

    if (error) throw error
    return (data as ReservaStandby[]) ?? []
  }

  // ─────────────────────────────────────────────────────────────────────────
  // reassignStandbyReservation
  // ─────────────────────────────────────────────────────────────────────────

  async function reassignStandbyReservation(
    reservaId: string,
    newMesaId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await client
      .from('reservas')
      .update({ mesa_id: newMesaId, estado: 'confirmada' })
      .eq('id', reservaId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // performUnfusion — internal helper
  // ─────────────────────────────────────────────────────────────────────────

  async function performUnfusion(fusedMesaIds: string[]): Promise<UnfuseResult> {
    // Clear fusion fields on all fused mesas in DB
    const { error } = await client
      .from('mesas')
      .update({ id_fusion: null, mesa_padre_id: null })
      .in('id', fusedMesaIds)

    if (error) {
      return { success: false, error: `Error al desfusionar: ${error.message}` }
    }

    // Restore capacidad_actual = capacidad_base for each mesa individually
    for (const id of fusedMesaIds) {
      const mesa = store.mesas.find((m) => m.id === id)
      if (mesa) {
        const { error: restoreError } = await client
          .from('mesas')
          .update({ capacidad_actual: mesa.capacidad_base })
          .eq('id', id)

        if (restoreError) {
          return { success: false, error: `Error al restaurar capacidad: ${restoreError.message}` }
        }
      }
    }

    // Update store: atomic batch — clear fusion fields + restore capacity
    const updatedMesas = pureUnfuseTables(store.mesas, store.mesas.find((m) => fusedMesaIds.includes(m.id))?.id_fusion ?? '')

    const batchUpdates: Array<{ id: string; data: Partial<Mesa> }> = []
    for (const id of fusedMesaIds) {
      const updated = updatedMesas.find((m) => m.id === id)
      if (updated) {
        batchUpdates.push({
          id,
          data: {
            id_fusion: null,
            mesa_padre_id: null,
            capacidad_actual: updated.capacidad_actual,
          } as Partial<Mesa>,
        })
      }
    }
    store.batchUpdateMesas(batchUpdates)

    return { success: true, hasReservations: false }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // checkAforoOverflow — role-gated aforo enforcement (MFU-007, MFU-008)
  // ─────────────────────────────────────────────────────────────────────────

  function checkAforoOverflow(
    addedCapacity: number,
    capacidadTotal: number,
    role: CocinaRole,
  ): AforoOverflowCheck {
    const disponible = getAforoDisponible(
      store.mesas,
      capacidadTotal,
      'auto',
      0,
    )

    const overflow = addedCapacity > disponible
    const projected = capacidadTotal - disponible + addedCapacity

    return {
      overflow,
      blocked: overflow && role !== 'admin',
      needsOverride: overflow && role === 'admin',
      disponible,
      projected,
    }
  }

  return {
    fuseMesas,
    unfuseMesas,
    cancelReservationsAndUnfuse,
    moveReservationsToStandby,
    getStandbyReservations,
    reassignStandbyReservation,
    checkAforoOverflow,
  }
}
