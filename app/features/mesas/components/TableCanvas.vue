<!--
  TableCanvas.vue — Main Konva canvas with 3-layer architecture (MCA-001, AD-02)

  3-layer structure:
    1. Background layer (listening:false, cached) — ZoneSection components
    2. Main layer (interactive) — TableNode components + Transformer
    3. Drag layer — empty, receives dragged shapes for performance

  Stage config from Pinia canvas store.
  On-demand vue-konva imports per AD-01.
  Slice 3: drag & drop, Transformer resize/rotate, selection (MCA-004, AD-10).
-->
<script setup lang="ts">
import { onMounted, nextTick, ref, computed, watch } from 'vue'
import type KonvaType from 'konva'
import {
  Stage as VStage,
  Layer as VLayer,
  Transformer as VTransformer,
  Line as VLine,
} from 'vue-konva'
import { useCanvasStore, type TurnoFilter } from '../stores/canvas-store'
import { useMesas } from '../composables/useMesas'
import { useFusionGroupDrag } from '../composables/useFusionGroupDrag'
import ZoneSection from './ZoneSection.vue'
import TableNode from './TableNode.vue'
import TableTooltip from './TableTooltip.vue'
import type { TooltipData } from './TableTooltip.vue'
import type { Mesa, Zona } from '#shared/contracts/mesas.contract'
import type { HorarioConfig } from '#shared/contracts/reservation.contract'
import { calcularEstadoMesa, buildTurnoWindows, type MesaEstadoContext } from '#shared/utils/mesa-estado'

export interface ReservaDetail {
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
}

function toMinutes(h: string): number {
  const [hours, minutes] = h.split(':').map(Number)
  return hours! * 60 + minutes!
}

const props = defineProps<{
  reservas?: { mesa_id: string | null; estado: string; fecha_hora: string }[]
  reservasMap?: Record<string, string>
  fusionLabels?: Record<string, string>
  reservasDetailMap?: Record<string, ReservaDetail>
  horariosConfig?: HorarioConfig | null
  /** Zone configuration from DB: { id, nombre, capacidad, imagen_url? }[] */
  zonasConfig?: Array<{ id: string; nombre: string; imagen_url?: string | null }>
  designMode?: boolean
  /** Single zone mode: active zone fills the full stage (used in design page) */
  singleZone?: boolean
  fontSize?: number
  selectedIds?: string[]
  /** Selected date for "current service" matching in YYYY-MM-DD format.
   *  Defaults to today's ISO date. Drives MCA-005 mesa estado derivation. */
  selectedDate?: string
}>()

const emit = defineEmits<{
  'table-click-reservation': [mesa: Mesa]
  'table-select': [mesa: Mesa]
}>()

const BASE_WIDTH = 1200
const BASE_HEIGHT = 800

const ZONE_DEFS: { zona: Zona; x: number; y: number; w: number; h: number }[] = [
  { zona: 'Principal', x: 20, y: 20, w: 380, h: 370 },
  { zona: 'Zingaro', x: 420, y: 20, w: 370, h: 370 },
  { zona: 'Privado', x: 20, y: 410, w: 380, h: 370 },
  { zona: 'Terraza', x: 420, y: 410, w: 370, h: 370 },
  { zona: 'Bar', x: 810, y: 20, w: 370, h: 760 },
]

const ZONE_COLORS: Record<string, string> = {
  Principal: '#E8D5C4',
  Zingaro: '#D4C5B9',
  Privado: '#C9BFB0',
  Terraza: '#B8C9B0',
  Bar: '#C4B8D0',
}

/** Build a map of zona nombre → imageUrl from zonasConfig */
const zoneImageMap = computed(() => {
  const map: Record<string, string | null | undefined> = {}
  for (const z of props.zonasConfig ?? []) {
    map[z.nombre] = z.imagen_url
  }
  return map
})

