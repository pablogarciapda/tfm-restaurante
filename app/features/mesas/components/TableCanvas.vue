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
import { toLocalDateString } from '#shared/utils/date'
import ZoneSection from './ZoneSection.vue'
import TableNode from './TableNode.vue'
import FusionGroupNode from './FusionGroupNode.vue'
import TableTooltip from './TableTooltip.vue'
import type { TooltipData } from './TableTooltip.vue'
import type { Mesa, Zona } from '#shared/contracts/mesas.contract'
import type { HorarioConfig } from '#shared/contracts/reservation.contract'
import { calcularEstadoMesa, buildTurnoWindows, type MesaEstadoContext } from '#shared/utils/mesa-estado'
import { rotateGroupAroundCentroid90CW } from '#shared/utils/fusion-math'

export interface ReservaDetail {
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  referencia: string
}

function toMinutes(h: string): number {
  const [hours, minutes] = h.split(':').map(Number)
  return hours! * 60 + minutes!
}

const props = defineProps<{
  reservas?: { mesa_id: string | null; estado: string; fecha_hora: string }[]
  reservasMap?: Record<string, string>
  fusionLabels?: Record<string, string>
  reservasDetailMap?: Record<string, ReservaDetail[]>
  horariosConfig?: HorarioConfig | null
  /** Zone configuration from DB: { id, nombre, capacidad, imagen_url? }[] */
  zonasConfig?: Array<{ id: string; nombre: string; imagen_url?: string | null }>
  designMode?: boolean
  /** Single zone mode: active zone fills the full stage (used in design page) */
  singleZone?: boolean
  fontSize?: number
  selectedIds?: string[]
  /** Show alignment grid overlay (diseño mode) */
  showGrid?: boolean
  /** Selected date for "current service" matching in YYYY-MM-DD format.
   *  Defaults to today's ISO date. Drives MCA-005 mesa estado derivation. */
  selectedDate?: string
  /** Canvas reference width (default: 1400) — used for zone scaling ratio */
  canvasAnchoBase?: number
  /** Canvas reference height (default: 900) — used for zone scaling ratio */
  canvasAltoBase?: number
}>()

const emit = defineEmits<{
  'table-click-reservation': [mesa: Mesa]
  'table-select': [mesa: Mesa]
}>()

/**
 * Reference canvas dimensions — used to scale ZONE_DEFS positions
 * relative to the actual stage size. Configurable via /api/diseno-config.
 */
const BASE_WIDTH = computed(() => props.canvasAnchoBase ?? 1400)
const BASE_HEIGHT = computed(() => props.canvasAltoBase ?? 900)

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

/** Grid spacing in pixels for alignment overlay */
const GRID_SIZE = 50

/** Generate grid line configs when showGrid is active */
const gridLineConfigs = computed(() => {
  if (!props.showGrid) return [] as Array<{ points: number[]; stroke: string; strokeWidth: number }>
  const configs: Array<{ points: number[]; stroke: string; strokeWidth: number }> = []
  const w = store.stageWidth
  const h = store.stageHeight
  const color = '#D1D5DB' // gray-300
  const majorColor = '#9CA3AF' // gray-400

  // Vertical lines (every GRID_SIZE)
  for (let x = GRID_SIZE; x < w; x += GRID_SIZE) {
    const isMajor = x % (GRID_SIZE * 5) === 0
    configs.push({ points: [x, 0, x, h], stroke: isMajor ? majorColor : color, strokeWidth: isMajor ? 1.5 : 0.5 })
  }
  // Horizontal lines (every GRID_SIZE)
  for (let y = GRID_SIZE; y < h; y += GRID_SIZE) {
    const isMajor = y % (GRID_SIZE * 5) === 0
    configs.push({ points: [0, y, w, y], stroke: isMajor ? majorColor : color, strokeWidth: isMajor ? 1.5 : 0.5 })
  }
  return configs
})

const store = useCanvasStore()
const { updateMesa } = useMesas()

// ── Computed: separate solo mesas from fusion groups ──

