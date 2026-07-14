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
  Wedge as VWedge,
  Text as VText,
  Group as VGroup,
} from 'vue-konva'
import type { Mesa, MesaEstado } from '#shared/contracts/mesas.contract'
import type { TurnoFilter } from '../stores/canvas-store'

const props = defineProps<{
  mesa: Mesa
  estado: MesaEstado
  selected: boolean
  designMode: boolean
  reservasMap?: Record<string, string>
  fusionLabel?: string
  turnoStatus?: { comida: boolean; cena: boolean }
  activeTurno?: TurnoFilter
  /** Bound function for Konva drag constraints (stage/zone limits) */
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number }
  fontSize?: number
}>()

const emit = defineEmits<{
  click: [e?: any]
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

// ── Turn visualization logic ──

/** Determine the turn overlay type for this mesa */
const turnOverlay = computed<'none' | 'half' | 'full'>(() => {
  if (!props.turnoStatus || !props.activeTurno || props.activeTurno === 'todos') {
    return 'none'
  }

  const hasComida = props.turnoStatus.comida
  const hasCena = props.turnoStatus.cena
  const hasBoth = hasComida && hasCena

  if (props.activeTurno === 'comida') {
    if (hasBoth) return 'full'
    if (hasComida) return 'half'
    return 'none'
  }

  if (props.activeTurno === 'cena') {
    if (hasBoth) return 'full'
    if (hasCena) return 'half'
    return 'none'
  }

  return 'none'
})

/** Label to show on the colored half: 'M' for comida, 'T' for cena */
const turnLabel = computed<string | null>(() => {
  if (turnOverlay.value === 'none') return null
  if (props.activeTurno === 'comida') return 'M'
  if (props.activeTurno === 'cena') return 'T'
  return null
})

/**
 * Override fill color when both turns are reserved.
 * For 'half' overlay, base stays green (overlay handles the red).
 */
const baseFillColor = computed(() => {
  if (props.selected) return '#C67B5C'
  if (turnOverlay.value === 'full') return '#EF4444'
  if (turnOverlay.value !== 'none') return '#22C55E' // green base for half overlay
  return STATUS_COLORS[props.estado]
})

const isFused = computed(() => props.mesa.id_fusion !== null)
const isSmall = computed(() => props.mesa.ancho < 60 || props.mesa.alto < 60)

// Shape-specific configs
const shapeConfig = computed(() => {
  const base = {
    fill: baseFillColor.value,
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
    // Text must fit inside inscribed rectangle: diameter * 0.6
    return Math.min(props.mesa.ancho, props.mesa.alto) * 0.55
  }
  return props.mesa.ancho
})

// Vertical center of the shape relative to Group origin
const centerY = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') return 0
  if (props.mesa.forma === 'cuadrada') return props.mesa.ancho / 2
  return props.mesa.alto / 2
})

const baseFontSize = computed(() => props.fontSize ?? 14)
const fontSizeNumero = computed(() => baseFontSize.value + 2)  // 16 default
const fontSizePax = computed(() => baseFontSize.value - 3)     // 11 default
const fontSizeLabel = computed(() => baseFontSize.value)       // 14 default

// Text X center position: differs by shape type
// Circles/ellipses: center at Group origin → offset left to center text box
// Rects: top-left at origin, full-width text box at x=0
const textX = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') return -textWidth.value / 2
  return 0
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

// ── Turn overlay configs ──

const OVERLAY_RED = '#EF4444'
const OVERLAY_OPACITY = 0.6