/** Build a map of zona nombre → image scale (zoom) */
const zoneImageScaleMap = computed(() => {
  const map: Record<string, number> = {}
  for (const z of props.zonasConfig ?? []) {
    map[z.nombre] = (z as any).imagen_scale ?? 1
  }
  return map
})

const store = useCanvasStore()
const { updateMesa } = useMesas()
const fusionDrag = useFusionGroupDrag(store)

/** Scale factors for proportional zones (Bug 3 fix) */
const stageScaleX = computed(() => store.stageWidth / BASE_WIDTH)
const stageScaleY = computed(() => store.stageHeight / BASE_HEIGHT)

/** Zone sections filtered by activeZona.
 *  - singleZone mode: active zone fills the full stage (0,0 → stageWidth,stageHeight)
 *  - Normal mode: zones positioned from ZONE_DEFS, scaled to stage size
 */
const filteredZones = computed(() => {
  if (props.singleZone && store.activeZona) {
    // Single zone fills the entire canvas at (0,0)
    return [{
      zona: store.activeZona,
      x: 0,
      y: 0,
      w: store.stageWidth,
      h: store.stageHeight,
    }]
  }
  // Multi-zone mode (or "Todas") — scale from ZONE_DEFS
  const baseZones = store.activeZona === '' ? ZONE_DEFS : ZONE_DEFS.filter((z) => z.zona === store.activeZona)
  const sx = stageScaleX.value
  const sy = stageScaleY.value
  return baseZones.map((z) => ({
    zona: z.zona,
    x: Math.round(z.x * sx),
    y: Math.round(z.y * sy),
    w: Math.round(z.w * sx),
    h: Math.round(z.h * sy),
  }))
})

/**
 * Per-mesa turn reservation status.
 * Returns a map of mesa_id → { comida: boolean, cena: boolean }
 * based on reservas that fall within the configured turn time windows.
 */
const mesaTurnoStatus = computed(() => {
  const status: Record<string, { comida: boolean; cena: boolean }> = {}
  for (const mesa of store.filteredMesas) {
    status[mesa.id] = { comida: false, cena: false }
  }

  const config = props.horariosConfig
  if (!config) return status

  const todayStr = new Date().toISOString().slice(0, 10)
  const comidaStart = toMinutes(config.comida_inicio)
  const comidaEnd = toMinutes(config.comida_fin)
  const cenaStart = toMinutes(config.cena_inicio)
  const cenaEnd = toMinutes(config.cena_fin)

  for (const r of props.reservas ?? []) {
    if (!r.mesa_id) continue
    if (!r.fecha_hora.startsWith(todayStr)) continue
    const hora = r.fecha_hora.split('T')[1]?.slice(0, 5)
    if (!hora) continue
    const mins = toMinutes(hora)

    if (mins >= comidaStart && mins < comidaEnd) {
      const s = status[r.mesa_id]
      if (s) s.comida = true
    }
    // Handle cena that may cross midnight
    if (cenaEnd <= cenaStart) {
      // Crosses midnight: [cenaStart, 24:00) OR [00:00, cenaEnd)
      if (mins >= cenaStart && mins < 1440) {
        const s = status[r.mesa_id]
        if (s) s.cena = true
      } else if (mins >= 0 && mins < cenaEnd) {
        const s = status[r.mesa_id]
        if (s) s.cena = true
      }
    } else {
      if (mins >= cenaStart && mins < cenaEnd) {
        const s = status[r.mesa_id]
        if (s) s.cena = true
      }
    }
  }

  return status
})

const transformerRef = ref()
const mainLayerRef = ref()
const canvasContainer = ref<HTMLDivElement | null>(null)
const isDrawingLine = ref(false)
const currentLinePoints = ref<number[]>([])
/** Anchor point for straight line start (click-to-click mode) */
const lineStart = ref({ x: 0, y: 0 })

