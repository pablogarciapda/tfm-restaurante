/**
 * canvas-store.ts — Pinia store for the Konva table manager (AD-03)
 *
 * Holds canvas state: mesas[], selectedMesaId, dragging flag,
 * and stage dimensions. Replaces useState for interactive editor needs
 * (devtools, fusion mode, multi-select — AD-03 rationale).
 *
 * Spec refs: MCA-001, MCA-003
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Mesa, Zona } from '#shared/contracts/mesas.contract'

/** Active turn filter for table coloring */
export type TurnoFilter = 'todos' | 'comida' | 'cena'

export const useCanvasStore = defineStore('canvas', () => {
  // ── State ──

  const mesas = ref<Mesa[]>([])
  const selectedMesaId = ref<string | null>(null)
  const isDragging = ref(false)
  const stageWidth = ref(1200)
  const stageHeight = ref(800)
  /** Active zone filter: '' means all zones, otherwise zone name */
  const activeZona = ref<string>('')
  /** Active turn filter for table coloring: 'todos' | 'comida' | 'cena' */
  const activeTurno = ref<TurnoFilter>('todos')

  // ── Getters ──

  /** Full selected Mesa object, or null if nothing selected */
  const selectedMesa = computed<Mesa | null>(() => {
    if (selectedMesaId.value === null) return null
    return mesas.value.find((m) => m.id === selectedMesaId.value) ?? null
  })

  /** Filter mesas by zone (returns a function to preserve reactive context) */
  function mesasByZona(zona: Zona): Mesa[] {
    return mesas.value.filter((m) => m.zona === zona)
  }

  /** Mesas filtered by activeZona ('' = all) */
  const filteredMesas = computed<Mesa[]>(() => {
    if (activeZona.value === '') return mesas.value
    return mesas.value.filter((m) => m.zona === activeZona.value)
  })

  /** Only root mesas (mesa_padre_id IS NULL) — not children of fused groups */
  const parentMesas = computed<Mesa[]>(() => {
    return mesas.value.filter((m) => m.mesa_padre_id === null)
  })

  // ── Actions ──

  /** Replace entire mesas array (e.g. after fetch) */
  function setMesas(newMesas: Mesa[]) {
    mesas.value = newMesas
  }

  /** Append a single mesa to the state */
  function addMesa(mesa: Mesa) {
    mesas.value.push(mesa)
  }

  /** Patch an existing mesa by id (shallow merge) */
  function updateMesa(id: string, data: Partial<Mesa>) {
    const index = mesas.value.findIndex((m) => m.id === id)
    if (index === -1) return
    mesas.value[index] = { ...mesas.value[index]!, ...data }
  }

  /** Remove a mesa by id */
  function deleteMesa(id: string) {
    mesas.value = mesas.value.filter((m) => m.id !== id)
    if (selectedMesaId.value === id) {
      selectedMesaId.value = null
    }
  }

  /** Set the selected mesa by id */
  function selectMesa(id: string) {
    selectedMesaId.value = id
  }

  /** Deselect any selected mesa */
  function clearSelection() {
    selectedMesaId.value = null
  }

  return {
    // State
    mesas,
    selectedMesaId,
    isDragging,
    stageWidth,
    stageHeight,
    activeZona,
    activeTurno,
    // Getters
    selectedMesa,
    mesasByZona,
    parentMesas,
    filteredMesas,
    // Actions
    setMesas,
    addMesa,
    updateMesa,
    deleteMesa,
    selectMesa,
    clearSelection,
  }
})