/** Rect overlay for rectangular/square tables (top half) */
const rectOverlayConfig = computed(() => ({
  x: 0,
  y: 0,
  width: props.mesa.ancho,
  height: (props.mesa.forma === 'cuadrada' ? props.mesa.ancho : props.mesa.alto) / 2,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/** Wedge overlay for round tables (left half) */
const roundOverlayConfig = computed(() => ({
  x: props.mesa.ancho / 2,
  y: props.mesa.ancho / 2,
  radius: props.mesa.ancho / 2,
  angle: 180,
  rotation: -90,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/** Rect overlay for oval tables (left half) */
const ovalOverlayConfig = computed(() => ({
  x: 0,
  y: 0,
  width: props.mesa.ancho / 2,
  height: props.mesa.alto,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * (x, y) center for the turn label on the colored half:
 * - Rect/square: center of top half at (ancho/2, alto/4)
 * - Round: center of left half at (ancho/4, ancho/2)
 * - Oval: center of left half at (ancho/4, alto/2)
 */
const turnLabelPos = computed(() => {
  if (props.mesa.forma === 'redonda') {
    return { x: props.mesa.ancho * 0.25, y: props.mesa.ancho * 0.5 }
  }
  if (props.mesa.forma === 'ovalada') {
    return { x: props.mesa.ancho * 0.25, y: props.mesa.alto * 0.5 }
  }
  // Rect / Square: center of top half
  const h = props.mesa.forma === 'cuadrada' ? props.mesa.ancho : props.mesa.alto
  return { x: props.mesa.ancho * 0.5, y: h * 0.25 }
})

// Show client name when reserved, else capacity formatted as "4p"
const bottomText = computed(() => {
  if (props.estado === 'reservada' && props.reservasMap?.[props.mesa.id]) {
    return props.reservasMap[props.mesa.id]
  }
  return `${props.mesa.capacidad_base}p`
})

// Group config with Konva-native event handlers (avoids Vue fragment inheritance issue)
const groupConfig = computed(() => ({
  id: props.mesa.id,
  x: props.mesa.posicion_x,
  y: props.mesa.posicion_y,
  rotation: props.mesa.rotacion,
  draggable: props.designMode,
  dragBoundFunc: props.dragBoundFunc,
  onClick: (e: any) => emit('click', e?.evt),
  onDragStart: () => emit('dragstart'),
  onDragEnd: () => emit('dragend'),
  onTransformEnd: () => emit('transformend'),
  onMouseEnter: () => emit('hover'),
  onMouseLeave: () => emit('unhover'),
}))
</script>

<template>
  <v-group :config="groupConfig">
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

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Turn visualization overlay (Comida/Cena half-fill)     -->
    <!-- ════════════════════════════════════════════════════════ -->

    <!-- Rect/square: top half overlay -->
    <v-rect
      v-if="turnOverlay === 'half' && (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada')"
      :config="rectOverlayConfig"
    />
    <!-- Round: wedge for left half -->
    <v-wedge
      v-else-if="turnOverlay === 'half' && mesa.forma === 'redonda'"
      :config="roundOverlayConfig"
    />
    <!-- Oval: left half rect overlay -->
    <v-rect
      v-else-if="turnOverlay === 'half' && mesa.forma === 'ovalada'"
      :config="ovalOverlayConfig"
    />

    <!-- Turn label ('M' for comida, 'T' for cena) on the colored half -->
    <v-text
      v-if="turnLabel && turnOverlay === 'half'"
      :config="{
        x: turnLabelPos.x,
        y: turnLabelPos.y,
        text: turnLabel,
        fontSize: fontSizeLabel,
        fontStyle: 'bold',
        fontFamily: 'Inter, sans-serif',
        fill: '#FFFFFF',
        listening: false,
        offsetX: 7,
        offsetY: 7,
      }"
    />

    <!-- Mesa number — bold, centered, larger font -->
    <v-text
      :config="{
        x: textX,
        y: textOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: displayNumber,
        fontSize: fontSizeNumero,
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
        x: textX,
        y: paxOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: bottomText,
        fontSize: fontSizePax,
        fontFamily: 'Inter, sans-serif',
        fill: '#4A5568',
        listening: false,
      }"
    />
  </v-group>
</template>