// mesaEstado derived from reservas + selected date + active turn (MCA-005).
// Pure derivation via calcularEstadoMesa — reactive to reservas / turnos /
// selectedDate / activeTurno changes; real-time updates flow through the
// reservas array prop and trigger Vue recompute automatically.
const FALLBACK_HORARIOS: HorarioConfig = {
  comida_inicio: '13:30',
  comida_fin: '15:30',
  cena_inicio: '21:00',
  cena_fin: '23:30',
  intervalo_minutos: 15,
}

const mesaEstadoContext = computed<MesaEstadoContext>(() => {
  const h = props.horariosConfig ?? FALLBACK_HORARIOS
  return {
    selectedDate: props.selectedDate ?? new Date().toISOString().slice(0, 10),
    currentTurn: store.activeTurno,
    turnos: buildTurnoWindows(h),
  }
})

function mesaEstado(mesa: Mesa): 'libre' | 'ocupada' | 'reservada' {
  return calcularEstadoMesa(mesa.id, props.reservas ?? [], mesaEstadoContext.value)
}

// ── Tooltip state (MCA-009) ──

const hoveredMesaId = ref<string | null>(null)
const TOOLTIP_WIDTH = 260
const TOOLTIP_GAP = 24
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

/** Derive full tooltip data from hovered mesa + related data */
const tooltipData = computed<TooltipData | null>(() => {
  if (!hoveredMesaId.value) return null
  const mesa = store.mesas.find((m) => m.id === hoveredMesaId.value)
  if (!mesa) return null

  const estado = mesaEstado(mesa)

  // Lookup reservation details for reserved tables
  let reserva: TooltipData['reserva'] = undefined
  if (estado === 'reservada') {
    const detail = props.reservasDetailMap?.[mesa.id]
    if (detail) {
      reserva = {
        nombre_cliente: detail.nombre_cliente,
        hora: new Date(detail.fecha_hora).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        comensales: detail.numero_comensales,
      }
    }
  }

  // Gather fusion group mesa numbers
  let fusionMesas: number[] | undefined
  let fusionCapacidad: number | undefined
  if (mesa.id_fusion) {
    const group = store.mesas.filter((m) => m.id_fusion === mesa.id_fusion)
    fusionMesas = group.map((m) => m.numero_mesa).sort((a, b) => a - b)
    fusionCapacidad = mesa.capacidad_actual
  }

  return { mesa, estado, reserva, fusionMesas, fusionCapacidad }
})

/** Compute tooltip position: prefer right, fall back to left, then above */
const tooltipPosition = computed(() => {
  if (!hoveredMesaId.value) return { left: 0, top: 0, side: 'right' as const }
  const mesa = store.mesas.find((m) => m.id === hoveredMesaId.value)
  if (!mesa) return { left: 0, top: 0, side: 'right' as const }

  const x = mesa.posicion_x
  const y = mesa.posicion_y
  const w = mesa.ancho

  // Try right side first
  if (x + w + TOOLTIP_WIDTH + TOOLTIP_GAP <= store.stageWidth) {
    return { left: x + w + TOOLTIP_GAP, top: y, side: 'right' as const }
  }
  // Try left side
  if (x - TOOLTIP_WIDTH - TOOLTIP_GAP >= 0) {
    return { left: x - TOOLTIP_WIDTH - TOOLTIP_GAP, top: y, side: 'left' as const }
  }
  // Fall back to above, centered
  return {
    left: Math.max(4, Math.min(x + w / 2 - TOOLTIP_WIDTH / 2, store.stageWidth - TOOLTIP_WIDTH - 4)),
    top: Math.max(4, y - 200 - TOOLTIP_GAP),
    side: 'top' as const,
  }
})

