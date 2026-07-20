/**
 * useFusionGroupDrag — Imperative sibling sync during fused-group drag/transform
 *
 * When the parent of a fusion group is dragged or rotated, every other member
 * must move/rotate together as a RIGID block. This composable owns the
 * Konva-side plumbing: it reads the parent Konva node live, uses the snapshot
 * captured by `useCanvasStore.beginFusionDrag` for pre-gesture positions,
 * computes sibling deltas via the pure `applyGroupTransformToSiblings` helper,
 * and imperatively updates sibling Konva node positions/rotations before a
 * single `layer.batchDraw()`.
 *
 * Boundaries:
 *  - Pure math lives in `shared/utils/fusion-math.ts`.
 *  - Snapshot state lives in `useCanvasStore`.
 *  - This composable only wires Konva nodes to math + store.
 *
 * TablesCanvas is responsible for calling beginFusionDrag/endFusionDrag on the
 * store (gesture lifecycle) and forwarding dragmove/transform events to these
 * handlers. computeFinalSiblingTransforms lets the caller Object.assign sibling
 * Mesas in-place at transform-end so they reflect the synced state for the Save
 * loop in /cocina/diseno.
 */
import {
  applyGroupTransformToSiblings,
  rotateGroupAroundCentroid90CW,
  type SiblingTransform,
} from '#shared/utils/fusion-math'
import type { useCanvasStore as CanvasStore } from '../stores/canvas-store'
import type { Mesa } from '#shared/contracts/mesas.contract'

/** Minimal Konva node surface used here. */
export interface KonvaLikeNode {
  x(): number
  x(v: number): void
  y(): number
  y(v: number): void
  rotation(): number
  rotation(v: number): void
}

/** Minimal Konva layer surface used here. */
export interface KonvaLikeLayer {
  findOne(selector: string): KonvaLikeNode | null
  batchDraw(): void
}

type CanvasStoreType = ReturnType<typeof CanvasStore>

/**
 * @param store — the canvas store (must expose dragSnapshot, beginFusionDrag,
 *               endFusionDrag, stageWidth, stageHeight)
 */
