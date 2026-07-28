/**
 * fusion-math.ts — Pure functions for table fusion logic (AD-04)
 *
 * All functions are PURE — no side effects, no mutations of input.
 * Design decisions: AD-04 (fusion capacity formula), AD-05 (same-zone enforcement).
 *
 * Spec refs: MFU-001, MFU-002, MCA-005, MCA-006, SCH-010
 */

import type { Mesa, MesaEstado, AforoMode } from '../contracts/mesas.contract'
import { toLocalDateString, isoToLocalDate } from './date'

// ---------------------------------------------------------------------------
// calculateFusedCapacity
// ---------------------------------------------------------------------------

/**
 * Calculate realistic capacity for fused tables.
 * Formula (AD-04):
 *   1 table  → sum (no reduction)
 *   2 tables → sum - 2
 *   3 tables → sum - 4
 *   4+       → sum - 6
 *
 * Two 4-pax tables fuse to 6 (not 8). Three 4-pax tables fuse to 8 (not 12).
 *
 * @param mesas — Array of objects with `capacidad_base` property
 * @returns fused capacity (integer >= 0)
 */
export function calculateFusedCapacity(
  mesas: Pick<Mesa, 'capacidad_base'>[],
): number {
  const sum = mesas.reduce((acc, m) => acc + m.capacidad_base, 0)
  const n = mesas.length

  if (n <= 1) return sum

  // Never reduce below the largest individual table's capacity
  const maxBase = mesas.reduce((acc, m) => Math.max(acc, m.capacidad_base), 0)

  if (n === 2) return Math.max(sum - 2, maxBase, 0)
  if (n === 3) return Math.max(sum - 4, maxBase, 0)
  return Math.max(sum - 6, maxBase, 0)
}

// ---------------------------------------------------------------------------
// canFuse
// ---------------------------------------------------------------------------

/**
 * Check if a set of tables can be fused.
 *
 * All tables MUST be in the same zone AND:
 * - All have id_fusion === null (new fusion), OR
 * - All share the same existing id_fusion (adding to existing)
 *
 * AD-05: cross-zone fusion is rejected.
 *
 * @param mesas — Array of objects with `zona` and `id_fusion`
 * @returns true if fusion is allowed
 */