const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.left}px`,
  top: `${tooltipPosition.value.top}px`,
}))

// ── Hover handlers with grace period for tooltip readability ──

function handleTableHover(mesa: Mesa) {
  if (store.isDragging) return
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = null
  hoveredMesaId.value = mesa.id
}

function handleTableUnhover() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  // Small delay so tooltip doesn't flicker when moving between shapes
  hoverTimeout = setTimeout(() => {
    hoveredMesaId.value = null
  }, 150)
}

function handleTooltipMouseEnter() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = null
  // Keep tooltip visible while mouse is over it
}

function handleTooltipMouseLeave() {
  hoveredMesaId.value = null
}

/**
 * All mesa IDs in the same fusion group as the currently selected mesa.
 * When a fused table is selected, ALL tables in that fusion group highlight.
 */
const fusionGroupSelectedIds = computed(() => {
  const selected = store.selectedMesa
  if (!selected?.id_fusion) return new Set<string>()
  return new Set(
    store.mesas
      .filter((m) => m.id_fusion === selected.id_fusion)
      .map((m) => m.id),
  )
})

// ── Drag bounds (MCA-004) — wired via TableNode group config ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function dragBoundFunc(pos: { x: number; y: number }) {
  return {
    x: Math.max(0, Math.min(pos.x, store.stageWidth - 50)),
    y: Math.max(0, Math.min(pos.y, store.stageHeight - 50)),
  }
}

// ── Transformer update (AD-10) ──
async function updateTransformer() {
  // Wait for Vue to render the updated component tree
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  if (store.selectedMesaId) {
    const stage = transformer.getStage()
    const selectedNode = stage?.findOne(`#${store.selectedMesaId}`)
    if (selectedNode) {
      transformer.nodes([selectedNode])
      transformer.getLayer()?.batchDraw()
      return
    }
  }
  transformer.nodes([])
  transformer.getLayer()?.batchDraw()
}

// ── Event handlers ──

function handleTableClick(mesa: Mesa, _e?: MouseEvent) {
  // If table is part of a fusion group, select the parent table
  // so ALL members of the fusion group get highlighted
  let targetMesa = mesa
  if (mesa.id_fusion) {
    const parent = store.mesas.find(
      (m) => m.id_fusion === mesa.id_fusion && m.mesa_padre_id === m.id,
    )
    if (parent) targetMesa = parent
  }

  if (props.designMode === true) {
    store.selectMesa(targetMesa.id)
    updateTransformer()
  } else {
    store.selectMesa(targetMesa.id)
    emit('table-click-reservation', targetMesa)
  }
}

function handleStageMouseDown(e: any) {
  // Drawing mode: start a new line on stage background click
  if (props.designMode && store.isDrawing) {
    const stage = e.target.getStage()
    // Only draw when clicking on the stage background, not on shapes
    if (e.target === stage) {
      const pos = stage?.getPointerPosition()
      if (!pos) return

      if (store.straightLine) {
        // ── Straight line mode: click-to-click ──
        if (isDrawingLine.value) {
          // Second click: finish the straight line
          currentLinePoints.value = [lineStart.value.x, lineStart.value.y, pos.x, pos.y]
          if (currentLinePoints.value.length >= 4) {
            store.addWallLine([...currentLinePoints.value])
          }
          isDrawingLine.value = false
          currentLinePoints.value = []
        } else {
          // First click: start drawing — record anchor point
          lineStart.value = { x: pos.x, y: pos.y }
          currentLinePoints.value = [pos.x, pos.y, pos.x, pos.y]
          isDrawingLine.value = true
        }
      } else {
        // ── Freehand mode: press-drag-release ──
        currentLinePoints.value = [pos.x, pos.y]
        isDrawingLine.value = true
      }
    }
    return
  }

  // Normal deselection behavior
  if (props.designMode === true) {
    store.clearSelection()
    updateTransformer()
  }
}

function handleStageMouseMove(e: any) {
  if (!isDrawingLine.value) return
  const stage = e.target.getStage()
  const pos = stage?.getPointerPosition()
  if (!pos) return

  if (store.straightLine) {
    // Straight line: only update the endpoint (preview from anchor to cursor)
    currentLinePoints.value = [lineStart.value.x, lineStart.value.y, pos.x, pos.y]
  } else {
    // Freehand: append all mouse movements
    currentLinePoints.value = [...currentLinePoints.value, pos.x, pos.y]
  }
}

