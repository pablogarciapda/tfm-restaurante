<!--
  TableNode.vue — Single interactive table shape (MCA-005, AD-11)

  Props: mesa (Mesa), estado (MesaEstado), selected (boolean)
  Emits: click, dragend, transformend

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
import type { Mesa, MesaEstado, FormaMesa } from '#shared/contracts/mesas.contract'

const props = defineProps<{
  mesa: Mesa
  estado: MesaEstado
  selected: boolean
}>()

defineEmits<{
  click: []
  dragstart: []
  dragend: []
  transformend: []
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

// Centered text positions (relative to group origin)
const fontSizeNumero = 14
const fontSizePax = 11

// Text width depends on shape: for circle/ellipse use smaller max width
const textWidth = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') {
    return Math.min(props.mesa.ancho, props.mesa.alto)
  }
  return props.mesa.ancho
})

// Text Y offset for vertical centering within the shape
const textOffsetY = computed(() => {
  if (props.mesa.forma === 'redonda') {
    return props.mesa.ancho / 2 - 14
  }
  if (props.mesa.forma === 'ovalada') {
    return props.mesa.alto / 2 - 14
  }
  return props.mesa.alto / 2 - 14
})

const textPaxOffsetY = computed(() => {
  return textOffsetY.value + 16
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

    <!-- Mesa number -->
    <v-text
      :config="{
        x: 0,
        y: textOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: `Mesa ${mesa.numero_mesa}`,
        fontSize: fontSizeNumero,
        fontFamily: 'Inter, sans-serif',
        fill: '#2D3748',
        listening: false,
      }"
    />

    <!-- Capacidad -->
    <v-text
      :config="{
        x: 0,
        y: textPaxOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: `${mesa.capacidad_actual} pax`,
        fontSize: fontSizePax,
        fontFamily: 'Inter, sans-serif',
        fill: '#4A5568',
        listening: false,
      }"
    />
  </v-group>
</template>
