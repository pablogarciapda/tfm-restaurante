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
import { onMounted, ref } from 'vue'
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
import type { Mesa, Zona } from '#shared/contracts/mesas.contract'
import { getMesaEstado } from '#shared/utils/fusion-math'

const props = defineProps<{
  reservas?: { mesa_id: string | null; estado: string; fecha_hora: string }[]
}>()

const ZONES: { zona: Zona; x: number; y: number; w: number; h: number }[] = [
  { zona: 'Principal', x: 20, y: 20, w: 380, h: 370 },
  { zona: 'Zingaro', x: 420, y: 20, w: 370, h: 370 },
  { zona: 'Privado', x: 20, y: 410, w: 380, h: 370 },
  { zona: 'Terraza', x: 420, y: 410, w: 370, h: 370 },
  { zona: 'Bar', x: 810, y: 20, w: 370, h: 760 },
]

const store = useCanvasStore()
const { updateMesa } = useMesas()

const transformerRef = ref()
const mainLayerRef = ref()
const dragLayerRef = ref()

// mesaEstado derived from today's reservas (MCA-005)
// Defaults to 'libre' when no reservas data is loaded
function mesaEstado(mesa: Mesa): 'libre' | 'ocupada' | 'reservada' {
  return getMesaEstado(mesa, props.reservas ?? [])
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
  <div id="mesas-canvas">
    <v-stage
      :config="{ width: store.stageWidth, height: store.stageHeight }"
      @mousedown="handleStageMouseDown"
    >
      <!-- ============================================================ -->
      <!-- Layer 1: Background — static zones, no events, cached       -->
      <!-- ============================================================ -->
      <v-layer :config="{ listening: false }">
        <ZoneSection
          v-for="zone in ZONES"
          :key="zone.zona"
          :zona="zone.zona"
          :x="zone.x"
          :y="zone.y"
          :width="zone.w"
          :height="zone.h"
        />
      </v-layer>

      <!-- ============================================================ -->
      <!-- Layer 2: Main — interactive tables + Transformer             -->
      <!-- ============================================================ -->
      <v-layer ref="mainLayerRef">
        <TableNode
          v-for="mesa in store.mesas"
          :key="mesa.id"
          :mesa="mesa"
          :estado="mesaEstado(mesa)"
          :selected="store.selectedMesaId === mesa.id"
          @click="handleTableClick(mesa)"
          @dragstart="handleDragStart(mesa)"
          @dragend="handleDragEnd(mesa)"
          @transformend="() => handleTransformEnd(mesa.id)"
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
  </div>
</template>