function handleStageMouseUp() {
  if (!isDrawingLine.value) return

  if (store.straightLine) {
    // In straight line mode, line only finishes on second click, not on mouse up
    return
  }

  // Freehand: finish on mouse up
  isDrawingLine.value = false
  if (currentLinePoints.value.length >= 4) {
    store.addWallLine([...currentLinePoints.value])
  }
  currentLinePoints.value = []
}

/** Drag start: record state so Tooltip stays hidden during drag */
function handleDragStart(_mesa: Mesa) {
  store.isDragging = true
  if (_mesa.id_fusion) {
    store.beginFusionDrag(_mesa)
  }
}

/** Drag end: Konva handles visual. Position saved on explicit "Guardar" button. */
function handleDragEnd(_mesa: Mesa) {
  store.isDragging = false
  store.endFusionDrag()
}

/**
 * DragMove: imperatively translate fused siblings so the group stays rigid.
 * No-op for non-fused tables or children (only the parent drives the sync).
 */
function handleDragMove(mesa: Mesa) {
  if (!mesa.id_fusion) return
  const layer = mainLayerRef.value?.getNode()
  if (!layer) return
  fusionDrag.handleDragMove(mesa, layer)
}

/**
 * TransformStart: capture the fused-group snapshot so the rigid-body math in
 * useFusionGroupDrag.handleTransform has the pre-gesture positions. Without this,
 * Konva's Transformer fires `transform` events on the parent node, but the
 * composable's `handleTransform` returns early when `dragSnapshot` is null,
 * so siblings keep their original positions and DO NOT rotate with the parent
 * (bug: "se gira solo una mesa de las dos").
 */
function handleTransformStart(mesa: Mesa) {
  if (mesa.id_fusion) {
    store.beginFusionDrag(mesa)
  }
}

/**
 * Transform (live): imperatively rotate+translate fused siblings so the group
 * stays rigid during the gesture. No-op for non-fused tables or children.
 */
function handleTransform(mesa: Mesa) {
  if (!mesa.id_fusion) return
  const layer = mainLayerRef.value?.getNode()
  if (!layer) return
  fusionDrag.handleTransform(mesa, layer)
}

/** Transform end: apply scale to dimensions (AD-10) + persist.
 *  All return paths call `store.endFusionDrag()` so the snapshot captured at
 *  `transformstart` (via handleTransformStart) is guaranteed to be cleared,
 *  even when the layer/node lookup fails mid-gesture. `endFusionDrag` is
 *  idempotent (sets `dragSnapshot = null`), so calling it when the snapshot
 *  was never populated (non-fused table) is a safe no-op.
 */
function handleTransformEnd(mesaId: string) {
  const mainLayer = mainLayerRef.value?.getNode()
  if (!mainLayer) {
    store.endFusionDrag()
    return
  }

  const group = mainLayer.findOne(`#${mesaId}`)
  if (!group) {
    store.endFusionDrag()
    return
  }

  // Konva Transformer changes scaleX/scaleY, NOT width/height
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  // Apply scale to the inner shape
  const rect = group.findOne('Rect')
  const circle = group.findOne('Circle')
  const ellipse = group.findOne('Ellipse')
  if (rect) {
    rect.width(rect.width() * scaleX)
    rect.height(rect.height() * scaleY)
  }
  if (circle) {
    circle.radius(circle.radius() * Math.max(scaleX, scaleY))
  }
  if (ellipse) {
    ellipse.radiusX(ellipse.radiusX() * scaleX)
    ellipse.radiusY(ellipse.radiusY() * scaleY)
  }

  // Reset scale on the group
  group.scaleX(1)
  group.scaleY(1)

  // Get new values after scale reset
  const mesa = store.mesas.find((m) => m.id === mesaId)
  if (!mesa) {
    store.endFusionDrag()
    return
  }

  const newWidth = (rect ? rect.width() : circle ? circle.radius() * 2 : ellipse ? ellipse.radiusX() * 2 : mesa.ancho)
  const newHeight = (rect ? rect.height() : circle ? circle.radius() * 2 : ellipse ? ellipse.radiusY() * 2 : mesa.alto)
  const newRotation = group.rotation()

  // Mutate in-place (no store.updateMesa = no Vue re-render = no ghost)
  mesa.ancho = newWidth
  mesa.alto = newHeight
  mesa.rotacion = newRotation
  mesa.posicion_x = Math.round(group.x())
  mesa.posicion_y = Math.round(group.y())

  // Fused group: Object.assign siblings with the synced absolute coords so
  // the Save loop in /cocina/diseno persists the rigid-group state. Use the
  // snapshot BEFORE clearing it.
  if (mesa.id_fusion && mesa.mesa_padre_id === mesa.id) {
    const siblingTransforms = fusionDrag.computeFinalSiblingTransforms(mesa, mainLayer)
    for (const t of siblingTransforms) {
      const sibling = store.mesas.find((m) => m.id === t.id)
      if (sibling) {
        Object.assign(sibling, {
          posicion_x: t.posicion_x,
          posicion_y: t.posicion_y,
          rotacion: t.rotacion,
        })
      }
    }
  }

  store.endFusionDrag()
}

