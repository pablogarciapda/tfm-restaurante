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
  calculateFusionPositions,
  unfuseTables as pureUnfuseTables,
  getAforoDisponible,
} from '#shared/utils/fusion-math'
import type { Mesa } from '#shared/contracts/mesas.contract'

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

export function useMesasFusion() {
  const client = useSupabaseClient()
  const store = useCanvasStore()

  // ─────────────────────────────────────────────────────────────────────────
  // fuseMesas
  // ─────────────────────────────────────────────────────────────────────────

  async function fuseMesas(selectedIds: string[]): Promise<FuseResult> {
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

    const fusionId = crypto.randomUUID()
    const parentId = selectedIds[0]
    const fusedCapacity = calculateFusedCapacity(selectedMesas)

    // Update DB: set id_fusion + mesa_padre_id on all selected mesas
    const { error } = await client
      .from('mesas')
      .update({ id_fusion: fusionId, mesa_padre_id: parentId, capacidad_actual: fusedCapacity })
      .in('id', selectedIds)

    if (error) {
      return { success: false, error: `Error al fusionar: ${error.message}` }
    }

    // Update store: fusion metadata
    for (const mesa of store.mesas) {
      if (selectedIds.includes(mesa.id)) {
        store.updateMesa(mesa.id, {
          id_fusion: fusionId,
          mesa_padre_id: parentId,
          capacidad_actual: fusedCapacity,
        } as Partial<Mesa>)
      }
    }

    // ── Reposition child tables adjacent to parent ──
    const parentMesa = selectedMesas.find((m) => m.id === parentId)
    const childMesas = selectedMesas.filter((m) => m.id !== parentId)

    if (parentMesa && childMesas.length > 0) {
      const positions = calculateFusionPositions(
        parentMesa,
        childMesas,
        store.stageWidth,
        store.stageHeight,
      )

      // Update DB positions for each child
      for (const pos of positions) {
        const { error: posError } = await client
          .from('mesas')
          .update({ posicion_x: pos.posicion_x, posicion_y: pos.posicion_y })
          .eq('id', pos.id)

        if (posError) {
          console.warn(`Error updating position for mesa ${pos.id}: ${posError.message}`)
        }

        // Update store silently
        store.updateMesa(pos.id, {
          posicion_x: pos.posicion_x,
          posicion_y: pos.posicion_y,
        } as Partial<Mesa>)
      }
    }

    return { success: true, id_fusion: fusionId }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // unfuseMesas — check reservations first, return them to UI
  // ─────────────────────────────────────────────────────────────────────────

  async function unfuseMesas(fusionId: string): Promise<UnfuseResult> {
    // Find all mesas in this fusion group
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Check for active reservations
    const { data: reservas, error: reservasError } = await client
      .from('reservas')
      .select('*')
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (reservasError) {
      return { success: false, error: `Error al consultar reservas: ${reservasError.message}` }
    }

    const activeReservas = (reservas as ReservaStandby[]) ?? []

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

  async function cancelReservationsAndUnfuse(fusionId: string): Promise<UnfuseResult> {
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Cancel active reservations
    const { error: cancelError } = await client
      .from('reservas')
      .update({ estado: 'cancelada' })
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (cancelError) {
      return { success: false, error: `Error al cancelar reservas: ${cancelError.message}` }
    }

    return await performUnfusion(fusedMesaIds)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // moveReservationsToStandby
  // ─────────────────────────────────────────────────────────────────────────

  async function moveReservationsToStandby(fusionId: string): Promise<UnfuseResult> {
    const fusedMesaIds = store.mesas
      .filter((m) => m.id_fusion === fusionId)
      .map((m) => m.id)

    if (fusedMesaIds.length === 0) {
      return { success: false, error: 'No se encontraron mesas con ese ID de fusión' }
    }

    // Move active reservations to standby
    const { error: standbyError } = await client
      .from('reservas')
      .update({ estado: 'standby' })
      .in('mesa_id', fusedMesaIds)
      .in('estado', ['pendiente', 'confirmada'])

    if (standbyError) {
      return { success: false, error: `Error al mover reservas a standby: ${standbyError.message}` }
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

    // Update store: clear fusion fields + restore capacity
    const updatedMesas = pureUnfuseTables(store.mesas, store.mesas.find((m) => fusedMesaIds.includes(m.id))?.id_fusion ?? '')

    // Actually set each unfused mesa in the store
    for (const id of fusedMesaIds) {
      const updated = updatedMesas.find((m) => m.id === id)
      if (updated) {
        store.updateMesa(id, {
          id_fusion: null,
          mesa_padre_id: null,
          capacidad_actual: updated.capacidad_actual,
        } as Partial<Mesa>)
      }
    }

    return { success: true, hasReservations: false }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // checkAforoOverflow — role-gated aforo enforcement (MFU-007, MFU-008)
  // ─────────────────────────────────────────────────────────────────────────

  function checkAforoOverflow(
    addedCapacity: number,
    capacidadTotal: number,
  ): { wouldOverflow: boolean; disponible: number } {
    const disponible = getAforoDisponible(
      store.mesas,
      capacidadTotal,
      'auto',
      0,
    )

    const wouldOverflow = addedCapacity > disponible

    return { wouldOverflow, disponible }
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