export function useFusionGroupDrag(store: CanvasStoreType) {
  /**
   * A mesa is the parent (root) of a fused group when it has an id_fusion
   * AND mesa_padre_id is null. After AD-04 fix, the fusion parent no longer
   * has mesa_padre_id = self.id — it stays null (true root).
   */
  function isParentDriver(mesa: Mesa): boolean {
    return !!mesa.id_fusion && mesa.mesa_padre_id === null
  }

  function siblingsFromSnapshot(parentId: string): Array<{ id: string; x: number; y: number; rotation: number }> {
    const snapshot = store.dragSnapshot
    if (!snapshot) return []
    const entries: Array<{ id: string; x: number; y: number; rotation: number }> = []
    for (const [id, pos] of snapshot.entries()) {
      if (id === parentId) continue
      entries.push({ id, x: pos.x, y: pos.y, rotation: pos.rotation })
    }
    return entries
  }

  function clampToStage(value: number, max: number): number {
    return Math.max(0, Math.min(value, max))
  }

  /**
   * Sync siblings during a dragmove. Pure translation — drag never rotates.
   * Siblings are clamped to the same bounds the parent dragBoundFunc enforces.
   */
  function handleDragMove(mesa: Mesa, layer: KonvaLikeLayer): void {
    if (!isParentDriver(mesa)) return
    const snapshot = store.dragSnapshot
    if (!snapshot) return

    const parentId = mesa.id
    const parentSnapshot = snapshot.get(parentId)
    if (!parentSnapshot) return

    const parentNode = layer.findOne(`#${parentId}`)
    if (!parentNode) return

    const dx = parentNode.x() - parentSnapshot.x
    const dy = parentNode.y() - parentSnapshot.y

    const maxX = store.stageWidth - 50
    const maxY = store.stageHeight - 50

    for (const [siblingId, sibSnapshot] of snapshot.entries()) {
      if (siblingId === parentId) continue
      const node = layer.findOne(`#${siblingId}`)
      if (!node) continue
      node.x(clampToStage(sibSnapshot.x + dx, maxX))
      node.y(clampToStage(sibSnapshot.y + dy, maxY))
      // Rotation is untouched during a pure drag.
    }
    layer.batchDraw()
  }

  /**
   * Sync siblings during a transform gesture. Rotation around the parent's
   * pre-gesture centroid + translation by (dx, dy). Sibling rotation advances
   * by dRot (rigid body). Pure math delegated to applyGroupTransformToSiblings.
   */
  function handleTransform(mesa: Mesa, layer: KonvaLikeLayer): void {
    if (!isParentDriver(mesa)) return
    const snapshot = store.dragSnapshot
    if (!snapshot) return

    const parentId = mesa.id
    const parentSnapshot = snapshot.get(parentId)
    if (!parentSnapshot) return

    const parentNode = layer.findOne(`#${parentId}`)
    if (!parentNode) return

    const siblingsBefore = siblingsFromSnapshot(parentId)
    if (siblingsBefore.length === 0) return

    const parentBefore = {
      x: parentSnapshot.x,
      y: parentSnapshot.y,
      rotation: parentSnapshot.rotation,
      width: mesa.ancho,
      height: mesa.alto,
    }
    const parentAfter = {
      x: parentNode.x(),
      y: parentNode.y(),
      rotation: parentNode.rotation(),
    }

    const transforms = applyGroupTransformToSiblings(parentBefore, parentAfter, siblingsBefore)

    const maxX = store.stageWidth - 50
    const maxY = store.stageHeight - 50

    for (const t of transforms) {
      const node = layer.findOne(`#${t.id}`)
      if (!node) continue
      node.x(clampToStage(t.posicion_x, maxX))
      node.y(clampToStage(t.posicion_y, maxY))
      node.rotation(t.rotacion)
    }
    layer.batchDraw()
  }

  /**
   * Pure read of the final sibling absolute positions/rotations at gesture end.
   * Returns [] when not fused or snapshot was cleared. Caller Object.assigns the
   * returned values to sibling Mesas in the store so the Save flow persists the
   * synced state.
   */
  function computeFinalSiblingTransforms(mesa: Mesa, layer: KonvaLikeLayer): SiblingTransform[] {
    if (!isParentDriver(mesa)) return []
    const snapshot = store.dragSnapshot
    if (!snapshot) return []

    const parentId = mesa.id
    const parentSnapshot = snapshot.get(parentId)
    if (!parentSnapshot) return []

    const parentNode = layer.findOne(`#${parentId}`)
    if (!parentNode) return []

    const siblingsBefore = siblingsFromSnapshot(parentId)
    if (siblingsBefore.length === 0) return []

    const parentBefore = {
      x: parentSnapshot.x,
      y: parentSnapshot.y,
      rotation: parentSnapshot.rotation,
      width: mesa.ancho,
      height: mesa.alto,
    }
    const parentAfter = {
      x: parentNode.x(),
      y: parentNode.y(),
      rotation: parentNode.rotation(),
    }
    return applyGroupTransformToSiblings(parentBefore, parentAfter, siblingsBefore)
  }

  /**
   * Programmatic 90° CW rigid rotation of an entire fused group, used by the
   * "Rotar 90°" button in /cocina/reservas (no active Konva gesture). Reads
   * the current member positions straight from the store (no snapshot needed),
   * delegates the math to `rotateGroupAroundCentroid90CW`, applies the result
   * to every live Konva node (parent + siblings) and re-draws. Returns the
   * same transforms so the caller can `Object.assign` them into the store
   * Mesas for later persistence.
   *
   * Guards: no-op for non-fused tables and for fusion children (only the
   * parent driver rotates the group from the toolbar button).
   */
  function rotateGroup90CW(mesa: Mesa, layer: KonvaLikeLayer): SiblingTransform[] {
    if (!isParentDriver(mesa)) return []

    const members = store.mesas.filter((m) => m.id_fusion === mesa.id_fusion)
    if (members.length === 0) return []

    const transforms = rotateGroupAroundCentroid90CW(members)

    const maxX = store.stageWidth - 50
    const maxY = store.stageHeight - 50
    const clamped: SiblingTransform[] = []
    for (const t of transforms) {
      const node = layer.findOne(`#${t.id}`)
      if (!node) continue
      const cx = clampToStage(t.posicion_x, maxX)
      const cy = clampToStage(t.posicion_y, maxY)
      node.x(cx)
      node.y(cy)
      node.rotation(t.rotacion)
      clamped.push({ id: t.id, posicion_x: cx, posicion_y: cy, rotacion: t.rotacion })
    }
    layer.batchDraw()
    return clamped
  }

  return {
    handleDragMove,
    handleTransform,
    computeFinalSiblingTransforms,
    rotateGroup90CW,
  }
}