// ── Canvas sizing: fill available width (Bug 3 fix) ──

/** Recalculate stage size from container width, keeping 3:2 aspect ratio */
function updateCanvasSize() {
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  if (rect.width <= 0) return
  const newWidth = Math.floor(rect.width)
  const ratioHeight = Math.floor(newWidth / (BASE_WIDTH / BASE_HEIGHT))
  // In singleZone mode, use at least 1200px height for scrollable design
  const minH = props.singleZone ? 1200 : 400
  // Operation mode: grow the stage to fit every visible mesa so none are
  // clipped by the stage boundary (the parent container scrolls if needed).
  let tablesHeight = 0
  if (!props.singleZone) {
    const mesas = store.filteredMesas
    if (mesas.length) {
      tablesHeight =
        Math.max(
          ...mesas.map(
            (m) => Number(m.posicion_y ?? 0) + Number(m.alto ?? 0),
          ),
        ) + 80
    }
  }
  const newHeight = Math.max(minH, ratioHeight, tablesHeight)
  store.stageWidth = newWidth
  store.stageHeight = newHeight
}

// ── Performance: limit pixel ratio per AD-02 + dynamic sizing ──
onMounted(async () => {
  // Set initial canvas size
  updateCanvasSize()

  // Watch for container resize to keep canvas responsive
  if (typeof ResizeObserver !== 'undefined' && canvasContainer.value) {
    const observer = new ResizeObserver(() => { updateCanvasSize() })
    observer.observe(canvasContainer.value)
  }

  const Konva = (await import('konva')).default as typeof KonvaType
  Konva.pixelRatio = window.devicePixelRatio > 2 ? 2 : 1
})

// Recompute stage height when the active zone changes (different set of tables)
watch(() => store.filteredMesas, () => { updateCanvasSize() })

// Expose: allow parent to read actual Konva node positions
function getMesaPositions(): Record<string, { x: number; y: number; rotation: number }> {
  const positions: Record<string, { x: number; y: number; rotation: number }> = {}
  const layer = mainLayerRef.value?.getNode()
  if (!layer) return positions
  for (const mesa of store.filteredMesas) {
    const node = layer.findOne(`#${mesa.id}`)
    if (node) {
      positions[mesa.id] = {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        rotation: Math.round(node.rotation()),
      }
    }
  }
  return positions
}
defineExpose({ getMesaPositions })
</script>