/** Mesas without fusion (id_fusion === null) — rendered individually as TableNode */
const soloMesas = computed(() => store.filteredMesas.filter((m) => m.id_fusion === null))

/**
 * Fusion groups — grouped by id_fusion, each rendered as a single FusionGroupNode block.
 * Only the parent mesa (mesa_padre_id === null) represents the group; children are nested
 * inside FusionGroupNode at positions relative to the parent.
 */
const fusionGroups = computed(() => {
  const groups: Array<{ parent: Mesa; members: Mesa[] }> = []
  const seen = new Set<string>()

  for (const m of store.filteredMesas) {
    if (!m.id_fusion) continue
    if (seen.has(m.id_fusion)) continue
    seen.add(m.id_fusion)

    const members = store.filteredMesas.filter((mm) => mm.id_fusion === m.id_fusion)
    const parent = members.find((mm) => mm.mesa_padre_id === null) ?? members[0]!
    groups.push({ parent, members })
  }

  return groups
})

/** Scale factors for proportional zones (Bug 3 fix) */
const stageScaleX = computed(() => store.stageWidth / BASE_WIDTH.value)
const stageScaleY = computed(() => store.stageHeight / BASE_HEIGHT.value)

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
 * based on reservas whose booking windows overlap the configured turn time windows.
 *
 * Uses 90 min (comida) / 120 min (cena) booking duration instead of
 * full-turn blocking. A reservation at 14:00 blocks until 15:30, not
 * until the end of the entire comida turn.
 */
