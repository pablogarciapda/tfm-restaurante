<!--
  TableNode.vue — Single interactive table shape with multi-line text overlay

  Props:
    mesa (Mesa), estado (MesaEstado), selected (boolean)
    reservasMap (optional) — mesa_id → client name for reserved tables
    fusionLabel (optional) — combined table numbers for fused groups

  Emits: click, dragend, transformstart, transformend

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
  dragmove: []
  dragend: []
  transformstart: []
  transform: []
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
  if (!props.turnoStatus) return 'none'

  const hasComida = props.turnoStatus.comida
  const hasCena = props.turnoStatus.cena
  const hasBoth = hasComida && hasCena

  if (hasBoth) return 'full' // Both turns → full red

  // 'todos' mode: show half overlay for whichever turn is reserved
  if (!props.activeTurno || props.activeTurno === 'todos') {
    if (hasComida) return 'half'
    if (hasCena) return 'half'
    return 'none'
  }

  if (props.activeTurno === 'comida') {
    if (hasComida) return 'half'
    return 'none'
  }

  if (props.activeTurno === 'cena') {
    if (hasCena) return 'half'
    return 'none'
  }

  return 'none'
})

/** Label to show on the colored half: 'M' for comida, 'T' for cena */
const turnLabel = computed<string | null>(() => {
  if (turnOverlay.value === 'none') return null
  if (turnOverlay.value === 'full') return 'M/T'
  if (props.activeTurno === 'comida') return 'M'
  if (props.activeTurno === 'cena') return 'T'
  // 'todos' mode: show label for whichever turn is reserved
  if (props.turnoStatus?.comida) return 'M'
  if (props.turnoStatus?.cena) return 'T'
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
//
// Single v-text node spanning both table-number and capacity/client-name
// lines, placed at the shape's GEOMETRIC CENTER in local group coordinates.
// offsetX/offsetY center the text box at that anchor. Counter-rotation
// (rotation: -mesa.rotacion) keeps text readable when the group rotates.

// Text width depends on shape: for circle/ellipse use smaller max width
const textWidth = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') {
    // Text must fit inside inscribed rectangle: diameter * 0.6
    return Math.min(props.mesa.ancho, props.mesa.alto) * 0.55
  }
  return props.mesa.ancho
})

/** Shape's geometric center in local group coordinates. */
const shapeCenter = computed(() => {
  if (props.mesa.forma === 'redonda' || props.mesa.forma === 'ovalada') {
    return { x: 0, y: 0 }
  }
  if (props.mesa.forma === 'cuadrada') {
    return { x: props.mesa.ancho / 2, y: props.mesa.ancho / 2 }
  }
  return { x: props.mesa.ancho / 2, y: props.mesa.alto / 2 }
})

const baseFontSize = computed(() => props.fontSize ?? 14)
const fontSizeLabel = computed(() => baseFontSize.value)       // 14 default

/** Number of text lines (1 for small tables, 2 otherwise). */
const lineCount = computed(() => isSmall.value ? 1 : 2)

/** offsetY to center the line block vertically at the anchor. */
const textOffsetY = computed(() => (baseFontSize.value * lineCount.value) / 2)

// ── Text content ──

// Single display text: "number\ncapacity" for normal tables, just "number" for small
const displayText = computed(() => {
  const number = props.fusionLabel || String(props.mesa.numero_mesa)
  if (isSmall.value) return number
  const capOrClient = props.estado === 'reservada' && props.reservasMap?.[props.mesa.id]
    ? props.reservasMap[props.mesa.id]
    : `${props.mesa.capacidad_base}p`
  return `${number}\n${capOrClient}`
})

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

// Group config with Konva-native event handlers (avoids Vue fragment inheritance issue)
const groupConfig = computed(() => ({
  id: props.mesa.id,
  x: props.mesa.posicion_x,
  y: props.mesa.posicion_y,
  rotation: props.mesa.rotacion,
  draggable: true, // Always draggable (Transformer only in diseño mode)
  dragBoundFunc: props.dragBoundFunc,
  onClick: (e: any) => emit('click', e?.evt),
  onDragStart: () => emit('dragstart'),
  onDragMove: () => emit('dragmove'),
  onDragEnd: () => emit('dragend'),
  onTransformStart: () => emit('transformstart'),
  onTransform: () => emit('transform'),
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
        rotation: -mesa.rotacion,
      }"
    />

    <!-- Single label (number + capacity via \n), at shape center, offset-centered, counter-rotated -->
    <v-text
      :config="{
        x: shapeCenter.x,
        y: shapeCenter.y,
        offsetX: textWidth / 2,
        offsetY: textOffsetY,
        width: textWidth,
        align: 'center',
        verticalAlign: 'middle',
        text: displayText,
        fontSize: baseFontSize,
        fontStyle: 'bold',
        fontFamily: 'Inter, sans-serif',
        fill: '#2D3748',
        listening: false,
        rotation: -mesa.rotacion,
      }"
    />
  </v-group>
</template>