<template>
  <div ref="canvasContainer" id="mesas-canvas" class="relative overflow-visible">
    <v-stage
      :config="{ width: store.stageWidth, height: store.stageHeight }"
      @mousedown="handleStageMouseDown"
      @mousemove="handleStageMouseMove"
      @mouseup="handleStageMouseUp"
    >
      <!-- ============================================================ -->
      <!-- Layer 1: Background — static zones, no events, cached       -->
      <!-- ============================================================ -->
      <v-layer :config="{ listening: false }">
        <ZoneSection
          v-for="zone in filteredZones"
          :key="zone.zona"
          :zona="zone.zona"
          :x="zone.x"
          :y="zone.y"
          :width="zone.w"
          :height="zone.h"
          :zone-color="ZONE_COLORS[zone.zona]"
          :image-url="zoneImageMap[zone.zona]"
          :image-scale="zoneImageScaleMap[zone.zona]"
        />
      </v-layer>

      <!-- ============================================================ -->
      <!-- Layer: Walls — static wall/line drawings (design mode only) -->
      <!-- ============================================================ -->
      <v-layer :config="{ listening: false }" :key="'wall-layer'">
        <v-line
          v-for="(line, i) in store.wallLines"
          :key="'wall-' + i"
          :config="{
            points: line.points,
            stroke: '#666',
            strokeWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.5,
          }"
        />
        <!-- Current line being drawn (preview) -->
        <v-line
          v-if="isDrawingLine"
          :config="{
            points: currentLinePoints,
            stroke: '#666',
            strokeWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.5,
          }"
        />
      </v-layer>

      <!-- ============================================================ -->
      <!-- Layer 2: Main — interactive tables + Transformer             -->
      <!-- ============================================================ -->
      <v-layer ref="mainLayerRef">
        <TableNode
          v-for="mesa in store.filteredMesas"
          :key="mesa.id"
          :mesa="mesa"
          :estado="mesaEstado(mesa)"
          :selected="store.selectedMesaId === mesa.id || (selectedIds?.includes(mesa.id) ?? false) || fusionGroupSelectedIds.has(mesa.id)"
          :design-mode="designMode === true"
          :reservas-map="reservasMap"
          :fusion-label="fusionLabels?.[mesa.id]"
          :turno-status="mesaTurnoStatus[mesa.id]"
          :active-turno="store.activeTurno"
          :font-size="fontSize"
          :drag-bound-func="dragBoundFunc"
          @click="handleTableClick(mesa)"
          @dragstart="handleDragStart(mesa)"
          @dragmove="handleDragMove(mesa)"
          @dragend="handleDragEnd(mesa)"
          @transformstart="handleTransformStart(mesa)"
          @transform="handleTransform(mesa)"
          @transformend="designMode === true && handleTransformEnd(mesa.id)"
          @hover="handleTableHover(mesa)"
          @unhover="handleTableUnhover"
        />

        <v-transformer
          v-if="designMode === true"
          ref="transformerRef"
          :config="{
            rotateAnchorOffset: 30,
            borderStroke: '#C67B5C',
            anchorStroke: '#C67B5C',
            anchorFill: '#FFFFFF',
            anchorSize: 8,
            rotationSnaps: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345],
            rotationSnapTolerance: 5,
            boundBoxFunc: (_oldBox: { width: number; height: number }, newBox: { width: number; height: number }) => {
              if (newBox.width < 40 || newBox.height < 40) return { ..._oldBox }
              return newBox
            },
          }"
        />
      </v-layer>
    </v-stage>

    <!-- ============================================================ -->
    <!-- Tooltip overlay — HTML card positioned above canvas           -->
    <!-- ============================================================ -->
    <Transition name="tooltip-fade">
      <div
        v-if="tooltipData"
        class="pointer-events-none absolute z-50"
        :style="tooltipStyle"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        <!-- Arrow pointing to the table -->
        <div
          class="absolute z-10 h-3 w-3 rotate-45 bg-white"
          :class="{
            '-left-1.5 top-4 border-b border-l border-gray-200': tooltipPosition.side === 'right',
            '-right-1.5 top-4 border-t border-r border-gray-200': tooltipPosition.side === 'left',
            'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r border-gray-200': tooltipPosition.side === 'top',
          }"
        />
        <!-- Card -->
        <TableTooltip :data="tooltipData" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
