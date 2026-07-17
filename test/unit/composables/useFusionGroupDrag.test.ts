/**
 * TDD: RED → GREEN — useFusionGroupDrag composable
 *
 * Imperatively syncs fused siblings during drag/transform of the parent mesa
 * so the fusion group moves as a RIGID block. Pure-logic wrapper that takes a
 * Konva-like layer stub and delegates the math to applyGroupTransformToSiblings.
 *
 * Contract:
 *   handleDragMove(mesa, layer):
 *     - no-op when mesa.id_fusion is null OR store.dragSnapshot is null
 *     - no-op when mesa is a child (mesa.mesa_padre_id !== mesa.id)
 *     - reads current Konva parent x()/y() from layer.findOne('#'+mesa.id)
 *     - translates each sibling node synchronously by (dx, dy); rotation untouched
 *     - calls layer.batchDraw() once
 *   handleTransform(mesa, layer):
 *     - same guards
 *     - reads parent rotation() from layer node; computes applyGroupTransformToSiblings
 *     - sets each sibling node x()/y()/rotation() in-place
 *     - calls layer.batchDraw() once
 *   computeFinalSiblingTransforms(mesa, layer):
 *     - returns SiblingTransform[] (or [] when not fused/no snapshot) reflecting
 *       the absolute positions the siblings SHOULD have at gesture end. Used by
 *       handleTransformEnd to Object.assign each Mesa in the store for the Save flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '../../../app/features/mesas/stores/canvas-store'
import { useFusionGroupDrag } from '../../../app/features/mesas/composables/useFusionGroupDrag'
import type { Mesa } from '../../../shared/contracts/mesas.contract'

function makeMesa(overrides: Partial<Mesa> & { id: string }): Mesa {
  return {
    numero_mesa: 1,
    capacidad_base: 4,
    posicion_x: 0,
    posicion_y: 0,
    ancho: 100,
    alto: 100,
    rotacion: 0,
    zona: 'Principal',
    forma: 'rectangular',
    mesa_padre_id: null,
    id_fusion: null,
    capacidad_actual: 4,
    created_at: '2026-06-30T10:00:00.000Z',
    updated_at: '2026-06-30T10:00:00.000Z',
    ...overrides,
  }
}

// ── Konva-like stubs ──

interface StubNode {
  _id: string
  _x: number
  _y: number
  _rotation: number
  x: (v?: number) => number
  y: (v?: number) => number
  rotation: (v?: number) => number
  batchDraw: ReturnType<typeof vi.fn>
}

function makeStubNode(id: string, x: number, y: number, rotation = 0): StubNode {
  const node: StubNode = {
    _id: id, _x: x, _y: y, _rotation: rotation,
    x: vi.fn((v?: number) => {
      if (v !== undefined) node._x = v
      return node._x
    }),
    y: vi.fn((v?: number) => {
      if (v !== undefined) node._y = v
      return node._y
    }),
    rotation: vi.fn((v?: number) => {
      if (v !== undefined) node._rotation = v
      return node._rotation
    }),
    batchDraw: vi.fn(),
  } as unknown as StubNode
  return node
}

interface StubLayer {
  findOne: ReturnType<typeof vi.fn>
  batchDraw: ReturnType<typeof vi.fn>
}

function makeStubLayer(nodesById: Record<string, StubNode>): StubLayer {
  return {
    findOne: vi.fn((selector: string) => {
      const id = selector.startsWith('#') ? selector.slice(1) : selector
      return nodesById[id] ?? null
    }),
    batchDraw: vi.fn(),
  }
}

describe('useFusionGroupDrag', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function setupTwoTableFusion() {
    const store = useCanvasStore()
    const parent = makeMesa({
      id: 'parent', numero_mesa: 1,
      posicion_x: 100, posicion_y: 100,
      ancho: 100, alto: 100, rotacion: 0,
      id_fusion: 'gX', mesa_padre_id: 'parent', capacidad_actual: 6,
    })
    const child = makeMesa({
      id: 'child', numero_mesa: 2,
      posicion_x: 220, posicion_y: 100,
      ancho: 100, alto: 100, rotacion: 0,
      id_fusion: 'gX', mesa_padre_id: 'parent', capacidad_actual: 6,
    })
    store.setMesas([parent, child])
    return { store, parent, child }
  }

  // ── Guards ──

  it('handleDragMove is a no-op when mesa has no id_fusion', () => {
    const { store } = setupTwoTableFusion()
    const mesa = makeMesa({ id: 'lonely' })
    const childNode = makeStubNode('child', 220, 100)
    const layer = makeStubLayer({ child: childNode })

    const { handleDragMove } = useFusionGroupDrag(store)
    handleDragMove(mesa, layer)

    expect(childNode.x).not.toHaveBeenCalled()
  })

  it('handleDragMove is a no-op when store.dragSnapshot is null (gesture not started)', () => {
    const { store, parent } = setupTwoTableFusion()
    // No beginFusionDrag → snapshot null
    const childNode = makeStubNode('child', 220, 100)
    const layer = makeStubLayer({ child: childNode })

    const { handleDragMove } = useFusionGroupDrag(store)
    handleDragMove(parent, layer)

    expect(childNode.x).not.toHaveBeenCalled()
  })

  it('handleDragMove is a no-op when mesa is a child (not the parent driver)', () => {
    const { store, child, parent } = setupTwoTableFusion()
    store.beginFusionDrag(parent)
    const layer = makeStubLayer({})

    const { handleDragMove } = useFusionGroupDrag(store)
    handleDragMove(child, layer)

    expect(layer.findOne).not.toHaveBeenCalledWith('#child')
  })

  // ── DragMove translation ──

  it('handleDragMove translates sibling node by (dx, dy) from snapshot; rotation untouched', () => {
    const { store, parent } = setupTwoTableFusion()
    store.beginFusionDrag(parent)

    const parentNode = makeStubNode('parent', 150, 130) // dx=50, dy=30
    const childNode = makeStubNode('child', 220, 100)
    const layer = makeStubLayer({ parent: parentNode, child: childNode })

    const { handleDragMove } = useFusionGroupDrag(store)
    handleDragMove(parent, layer)

    // child new = snapshot(220,100) + (50, 30) = (270, 130)
    expect(childNode.x).toHaveBeenCalledWith(270)
    expect(childNode.y).toHaveBeenCalledWith(130)
    expect(childNode.rotation).not.toHaveBeenCalled()
    expect(layer.batchDraw).toHaveBeenCalledTimes(1)
  })

  it('handleDragMove clamps sibling position to (0, stageWidth-50)x(0, stageHeight-50)', () => {
    const { store, parent } = setupTwoTableFusion()
    store.beginFusionDrag(parent)

    // Parent dragged far beyond stage; parent itself bypasses clamp via dragBoundFunc,
    // but the computed dx may push siblings past the bound — clamp them.
    const stageW = store.stageWidth
    const stageH = store.stageHeight
    // place child at stage edge so dx pushes it over
    const childStart = makeMesa({
      id: 'child', posicion_x: stageW - 60, posicion_y: stageH - 60,
      ancho: 100, alto: 100, rotacion: 0,
      id_fusion: 'gX', mesa_padre_id: 'parent', capacidad_actual: 6,
    })
    store.setMesas([
      makeMesa({
        id: 'parent', posicion_x: 100, posicion_y: 100,
        ancho: 100, alto: 100, rotacion: 0,
        id_fusion: 'gX', mesa_padre_id: 'parent', capacidad_actual: 6,
      }),
      childStart,
    ])
    store.beginFusionDrag(store.mesas.find((m) => m.id === 'parent')!)

    const parentNode = makeStubNode('parent', 200, 200) // dx=100
    const childNode = makeStubNode('child', stageW - 60, stageH - 60)
    const layer = makeStubLayer({ parent: parentNode, child: childNode })

    const { handleDragMove } = useFusionGroupDrag(store)
    handleDragMove(store.mesas.find((m) => m.id === 'parent')!, layer)

    const expectedX = Math.max(0, Math.min(stageW - 60 + 100, stageW - 50))
    const expectedY = Math.max(0, Math.min(stageH - 60 + 100, stageH - 50))
    expect(childNode.x).toHaveBeenCalledWith(expectedX)
    expect(childNode.y).toHaveBeenCalledWith(expectedY)
  })

  // ── Transform rotation ──

  it('handleTransform rotates sibling around parent centroid and sets rotation', () => {
    const { store, parent } = setupTwoTableFusion()
    store.beginFusionDrag(parent)

    const parentNode = makeStubNode('parent', 100, 100, 90) // +90°
    const childNode = makeStubNode('child', 220, 100, 0)
    const layer = makeStubLayer({ parent: parentNode, child: childNode })

    const { handleTransform } = useFusionGroupDrag(store)
    handleTransform(parent, layer)

    // centroid P=(150,150); child at (220,100): offset (70, -50); rotate +90:
    // rotated = (70*cos90 - (-50)*sin90, 70*sin90 + (-50)*cos90) = (50, 70)
    // final = (150+50, 150+70) = (200, 220)
    expect(childNode.x).toHaveBeenCalledWith(200)
    expect(childNode.y).toHaveBeenCalledWith(220)
    expect(childNode.rotation).toHaveBeenCalledWith(90)
    expect(layer.batchDraw).toHaveBeenCalledTimes(1)
  })

  it('handleTransform is a no-op when dragSnapshot is null', () => {
    const { store, parent } = setupTwoTableFusion()
    const childNode = makeStubNode('child', 220, 100)
    const layer = makeStubLayer({ child: childNode })

    const { handleTransform } = useFusionGroupDrag(store)
    handleTransform(parent, layer)

    expect(childNode.x).not.toHaveBeenCalled()
    expect(layer.batchDraw).not.toHaveBeenCalled()
  })

  it('handleTransform rotates sibling when snapshot was initialized at transformstart WITHOUT any dragmove (bug regression)', () => {
    // Bug: handleDragStart was the only caller of beginFusionDrag, so a pure
    // rotation gesture (no drag) left the snapshot null and siblings never
    // rotated with the parent. The fix initializes the snapshot at
    // transformstart too. This test mirrors the existing rotation test but
    // explicitly documents that NO handleDragMove was called first.
    const { store, parent } = setupTwoTableFusion()
    // Snapshot initialized via transformstart (NOT dragstart).
    store.beginFusionDrag(parent)

    const parentNode = makeStubNode('parent', 100, 100, 90) // +90° rotation, NO translation
    const childNode = makeStubNode('child', 220, 100, 0)
    const layer = makeStubLayer({ parent: parentNode, child: childNode })

    const { handleTransform } = useFusionGroupDrag(store)
    handleTransform(parent, layer)

    // centroid P=(150,150); child at (220,100): offset (70, -50); rotate +90:
    // rotated = (70*cos90 - (-50)*sin90, 70*sin90 + (-50)*cos90) = (50, 70)
    // final = (150+50, 150+70) = (200, 220)
    expect(childNode.x).toHaveBeenCalledWith(200)
    expect(childNode.y).toHaveBeenCalledWith(220)
    expect(childNode.rotation).toHaveBeenCalledWith(90)
    expect(layer.batchDraw).toHaveBeenCalledTimes(1)
  })

  // ── computeFinalSiblingTransforms ──

  it('computeFinalSiblingTransforms returns [] when mesa is not fused', () => {
    const { store } = setupTwoTableFusion()
    const { computeFinalSiblingTransforms } = useFusionGroupDrag(store)
    const lonely = makeMesa({ id: 'lonely' })
    expect(computeFinalSiblingTransforms(lonely, makeStubLayer({}))).toEqual([])
  })

  it('computeFinalSiblingTransforms returns [] when dragSnapshot is null', () => {
    const { store, parent } = setupTwoTableFusion()
    // snapshot is null
    const { computeFinalSiblingTransforms } = useFusionGroupDrag(store)
    expect(computeFinalSiblingTransforms(parent, makeStubLayer({}))).toEqual([])
  })

  it('computeFinalSiblingTransforms returns new posicion_x/y/rotacion for each sibling at gesture end', () => {
    const { store, parent } = setupTwoTableFusion()
    store.beginFusionDrag(parent)

    const parentNode = makeStubNode('parent', 100, 100, 90) // +90°
    const childNode = makeStubNode('child', 220, 100, 0)
    const layer = makeStubLayer({ parent: parentNode, child: childNode })

    const { computeFinalSiblingTransforms } = useFusionGroupDrag(store)
    const result = computeFinalSiblingTransforms(parent, layer)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('child')
    expect(result[0].posicion_x).toBe(200)
    expect(result[0].posicion_y).toBe(220)
    expect(result[0].rotacion).toBe(90)
  })
})