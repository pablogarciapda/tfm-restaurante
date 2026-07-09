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
import { onMounted, ref, computed } from 'vue'
import type KonvaType from 'konva'
import {
  Stage as VStage,
  Layer as VLayer,
  Transformer as VTransformer,
} from 'vue-konva'
import { useCanvasStore } from '../stores/canvas-store'
import { useMesas } from '../composables/useMesas'
import ZoneSection from './ZoneSection.vue'
import TableNode from './TableNode.vue'
import TableTooltip from './TableTooltip.vue'
import type { TooltipData } from './TableTooltip.vue'
import type { Mesa, Zona } from '#shared/contracts/mesas.contract'
import { getMesaEstado } from '#shared/utils/fusion-math'

export interface ReservaDetail {
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
}

const props = defineProps<{
  reservas?: { mesa_id: string | null; estado: string; fecha_hora: string }[]
  reservasMap?: Record<string, string>
  fusionLabels?: Record<string, string>
  reservasDetailMap?: Record<string, ReservaDetail>
}>()

const ZONES: { zona: Zona; x: number; y: number; w: number; h: number }[] = [
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

const store = useCanvasStore()
const { updateMesa } = useMesas()

/** Zone sections filtered by activeZona ('' = all zones) */
const filteredZones = computed(() => {
  if (store.activeZona === '') return ZONES
  return ZONES.filter((z) => z.zona === store.activeZona)
})

const transformerRef = ref()
const mainLayerRef = ref()
const dragLayerRef = ref()

// mesaEstado derived from today's reservas (MCA-005)
// Defaults to 'libre' when no reservas data is loaded
function mesaEstado(mesa: Mesa): 'libre' | 'ocupada' | 'reservada' {
  return getMesaEstado(mesa, props.reservas ?? [])
}

// ── Tooltip state (MCA-009) ──

const hoveredMesaId = ref<string | null>(null)
const TOOLTIP_WIDTH = 260
const TOOLTIP_GAP = 12
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

// ── Drag bounds (MCA-004) — wired via TableNode group config ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function dragBoundFunc(pos: { x: number; y: number }) {
  return {
    x: Math.max(0, Math.min(pos.x, store.stageWidth - 50)),
    y: Math.max(0, Math.min(pos.y, store.stageHeight - 50)),
  }
}

// ── Transformer update (AD-10) ──
function updateTransformer() {
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  if (store.selectedMesaId) {
    const stage = transformer.getStage()
    const selectedNode = stage?.findOne(`#${store.selectedMesaId}`)
    if (selectedNode) {
      transformer.nodes([selectedNode])
    }
  } else {
    transformer.nodes([])
  }
  transformer.getLayer()?.batchDraw()
}

// ── Event handlers ──

function handleTableClick(mesa: Mesa) {
  store.selectMesa(mesa.id)
  updateTransformer()
}

function handleStageMouseDown() {
  store.clearSelection()
  updateTransformer()
}

/** Drag end: move shape back to main layer + persist position */
function handleDragEnd(mesa: Mesa) {
  // Move back to main layer
  const mainLayer = mainLayerRef.value?.getNode()
  const dragLayer = dragLayerRef.value?.getNode()
  if (mainLayer && dragLayer) {
    const node = dragLayer.findOne(`#${mesa.id}`)
    if (node) {
      node.moveTo(mainLayer)
      mainLayer.batchDraw()
    }
  }

  // Persist position
  updateMesa(mesa.id, {
    posicion_x: mesa.posicion_x,
    posicion_y: mesa.posicion_y,
  } as Partial<Mesa>)
}

/** Drag start: move shape to drag layer for isolation performance */
function handleDragStart(mesa: Mesa) {
  const mainLayer = mainLayerRef.value?.getNode()
  const dragLayer = dragLayerRef.value?.getNode()
  if (mainLayer && dragLayer) {
    const node = mainLayer.findOne(`#${mesa.id}`)
    if (node) {
      node.moveTo(dragLayer)
      dragLayer.batchDraw()
    }
  }
}

/** Transform end: apply scale to dimensions (AD-10) + persist */
function handleTransformEnd(mesaId: string) {
  const mainLayer = mainLayerRef.value?.getNode()
  if (!mainLayer) return

  const group = mainLayer.findOne(`#${mesaId}`)
  if (!group) return

  // Konva Transformer changes scaleX/scaleY, NOT width/height
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  // Apply scale to the inner rect
  const rect = group.findOne('Rect')
  if (rect) {
    rect.width(rect.width() * scaleX)
    rect.height(rect.height() * scaleY)
  }

  // Reset scale on the group
  group.scaleX(1)
  group.scaleY(1)

  // Get new values after scale reset
  const mesa = store.mesas.find((m) => m.id === mesaId)
  if (!mesa) return

  const newWidth = rect ? rect.width() : mesa.ancho
  const newHeight = rect ? rect.height() : mesa.alto
  const newRotation = group.rotation()

  // Persist
  updateMesa(mesaId, {
    ancho: newWidth,
    alto: newHeight,
    rotacion: newRotation,
    posicion_x: group.x(),
    posicion_y: group.y(),
  } as Partial<Mesa>)

  mainLayer.batchDraw()
}

// ── Performance: limit pixel ratio per AD-02 ──
onMounted(async () => {
  const Konva = (await import('konva')).default as typeof KonvaType
  Konva.pixelRatio = window.devicePixelRatio > 2 ? 2 : 1
})
</script>

<template>
  <div id="mesas-canvas" class="relative overflow-visible">
    <v-stage
      :config="{ width: store.stageWidth, height: store.stageHeight }"
      @mousedown="handleStageMouseDown"
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
          :selected="store.selectedMesaId === mesa.id"
          :reservas-map="reservasMap"
          :fusion-label="fusionLabels?.[mesa.id]"
          @click="handleTableClick(mesa)"
          @dragstart="handleDragStart(mesa)"
          @dragend="handleDragEnd(mesa)"
          @transformend="() => handleTransformEnd(mesa.id)"
          @hover="handleTableHover(mesa)"
          @unhover="handleTableUnhover"
        />

        <v-transformer
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

      <!-- ============================================================ -->
      <!-- Layer 3: Drag — temporary holder during drag operations      -->
      <!-- ============================================================ -->
      <v-layer ref="dragLayerRef" :config="{ name: 'drag-layer' }" />
    </v-stage>

    <!-- ============================================================ -->
    <!-- Tooltip overlay — HTML card positioned above canvas           -->
    <!-- ============================================================ -->
    <Transition name="tooltip-fade">
      <div
        v-if="tooltipData"
        class="absolute z-50"
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
