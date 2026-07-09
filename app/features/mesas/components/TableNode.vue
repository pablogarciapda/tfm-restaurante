<!--
  TableNode.vue — Single interactive table shape with multi-line text overlay

  Props:
    mesa (Mesa), estado (MesaEstado), selected (boolean)
    reservasMap (optional) — mesa_id → client name for reserved tables
    fusionLabel (optional) — combined table numbers for fused groups

  Emits: click, dragend, transformend

  Text overlay layout:
    Top line: numero_mesa (bold, fontSize 16) — or fusionLabel if fused
    Bottom line: capacidad_base formatted as "4p" — or client name if reserved
    Small tables (ancho < 60 or alto < 60): only show numero_mesa

  Status colors:
    libre=#22C55E, ocupada=#EF4444, reservada=#F59E0B
  Selected: terracotta #C67B5C
  Fused tables: strokeDash=[5,5]
-->
<script setup lang="ts">
import { computed } from 'vue'
import {
  Rect as VRect,
  Circle as VCircle,
  Ellipse as VEllipse,
  Text as VText,
  Group as VGroup,
} from 'vue-konva'
import type { Mesa, MesaEstado } from '#shared/contracts/mesas.contract'

const props = defineProps<{
  mesa: Mesa
  estado: MesaEstado
  selected: boolean
  reservasMap?: Record<string, string>
  fusionLabel?: string
}>()

defineEmits<{
  click: []
  dragstart: []
  dragend: []
  transformend: []
  hover: []
  unhover: []
}>()

const STATUS_COLORS: Record<MesaEstado, string> = {
  libre: '#22C55E',
  ocupada: '#EF4444',
  reservada: '#F59E0B',
}

const fillColor = computed(() => {
  if (props.selected) return '#C67B5C'
  return STATUS_COLORS[props.estado]
})

const isFused = computed(() => props.mesa.id_fusion !== null)
const isSmall = computed(() => props.mesa.ancho < 60 || props.mesa.alto < 60)

// Shape-specific configs
const shapeConfig = computed(() => {
  const base = {
    fill: fillColor.value,
    stroke: '#2D3748',
    strokeWidth: 2,
    shadowBlur: 4,
    perfectDrawEnabled: false,
    strokeDash: isFused.value ? [5, 5] : undefined,
  }

  switch (props.mesa.forma) {
    case 'redonda':
      return { ...base, radius: props.mesa.ancho / 2 }
    case 'ovalada':
      return {
        ...base,
        radiusX: props.mesa.ancho / 2,
        radiusY: props.mesa.alto / 2,
      }
    case 'cuadrada':
      return {
        ...base,
        width: props.mesa.ancho,
        height: props.mesa.ancho, // force square
        cornerRadius: 4,
      }
    default: // 'rectangular'
      return {
        ...base,
        width: props.mesa.ancho,
        height: props.mesa.alto,
        cornerRadius: 8,
      }
  }
})

// ── Text overlay positioning ──

// Text width depends on shape: for circle/ellipse use smaller max width
const textWidth = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') {
    return Math.min(props.mesa.ancho, props.mesa.alto)
  }
  return props.mesa.ancho
})

// Vertical center of the shape (accounts for shape type)
const centerY = computed(() => {
  if (props.mesa.forma === 'redonda') return props.mesa.ancho / 2
  if (props.mesa.forma === 'ovalada' || props.mesa.forma === 'cuadrada') return props.mesa.ancho / 2
  return props.mesa.alto / 2
})

// Top text Y offset: center two-line block or single line for small tables
const textOffsetY = computed(() => {
  if (isSmall.value) {
    return centerY.value - 8  // single 16px line centered vertically
  }
  const blockHeight = 16 + 2 + 11  // fontSizeNumero + gap + fontSizePax
  return centerY.value - blockHeight / 2
})

// Bottom text Y offset (only used when !isSmall)
const paxOffsetY = computed(() => textOffsetY.value + 16 + 2)  // after number + gap

// ── Text content ──

// Show fusion label (e.g. "1/2") for fused tables, else just the table number
const displayNumber = computed(() => props.fusionLabel || String(props.mesa.numero_mesa))

// Show client name when reserved, else capacity formatted as "4p"
const bottomText = computed(() => {
  if (props.estado === 'reservada' && props.reservasMap?.[props.mesa.id]) {
    return props.reservasMap[props.mesa.id]
  }
  return `${props.mesa.capacidad_base}p`
})
</script>

<template>
  <v-group
    :config="{
      id: mesa.id,
      x: mesa.posicion_x,
      y: mesa.posicion_y,
      rotation: mesa.rotacion,
      draggable: true,
    }"
    @click="$emit('click')"
    @dragstart="$emit('dragstart')"
    @dragend="$emit('dragend')"
    @transformend="$emit('transformend')"
    @mouseenter="$emit('hover')"
    @mouseleave="$emit('unhover')"
  >
    <!-- Table shape: conditional rendering -->
    <v-circle
      v-if="mesa.forma === 'redonda'"
      :config="shapeConfig"
    />
    <v-ellipse
      v-else-if="mesa.forma === 'ovalada'"
      :config="shapeConfig"
    />
    <v-rect
      v-else
      :config="shapeConfig"
    />

    <!-- Mesa number — bold, centered, larger font -->
    <v-text
      :config="{
        x: 0,
        y: textOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: displayNumber,
        fontSize: 16,
        fontStyle: 'bold',
        fontFamily: 'Inter, sans-serif',
        fill: '#2D3748',
        listening: false,
      }"
    />

    <!-- Capacity or client name (hidden for small tables) -->
    <v-text
      v-if="!isSmall"
      :config="{
        x: 0,
        y: paxOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: bottomText,
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        fill: '#4A5568',
        listening: false,
      }"
    />
  </v-group>
</template>
