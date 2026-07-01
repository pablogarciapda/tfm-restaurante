/**
 * TDD: RED → GREEN → TRIANGULATE — Canvas store (AD-03)
 *
 * Pinia store for the Konva table manager state:
 * mesas[], selectedMesaId, isDragging, stageWidth/Height.
 *
 * Spec refs: MCA-001, MCA-003, AD-03
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '../../../app/features/mesas/stores/canvas-store'
import type { Mesa } from '../../../shared/contracts/mesas.contract'

// --- Helpers ---

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
    mesa_padre_id: null,
    id_fusion: null,
    capacidad_actual: 4,
    created_at: '2026-06-30T10:00:00.000Z',
    updated_at: '2026-06-30T10:00:00.000Z',
    ...overrides,
  }
}

function mesaA() { return makeMesa({ id: 'a', numero_mesa: 1, zona: 'Principal', capacidad_actual: 4 }) }
function mesaB() { return makeMesa({ id: 'b', numero_mesa: 2, zona: 'Zingaro', capacidad_actual: 2 }) }
function mesaC() { return makeMesa({ id: 'c', numero_mesa: 3, zona: 'Principal', mesa_padre_id: 'a', id_fusion: 'g1' }) }

// ============================================================================
// Canvas Store Tests (MCA-001, AD-03)
// ============================================================================

describe('useCanvasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── Initial State ──

  it('has empty mesas array initially', () => {
    const store = useCanvasStore()
    expect(store.mesas).toEqual([])
  })

  it('has null selectedMesaId initially', () => {
    const store = useCanvasStore()
    expect(store.selectedMesaId).toBeNull()
  })

  it('has isDragging false initially', () => {
    const store = useCanvasStore()
    expect(store.isDragging).toBe(false)
  })

  it('has default stage dimensions', () => {
    const store = useCanvasStore()
    expect(store.stageWidth).toBeGreaterThan(0)
    expect(store.stageHeight).toBeGreaterThan(0)
  })

  // ── setMesas ──

  it('setMesas replaces the mesas array', () => {
    const store = useCanvasStore()
    const mesas = [mesaA(), mesaB()]
    store.setMesas(mesas)
    expect(store.mesas).toHaveLength(2)
    expect(store.mesas[0].id).toBe('a')
  })

  it('setMesas with empty array clears state', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.setMesas([])
    expect(store.mesas).toEqual([])
  })

  // ── addMesa ──

  it('addMesa appends a new mesa to the array', () => {
    const store = useCanvasStore()
    store.addMesa(mesaA())
    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('a')
  })

  it('addMesa works with multiple calls', () => {
    const store = useCanvasStore()
    store.addMesa(mesaA())
    store.addMesa(mesaB())
    expect(store.mesas).toHaveLength(2)
  })

  // ── updateMesa ──

  it('updateMesa patches an existing mesa by id', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.updateMesa('a', { posicion_x: 200, posicion_y: 150 })
    expect(store.mesas[0].posicion_x).toBe(200)
    expect(store.mesas[0].posicion_y).toBe(150)
    // Unchanged fields preserved
    expect(store.mesas[0].numero_mesa).toBe(1)
  })

  it('updateMesa does nothing for non-existent id', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.updateMesa('nonexistent', { posicion_x: 999 })
    expect(store.mesas[0].posicion_x).toBe(0)
  })

  // ── deleteMesa ──

  it('deleteMesa removes a mesa by id', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA(), mesaB()])
    store.deleteMesa('a')
    expect(store.mesas).toHaveLength(1)
    expect(store.mesas[0].id).toBe('b')
  })

  it('deleteMesa is a no-op when id not found', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.deleteMesa('nonexistent')
    expect(store.mesas).toHaveLength(1)
  })

  it('deleteMesa clears selection if selected mesa is deleted', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA(), mesaB()])
    store.selectMesa('a')
    store.deleteMesa('a')
    expect(store.selectedMesaId).toBeNull()
  })

  // ── selectMesa / clearSelection ──

  it('selectMesa sets the selectedMesaId', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.selectMesa('a')
    expect(store.selectedMesaId).toBe('a')
  })

  it('clearSelection sets selectedMesaId to null', () => {
    const store = useCanvasStore()
    store.selectMesa('a')
    store.clearSelection()
    expect(store.selectedMesaId).toBeNull()
  })

  it('selectMesa overwrites previous selection', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA(), mesaB()])
    store.selectMesa('a')
    store.selectMesa('b')
    expect(store.selectedMesaId).toBe('b')
  })

  // ── selectedMesa getter ──

  it('selectedMesa returns the full Mesa object when selected', () => {
    const store = useCanvasStore()
    const base = mesaA()
    store.setMesas([base])
    store.selectMesa('a')
    const result = store.selectedMesa
    expect(result).not.toBeNull()
    expect(result!.id).toBe('a')
    expect(result!.numero_mesa).toBe(1)
  })

  it('selectedMesa returns null when nothing selected', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    expect(store.selectedMesa).toBeNull()
  })

  it('selectedMesa returns null when selected id not in mesas', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    store.selectMesa('ghost')
    expect(store.selectedMesa).toBeNull()
  })

  // ── mesasByZona getter ──

  it('mesasByZona filters mesas by zone', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA(), mesaB()])
    const principal = store.mesasByZona('Principal')
    expect(principal).toHaveLength(1)
    expect(principal[0].id).toBe('a')
  })

  it('mesasByZona returns empty array for zone with no mesas', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA()])
    expect(store.mesasByZona('Terraza')).toEqual([])
  })

  // ── parentMesas getter ──

  it('parentMesas returns only root mesas (mesa_padre_id IS NULL)', () => {
    const store = useCanvasStore()
    store.setMesas([mesaA(), mesaB(), mesaC()])
    const parents = store.parentMesas
    expect(parents).toHaveLength(2)
    expect(parents.map(m => m.id).sort()).toEqual(['a', 'b'])
  })

  it('parentMesas returns empty array when all are children', () => {
    const store = useCanvasStore()
    store.setMesas([mesaC()])
    expect(store.parentMesas).toEqual([])
  })

  // ── isDragging ──

  it('isDragging can be toggled', () => {
    const store = useCanvasStore()
    store.isDragging = true
    expect(store.isDragging).toBe(true)
    store.isDragging = false
    expect(store.isDragging).toBe(false)
  })
})