export function canFuse(
  mesas: Pick<Mesa, 'zona' | 'id_fusion'>[],
): boolean {
  if (mesas.length === 0) return false

  const firstZone = mesas[0]!.zona
  const allSameZone = mesas.every((m) => m.zona === firstZone)
  if (!allSameZone) return false

  // If any are already fused, they must all share the same fusion group
  const hasFusion = mesas.filter((m) => m.id_fusion !== null)
  if (hasFusion.length > 0) {
    const uniqueGroups = new Set(hasFusion.map((m) => m.id_fusion))
    if (uniqueGroups.size > 1) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// fuseTables
// ---------------------------------------------------------------------------

/**
 * Generate fusion metadata: id_fusion, mesa_padre_id, capacidad_actual.
 *
 * Does NOT mutate the input array.
 *
 * @param mesas — Full Mesa array (used for capacity calculation)
 * @param selectedIds — Ordered IDs of selected mesas (first = parent)
 * @returns fusion metadata (id_fusion, mesa_padre_id, capacidad_actual)
 */
export function fuseTables(
  mesas: Mesa[],
  selectedIds: string[],
): { id_fusion: string; mesa_padre_id: string; capacidad_actual: number } {
  const selectedMesas = mesas.filter((m) => selectedIds.includes(m.id))
  const id_fusion = crypto.randomUUID()
  const mesa_padre_id = selectedIds[0]!
  const capacidad_actual = calculateFusedCapacity(selectedMesas)

  return { id_fusion, mesa_padre_id, capacidad_actual }
}

// ---------------------------------------------------------------------------
// unfuseTables
// ---------------------------------------------------------------------------

/**
 * Restore individual tables from a fusion group.
 *
 * Returns a NEW array (does NOT mutate input). For mesas matching the
 * fusion group, clears id_fusion + mesa_padre_id and restores
 * capacidad_actual = capacidad_base.
 *
 * @param mesas — Full Mesa array
 * @param fusionId — The fusion group to dissolve
 * @returns NEW Mesa[] with fusion fields cleared for matching mesas
 */
export function unfuseTables(mesas: Mesa[], fusionId: string): Mesa[] {
  return mesas.map((mesa) => {
    if (mesa.id_fusion !== fusionId) return { ...mesa }

    return {
      ...mesa,
      id_fusion: null,
      mesa_padre_id: null,
      capacidad_actual: mesa.capacidad_base,
    }
  })
}

// ---------------------------------------------------------------------------
// getAforoDisponible
// ---------------------------------------------------------------------------

/**
 * Calculate available capacity.
 *
 * Auto mode: capacidadTotal - SUM(capacidad_actual) for root mesas only
 *   (mesa_padre_id IS NULL — child mesas in fusions are NOT double-counted).
 * Manual mode: capacidadTotal - ocupacionManual.
 *
 * @param mesas — Full Mesa array
 * @param capacidadTotal — configuracion.capacidad_total_local
 * @param modo — 'auto' or 'manual'
 * @param ocupacionManual — configuracion.ocupacion_manual (used in manual mode)
 * @returns available spots (>= 0)
 */
export function getAforoDisponible(
  mesas: Mesa[],
  capacidadTotal: number,
  modo: AforoMode,
  ocupacionManual: number,
): number {
  if (modo === 'manual') {
    return capacidadTotal - ocupacionManual
  }

  // Auto: sum only root mesas (mesa_padre_id IS NULL)
  const ocupacion =
    mesas
      .filter((m) => m.mesa_padre_id === null)
      .reduce((sum, m) => sum + m.capacidad_actual, 0)

  return capacidadTotal - ocupacion
}

// ---------------------------------------------------------------------------
// applyGroupTransformToSiblings
// ---------------------------------------------------------------------------

/**
 * Snapshot record for one sibling's post-gesture absolute position/rotation.
 */
export interface SiblingTransform {
  id: string
  posicion_x: number
  posicion_y: number
  rotacion: number
}

/**
 * Compute new absolute positions/rotations for fused siblings after the parent
 * mesa was translated and/or rotated. Pure function — no Konva, no side effects.
 *
 * @param parentBefore   parent's {x, y, rotation, width, height} before gesture
 * @param parentAfter    parent's {x, y, rotation} at the current event
 * @param siblingsBefore array of {id, x, y, rotation} for every non-parent member
 * @returns SiblingTransform[] with new absolute coords per sibling id
 */
export function applyGroupTransformToSiblings(
  parentBefore: { x: number; y: number; rotation: number; width: number; height: number },
  parentAfter: { x: number; y: number; rotation: number },
  siblingsBefore: Array<{ id: string; x: number; y: number; rotation: number }>,
): SiblingTransform[] {
  const dx = parentAfter.x - parentBefore.x
  const dy = parentAfter.y - parentBefore.y
  const dRot = parentAfter.rotation - parentBefore.rotation

  // Pure translation fast path
  if (dRot === 0) {
    return siblingsBefore.map((sib) => ({
      id: sib.id,
      posicion_x: Math.round(sib.x + dx),
      posicion_y: Math.round(sib.y + dy),
      rotacion: Math.round(sib.rotation),
    }))
  }

  // Rotation around parent's pre-gesture centroid
  const cx = parentBefore.x + parentBefore.width / 2
  const cy = parentBefore.y + parentBefore.height / 2
  const rad = (dRot * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return siblingsBefore.map((sib) => {
    const rx = sib.x - cx
    const ry = sib.y - cy
    const rotatedX = rx * cos - ry * sin
    const rotatedY = rx * sin + ry * cos
    return {
      id: sib.id,
      posicion_x: Math.round(cx + rotatedX + dx),
      posicion_y: Math.round(cy + rotatedY + dy),
      rotacion: Math.round(sib.rotation + dRot),
    }
  })
}

// ---------------------------------------------------------------------------
// getMesaEstado
// ---------------------------------------------------------------------------

/**
 * Determine the occupancy state of a table based on today's reservations.
 *
 * A table is 'reservada' when there's an active pendiente or confirmada
 * reservation for today. Once admin marks a reservation 'completada',
 * the table returns to 'libre' (the meal is done, table is available again).
 *
 * Priority: reservada (pendiente/confirmada today) > libre.
 *
 * @param mesa — The table to check
 * @param reservas — Array of reservation-like objects with mesa_id, estado, fecha_hora
 * @returns MesaEstado: 'libre' | 'reservada'
 */
export function getMesaEstado(
  mesa: Mesa,
  reservas: { mesa_id: string | null; estado: string; fecha_hora: string }[],
): MesaEstado {
  const todayStr = toLocalDateString()

  const todayReservas = reservas.filter(
    (r) => r.mesa_id === mesa.id && isoToLocalDate(r.fecha_hora) === todayStr,
  )

  const hasReservada = todayReservas.some(
    (r) => r.estado === 'pendiente' || r.estado === 'confirmada',
  )
  if (hasReservada) return 'reservada'

  return 'libre'
}
