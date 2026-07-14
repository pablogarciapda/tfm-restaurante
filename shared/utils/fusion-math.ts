/**
 * fusion-math.ts — Pure functions for table fusion logic (AD-04)
 *
 * All functions are PURE — no side effects, no mutations of input.
 * Design decisions: AD-04 (fusion capacity formula), AD-05 (same-zone enforcement).
 *
 * Spec refs: MFU-001, MFU-002, MCA-005, MCA-006, SCH-010
 */

import type { Mesa, MesaEstado, AforoMode } from '../contracts/mesas.contract'

// ---------------------------------------------------------------------------
// calculateFusedCapacity
// ---------------------------------------------------------------------------

/**
 * Calculate realistic capacity for fused tables.
 * Formula: floor(sum(capacidad_base) × 0.75)
 *
 * Two 4-pax tables fuse to 6 (not 8). AD-04.
 *
 * @param mesas — Array of objects with `capacidad_base` property
 * @returns fused capacity (integer >= 0)
 */
export function calculateFusedCapacity(
  mesas: Pick<Mesa, 'capacidad_base'>[],
): number {
  const sum = mesas.reduce((acc, m) => acc + m.capacidad_base, 0)
  return Math.floor(sum * 0.75)
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
    // All fused mesas share same group — valid (new addition or re-fuse)
  }

  // All null (new fusion) or all same group → OK
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
// calculateFusionPositions
// ---------------------------------------------------------------------------

/**
 * Calculate positions for child tables adjacent to the parent table.
 *
 * Children are placed to the RIGHT of the parent (touching, same y).
 * If they don't fit within stageWidth, they wrap to the next row below.
 * The parent STAYS in place.
 *
 * @param parent — The parent Mesa (stays in position)
 * @param children — Child mesas (repositioned)
 * @param stageWidth — Canvas stage width for boundary checks
 * @param stageHeight — Canvas stage height for boundary checks
 * @returns Array of { id, posicion_x, posicion_y } for each child
 */
export function calculateFusionPositions(
  parent: Pick<Mesa, 'id' | 'posicion_x' | 'posicion_y' | 'ancho' | 'alto'>,
  children: Pick<Mesa, 'id' | 'ancho' | 'alto'>[],
  stageWidth: number,
  _stageHeight: number,
): Array<{ id: string; posicion_x: number; posicion_y: number }> {
  const GAP = 0 // Touching (border strokes provide visual separation)
  const positions: Array<{ id: string; posicion_x: number; posicion_y: number }> = []

  let currentX = parent.posicion_x + parent.ancho + GAP
  let currentY = parent.posicion_y
  let rowMaxHeight = parent.alto

  for (const child of children) {
    // If doesn't fit in current row, wrap to next row below
    if (currentX + child.ancho > stageWidth) {
      currentX = parent.posicion_x
      currentY += rowMaxHeight + GAP
      rowMaxHeight = 0
    }

    positions.push({
      id: child.id,
      posicion_x: currentX,
      posicion_y: currentY,
    })

    currentX += child.ancho + GAP
    rowMaxHeight = Math.max(rowMaxHeight, child.alto)
  }

  return positions
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
// getMesaEstado
// ---------------------------------------------------------------------------

/**
 * Determine the occupancy state of a table based on today's reservations.
 *
 * Priority: reservada (pendiente/confirmada today) > ocupada (completada today) > libre.
 *
 * @param mesa — The table to check
 * @param reservas — Array of reservation-like objects with mesa_id, estado, fecha_hora
 * @returns MesaEstado: 'libre' | 'ocupada' | 'reservada'
 */
export function getMesaEstado(
  mesa: Mesa,
  reservas: { mesa_id: string | null; estado: string; fecha_hora: string }[],
): MesaEstado {
  const todayStr = new Date().toISOString().slice(0, 10)

  const todayReservas = reservas.filter(
    (r) => r.mesa_id === mesa.id && r.fecha_hora.startsWith(todayStr),
  )

  const hasReservada = todayReservas.some(
    (r) => r.estado === 'pendiente' || r.estado === 'confirmada',
  )
  if (hasReservada) return 'reservada'

  const hasOcupada = todayReservas.some((r) => r.estado === 'completada')
  if (hasOcupada) return 'ocupada'

  return 'libre'
}
