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
  const todayStr = new Date().toISOString().slice(0, 10)

  const todayReservas = reservas.filter(
    (r) => r.mesa_id === mesa.id && r.fecha_hora.startsWith(todayStr),
  )

  const hasReservada = todayReservas.some(
    (r) => r.estado === 'pendiente' || r.estado === 'confirmada',
  )
  if (hasReservada) return 'reservada'

  // 'completada' is excluded — admin released the table
  return 'libre'
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
 * Math:
 *   P = (parentBefore.x + parentBefore.width/2, parentBefore.y + parentBefore.height/2)
 *       — parent's centroid evaluated at the pre-gesture state.
 *   dx = parentAfter.x - parentBefore.x
 *   dy = parentAfter.y - parentBefore.y
 *   dRot = parentAfter.rotation - parentBefore.rotation  (degrees, CW positive)
 *
 *   For each sibling:
 *     - delta rotation around (dx, dy) when dRot !== 0:
 *       rotated = P + R(dRot) · (sib.(x,y) − P)
 *       final_pos = rotated + (dx, dy)
 *     - pure translation when dRot === 0:
 *       final_pos = sib.(x,y) + (dx, dy)
 *     - final_rot = sib.rotation + dRot
 *
 *   Radians = dRot * π / 180. Konva rotation is CW positive (matches Math.cos/ sin
 *   when treated as image-coordinate y-down: (r·cos θ, r·sin θ)).
 *
 * Result fields are rounded to integers (matches existing Math.round usage in
 * TableCanvas handleTransformEnd).
 *
 * @param parentBefore   parent's {x, y, rotation, width, height} before gesture
 * @param parentAfter    parent's {x, y, rotation} at the current event
 * @param siblingsBefore array of {id, x, y, rotation} for every non-parent member
 *                       of the fusion (snapshot taken at gesture start)
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
// rotateGroupAroundCentroid90CW
// ---------------------------------------------------------------------------

/**
 * Compute the absolute positions/rotations of every member of a fused group
 * after rotating the whole group 90° clockwise around its visual centroid.
 *
 * Used by the "Rotar 90°" button in /cocina/reservas (operation mode) where
 * there is NO Konva Transformer and NO active drag gesture — the rotation is
 * a programmatic one-shot applied to the parent + every sibling as a rigid
 * block.
 *
 * Math (BEWARE: naive posicion_x + ancho/2 is WRONG for rotated tables):
 *
 *   In Konva a group at (x, y) with rotation θ contains its shape at local
 *   center (w/2, h/2). The stage-space (visual) center is:
 *
 *     cvx = x + cos(θ)·w/2 − sin(θ)·h/2
 *     cvy = y + sin(θ)·w/2 + cos(θ)·h/2
 *
 *   This is the ONLY correct pivot for rigid group rotation.
 *
 *   1. Compute the group centroid C = average of all members' visual centers.
 *   2. For each member: d = cv − C → rotate d 90° CW → cv' = C + R(d)
 *   3. Derive the NEW top-left from cv' using the NEW rotation θ' = θ+90:
 *        pos' = cv' − (cos(θ')·w/2 − sin(θ')·h/2, sin(θ')·w/2 + cos(θ')·h/2)
 *
 * Pure function — no side effects, no mutation of input. Returns a NEW array;
 * each entry is a fresh object (caller may `Object.assign` it onto the store
 * Mesa without aliasing the input).
 *
 * @param members array of Mesas forming a fused group (or, defensively, any
 *                array of Mesas). Assumed to share the same id_fusion; the
 *                composable guards this at the call site.
 * @returns SiblingTransform[] with new absolute { posicion_x, posicion_y,
 *          rotacion } for each member in the same order as the input.
 */
export function rotateGroupAroundCentroid90CW(
  members: Array<Pick<Mesa, 'id' | 'posicion_x' | 'posicion_y' | 'ancho' | 'alto' | 'rotacion'>>,
): SiblingTransform[] {
  if (members.length === 0) return []

  // Step 1: compute visual centers (accounts for each member's current rotation)
  const halfW = members.map((m) => m.ancho / 2)
  const halfH = members.map((m) => m.alto / 2)
  const cosOrig = members.map((m) => {
    if (m.rotacion === 0) return 1
    return Math.cos((m.rotacion * Math.PI) / 180)
  })
  const sinOrig = members.map((m) => {
    if (m.rotacion === 0) return 0
    return Math.sin((m.rotacion * Math.PI) / 180)
  })

  const cvx = members.map((m, i) => m.posicion_x + cosOrig[i] * halfW[i] - sinOrig[i] * halfH[i])
  const cvy = members.map((m, i) => m.posicion_y + sinOrig[i] * halfW[i] + cosOrig[i] * halfH[i])

  // Group centroid = average of visual centers
  const gcx = cvx.reduce((s, v) => s + v, 0) / members.length
  const gcy = cvy.reduce((s, v) => s + v, 0) / members.length

  // Step 2: rotate each member 90° CW around the group centroid
  return members.map((m, i) => {
    const ddx = cvx[i] - gcx
    const ddy = cvy[i] - gcy
    // 90° CW: R(90°) of (dx, dy) = (−dy, dx)
    const ncvx = gcx + (-ddy)
    const ncvy = gcy + ddx

    const newRot = (((m.rotacion + 90) % 360) + 360) % 360

    // Step 3: back-calculate top-left from visual centre using the NEW rotation
    const newRad = (newRot * Math.PI) / 180
    // We special-case the common angles (90°, 180°, 270°, 0°) to avoid
    // floating-point rounding near π/2 etc.
    let cosNew: number
    let sinNew: number
    const r = newRot % 360
    if (r === 0) { cosNew = 1; sinNew = 0 }
    else if (r === 90) { cosNew = 0; sinNew = 1 }
    else if (r === 180) { cosNew = -1; sinNew = 0 }
    else if (r === 270) { cosNew = 0; sinNew = -1 }
    else { cosNew = Math.cos(newRad); sinNew = Math.sin(newRad) }

    const npx = ncvx - (cosNew * halfW[i] - sinNew * halfH[i])
    const npy = ncvy - (sinNew * halfW[i] + cosNew * halfH[i])

    return {
      id: m.id,
      posicion_x: Math.round(npx),
      posicion_y: Math.round(npy),
      rotacion: Math.round(newRot),
    }
  })
}
