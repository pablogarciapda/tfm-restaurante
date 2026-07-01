<!--
  TableCanvas.vue — Main Konva canvas with 3-layer architecture (MCA-001, AD-02)

  3-layer structure:
    1. Background layer (listening:false, cached) — ZoneSection components
    2. Main layer (interactive) — TableNode components + Transformer
    3. Drag layer — empty, receives dragged shapes for performance

  Stage config from Pinia canvas store.
  On-demand vue-konva imports per AD-01.
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import type KonvaType from 'konva'
import {
  Stage as VStage,
  Layer as VLayer,
  Transformer as VTransformer,
} from 'vue-konva'
import { useCanvasStore } from '../stores/canvas-store'
import ZoneSection from './ZoneSection.vue'
import TableNode from './TableNode.vue'
import type { Mesa, Zona } from '~/shared/contracts/mesas.contract'

const ZONES: { zona: Zona; x: number; y: number; w: number; h: number }[] = [
  { zona: 'Principal', x: 20, y: 20, w: 380, h: 370 },
  { zona: 'Zingaro', x: 420, y: 20, w: 370, h: 370 },
  { zona: 'Privado', x: 20, y: 410, w: 380, h: 370 },
  { zona: 'Terraza', x: 420, y: 410, w: 370, h: 370 },
  { zona: 'Bar', x: 810, y: 20, w: 370, h: 760 },
]

const store = useCanvasStore()

// mesaEstado for each mesa — in Slice 2, default to 'libre' since
// reservas lookup is wired in later slices with realtime data
function mesaEstado(_mesa: Mesa): 'libre' | 'ocupada' | 'reservada' {
  // Placeholder: real reservas JOIN is wired in Slice 4
  return 'libre'
}

// ── Performance: limit pixel ratio per AD-02 ──
onMounted(async () => {
  const Konva = (await import('konva')).default as typeof KonvaType
  Konva.pixelRatio = window.devicePixelRatio > 2 ? 2 : 1
})
</script>

<template>
  <div id="mesas-canvas">
    <v-stage :config="{ width: store.stageWidth, height: store.stageHeight }">
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
      <v-layer>
        <TableNode
          v-for="mesa in store.mesas"
          :key="mesa.id"
          :mesa="mesa"
          :estado="mesaEstado(mesa)"
          :selected="store.selectedMesaId === mesa.id"
          @click="store.selectMesa(mesa.id)"
        />

        <v-transformer
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
      <v-layer :config="{ name: 'drag-layer' }" />
    </v-stage>
  </div>
</template>