const mesaTurnoStatus = computed(() => {
  const status: Record<string, { comida: boolean; cena: boolean }> = {}
  for (const mesa of store.filteredMesas) {
    status[mesa.id] = { comida: false, cena: false }
  }

  const config = props.horariosConfig
  if (!config) return status

  const todayStr = props.selectedDate ?? toLocalDateString()
  const comidaStart = toMinutes(config.comida_inicio)
  const comidaEnd = toMinutes(config.comida_fin)
  const cenaStart = toMinutes(config.cena_inicio)
  const cenaEnd = toMinutes(config.cena_fin)

  const EXCLUDED_ESTADOS = new Set(['cancelada', 'standby', 'completada'])

  for (const r of props.reservas ?? []) {
    if (!r.mesa_id) continue
    if (EXCLUDED_ESTADOS.has(r.estado)) continue
    const d = new Date(r.fecha_hora)
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (localDate !== todayStr) continue
    const mins = d.getHours() * 60 + d.getMinutes()

    // Determine which turn this reservation is in
    const isComida = mins >= comidaStart && mins < comidaEnd
    let isCena = false
    if (cenaEnd <= cenaStart) {
      isCena = mins >= cenaStart || mins < cenaEnd
    } else {
      isCena = mins >= cenaStart && mins < cenaEnd
    }

    // Check booking window overlap instead of full-turn membership
    if (isComida) {
      const resWin = { start: mins, end: mins + 90 } // 90 min default for comida
      const turnWin = { start: comidaStart, end: comidaEnd }
      if (resWin.start < turnWin.end && turnWin.start < resWin.end) {
        const s = status[r.mesa_id]
        if (s) s.comida = true
      }
    }
    if (isCena) {
      const resWin = { start: mins, end: mins + 120 } // 120 min default for cena
      const turnWin = { start: cenaStart, end: cenaEnd }
      if (resWin.start < turnWin.end && turnWin.start < resWin.end) {
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
    selectedDate: props.selectedDate ?? toLocalDateString(),
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

  // Lookup ALL reservations for this table with full details
  const detalles = props.reservasDetailMap?.[mesa.id]
  const reservas: TooltipData['reservas'] = []
  if (detalles && detalles.length > 0) {
    const h = props.horariosConfig
    const turnos = h ? buildTurnoWindows(h) : null
    for (const d of detalles) {
      const hora = new Date(d.fecha_hora).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const fecha = new Date(d.fecha_hora).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      // Determine turn (comida/cena) from the reservation time
      let turno: 'comida' | 'cena' = 'comida'
      if (turnos) {
        const mins = new Date(d.fecha_hora).getHours() * 60 + new Date(d.fecha_hora).getMinutes()
        if (mins >= turnos.cena.start || mins < turnos.comida.start) {
          turno = 'cena'
        }
      }
      reservas.push({
        nombre_cliente: d.nombre_cliente,
        hora,
        comensales: d.numero_comensales,
        referencia: d.referencia,
        fecha,
        turno,
      })
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

  return { mesa, estado, reservas: reservas.length > 0 ? reservas : undefined, fusionMesas, fusionCapacidad }
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
 * Set of mesa IDs that are selected (either directly or via multi-select).
 * Used for solo TableNode selection highlighting.
 */
const soloSelectedIds = computed(() => {
  const direct = store.selectedMesaId ? new Set([store.selectedMesaId]) : new Set<string>()
  for (const id of props.selectedIds ?? []) {
    direct.add(id)
  }
  return direct
})

/**
 * Check if a fusion group is selected (parent selected, or any member in selectedIds).
 */
function isFusionGroupSelected(members: Mesa[]): boolean {
  if (!store.selectedMesaId && (!props.selectedIds || props.selectedIds.length === 0)) return false
  return members.some(
    (m) => m.id === store.selectedMesaId || (props.selectedIds ?? []).includes(m.id),
  )
}

// ── Drag bounds (MCA-004) — wired via TableNode group config ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/** Snap drag position to integer pixels so tables align cleanly */
function dragBoundFunc(pos: { x: number; y: number }) {
  return {
    x: Math.round(Math.max(0, Math.min(pos.x, store.stageWidth - 50))),
    y: Math.round(Math.max(0, Math.min(pos.y, store.stageHeight - 50))),
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
    const selectedMesa = store.mesas.find((m) => m.id === store.selectedMesaId)
    // Fusion groups use fusion_ prefix for the outer group node
    const nodeId = selectedMesa?.id_fusion
      ? `fusion_${selectedMesa.id}`
      : store.selectedMesaId
    const selectedNode = stage?.findOne(`#${nodeId}`)
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
  // If mesa is a fusion child, find the parent (padre has mesa_padre_id === null).
  // FusionGroupNode already emits the parent on click, but guard for safety.
  let targetMesa = mesa
  if (mesa.id_fusion && mesa.mesa_padre_id !== null) {
    const parent = store.mesas.find(
      (m) => m.id_fusion === mesa.id_fusion && m.mesa_padre_id === null,
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

/** Drag start: record state so Tooltip stays hidden during drag (solo mesas only) */
function handleDragStart(_mesa: Mesa) {
  store.isDragging = true
}

/**
 * Drag end: sync solo mesa Konva node position back to the Pinia store.
 * Fusion groups are handled by FusionGroupNode → handleFusionGroupDragend.
 */
function handleDragEnd(mesa: Mesa) {
  store.isDragging = false
  const layer = mainLayerRef.value?.getNode()
  if (!layer) return
  const node = layer.findOne(`#${mesa.id}`)
  if (!node) return
  store.replaceMesa(mesa.id, {
    posicion_x: Math.round(node.x()),
    posicion_y: Math.round(node.y()),
    rotacion: Math.round(node.rotation()),
  } as Partial<Mesa>)
}

/**
 * Handle drag-end from FusionGroupNode: update ALL member positions in the store.
 * The outer group was moved as a single block — compute the delta and apply it
 * to every member so the store stays in sync with Konva.
 */
function handleFusionGroupDragend(parentMesa: Mesa) {
  store.isDragging = false

  // The delta from the group's previous position to the new position
  const oldParent = store.mesas.find((m) => m.id === parentMesa.id)
  if (!oldParent) return
  const dx = parentMesa.posicion_x - oldParent.posicion_x
  const dy = parentMesa.posicion_y - oldParent.posicion_y
}

// ── Transform handlers (design mode solo mesas) ──
// FusionGroupNode handles its own transforms as a single block.

/** Transform end: apply scale to dimensions (AD-10) + persist for solo mesas. */
function handleTransformEnd(mesaId: string) {
  const mainLayer = mainLayerRef.value?.getNode()
  if (!mainLayer) return

  const group = mainLayer.findOne(`#${mesaId}`)
  if (!group) return

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
  if (!mesa) return

  const newWidth = (rect ? rect.width() : circle ? circle.radius() * 2 : ellipse ? ellipse.radiusX() * 2 : mesa.ancho)
  const newHeight = (rect ? rect.height() : circle ? circle.radius() * 2 : ellipse ? ellipse.radiusY() * 2 : mesa.alto)
  const newRotation = group.rotation()

  // Round to integer pixels (no fractional widths/heights)
  mesa.ancho = Math.round(newWidth)
  mesa.alto = Math.round(newHeight)
  mesa.rotacion = newRotation
  mesa.posicion_x = Math.round(group.x())
  mesa.posicion_y = Math.round(group.y())
}

// ── Canvas sizing: fill available width (Bug 3 fix) ──

/** Recalculate stage size from container width + mesa extents (MCA-001).
 *  The stage grows to fit all visible mesas, and the parent container
 *  provides scroll (both axes) when the stage exceeds the viewport.
 *  This enables horizontal/vertical content-area scroll on mobile. */
function updateCanvasSize() {
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  if (rect.width <= 0) return
  const containerW = Math.floor(rect.width)
  const ratioHeight = Math.floor(containerW / (BASE_WIDTH.value / BASE_HEIGHT.value))
  const minH = props.singleZone ? 1200 : 400

  let tablesWidth = 0
  let tablesHeight = 0

  if (!props.singleZone) {
    const mesas = store.filteredMesas
    if (mesas.length) {
      const xs = mesas.map((m) => Number(m.posicion_x ?? 0) + Number(m.ancho ?? 0))
      const ys = mesas.map((m) => Number(m.posicion_y ?? 0) + Number(m.alto ?? 0))
      tablesWidth = Math.max(...xs) + 80
      tablesHeight = Math.max(...ys) + 80
    }
  }

  // Stage respects:
  //  - container width (responsive, fills viewport)
  //  - table positions (grows to fit all mesas)
  //  - canvasAnchoBase / canvasAltoBase from config (user-defined minimum)
  store.stageWidth = Math.max(containerW, Math.ceil(tablesWidth), BASE_WIDTH.value)
  store.stageHeight = Math.max(minH, ratioHeight, tablesHeight, BASE_HEIGHT.value)
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
    if (mesa.id_fusion) {
      // Fused mesa: find the FusionGroupNode outer group, read position,
      // and compute absolute positions for ALL members of the group
      if (!positions[mesa.id]) {
        const parent = store.filteredMesas.find(
          (m) => m.id_fusion === mesa.id_fusion && m.mesa_padre_id === null,
        ) ?? mesa
        const groupNode = layer.findOne(`#fusion_${parent.id}`)
        if (groupNode) {
          const gx = Math.round(groupNode.x())
          const gy = Math.round(groupNode.y())
          const gr = Math.round(groupNode.rotation())
          // Compute absolute position for every member of this group
          for (const member of store.filteredMesas) {
            if (member.id_fusion === mesa.id_fusion) {
              const dx = member.posicion_x - parent.posicion_x
              const dy = member.posicion_y - parent.posicion_y
              positions[member.id] = { x: gx + dx, y: gy + dy, rotation: gr }
            }
          }
        }
      }
    } else {
      // Solo mesa: find its individual TableNode
      const node = layer.findOne(`#${mesa.id}`)
      if (node) {
        positions[mesa.id] = {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          rotation: Math.round(node.rotation()),
        }
      }
    }
  }
  return positions
}

/**
 * Rotate the selected fused group 90° CW as a rigid block (operation mode).
 * No-early-return guards: only a fused PARENT driver (id_fusion != null AND
 * mesa_padre_id === mesa.id) can drive the rotation from the toolbar button.
 *
 * After rotation, the parent + every sibling Mesa in the store is mutated in
 * place with the new absolute { posicion_x, posicion_y, rotacion } so the
 * 'Guardar' button can persist them. The user may click 'Rotar 90°' several
 * times before saving — positions persist only on Save.
 */
function rotateSelectedGroup90CW() {
  if (store.selectedMesaId === null) return
  const mesa = store.mesas.find((m) => m.id === store.selectedMesaId)
  if (!mesa) return
  if (!mesa.id_fusion || mesa.mesa_padre_id !== null) return

  const members = store.mesas.filter((m) => m.id_fusion === mesa.id_fusion)
  if (members.length === 0) return

  const transforms = rotateGroupAroundCentroid90CW(members)

  // Update store positions
  for (const t of transforms) {
    store.replaceMesa(t.id, {
      posicion_x: t.posicion_x,
      posicion_y: t.posicion_y,
      rotacion: t.rotacion,
    })
  }
}

/**
 * Return the ids of the parent + every sibling in the currently selected
 * fused group, or [] when nothing fused is selected. Used by the reservas
 * 'Guardar' button to know exactly which Mesas need persistence.
 */
function getSelectedMesaIds(): string[] {
  if (store.selectedMesaId === null) return []
  const mesa = store.mesas.find((m) => m.id === store.selectedMesaId)
  if (!mesa) return []
  // After AD-04 fix: parent has mesa_padre_id = null (not self-id).
  if (!mesa.id_fusion || mesa.mesa_padre_id !== null) return []
  return store.mesas
    .filter((m) => m.id_fusion === mesa.id_fusion)
    .map((m) => m.id)
}

defineExpose({ getMesaPositions, rotateSelectedGroup90CW, getSelectedMesaIds })
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
        <!-- Alignment grid (diseño mode) -->
        <v-line
          v-for="(line, i) in gridLineConfigs"
          :key="'grid-' + i"
          :config="line"
        />
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
      <!-- Layer 2: Main — solo tables + fusion groups + Transformer   -->
      <!-- ============================================================ -->
      <v-layer ref="mainLayerRef">
        <!-- Solo (non-fused) mesas — each is an independent TableNode -->
        <TableNode
          v-for="mesa in soloMesas"
          :key="mesa.id"
          :mesa="mesa"
          :estado="mesaEstado(mesa)"
          :selected="soloSelectedIds.has(mesa.id)"
          :design-mode="designMode === true"
          :reservas-map="reservasMap"
          :fusion-label="fusionLabels?.[mesa.id]"
          :turno-status="mesaTurnoStatus[mesa.id]"
          :active-turno="store.activeTurno"
          :font-size="fontSize"
          :drag-bound-func="dragBoundFunc"
          @click="handleTableClick(mesa)"
          @dragstart="handleDragStart(mesa)"
          @dragend="handleDragEnd(mesa)"
          @transformend="designMode === true && handleTransformEnd(mesa.id)"
          @hover="handleTableHover(mesa)"
          @unhover="handleTableUnhover"
        />

        <!-- Fusion groups — each is a single FusionGroupNode block -->
        <FusionGroupNode
          v-for="group in fusionGroups"
          :key="'fusion-' + group.parent.id"
          :parent-mesa="group.parent"
          :member-mesas="group.members"
          :fusion-label="fusionLabels?.[group.parent.id] ?? ''"
          :selected="isFusionGroupSelected(group.members)"
          :design-mode="designMode === true"
          :estado-map="Object.fromEntries(group.members.map(m => [m.id, mesaEstado(m)]))"
          :turno-status-map="Object.fromEntries(group.members.map(m => [m.id, mesaTurnoStatus[m.id] ?? { comida: false, cena: false }]))"
          :active-turno="store.activeTurno"
          :reservas-map="reservasMap"
          :font-size="fontSize"
          :drag-bound-func="dragBoundFunc"
          @click="handleTableClick($event)"
          @dragend="handleFusionGroupDragend($event)"
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
