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
import { Rect as VRect, Text as VText, Group as VGroup } from 'vue-konva'
import type { Mesa, MesaEstado } from '#shared/contracts/mesas.contract'

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

// Centered text positions (relative to group origin)
const fontSizeNumero = 14
const fontSizePax = 11
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
    <!-- Table rectangle -->
    <v-rect
      :config="{
        width: mesa.ancho,
        height: mesa.alto,
        fill: fillColor,
        stroke: '#2D3748',
        strokeWidth: 2,
        cornerRadius: 8,
        shadowBlur: 4,
        perfectDrawEnabled: false,
        strokeDash: isFused ? [5, 5] : undefined,
      }"
    />

    <!-- Mesa number -->
    <v-text
      :config="{
        x: 0,
        y: mesa.alto / 2 - 14,
        width: mesa.ancho,
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
        y: mesa.alto / 2 + 2,
        width: mesa.ancho,
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
