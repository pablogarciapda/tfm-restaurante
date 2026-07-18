<!--
  TableNode.vue — Single interactive table shape with two-stack text overlay

  Props:
    mesa (Mesa), estado (MesaEstado), selected (boolean)
    reservasMap (optional) — mesa_id → client name for reserved tables
    fusionLabel (optional) — combined table numbers for fused groups

  Emits: click, dragend, transformstart, transformend

  Text overlay (two stacked v-text nodes):
    Top:    numero_mesa (2× fontSize, bold) — or fusionLabel if fused
    Bottom: capacidad_base formatted as "4pax" — or client name if reserved
    Small tables (ancho < 60 or alto < 60): only show numero_mesa at 1× size

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

/**
 * Determine the turn overlay type for this mesa.
 *
 * 'comida' → red top half (mañana)
 * 'cena'   → red bottom half (tarde)
 * 'full'   → fully red (both turns)
 */
const turnOverlay = computed<'none' | 'comida' | 'cena' | 'full'>(() => {
  if (!props.turnoStatus) return 'none'

  const hasComida = props.turnoStatus.comida
  const hasCena = props.turnoStatus.cena
  const hasBoth = hasComida && hasCena

  if (hasBoth) return 'full'

  // 'todos' mode: show overlay for whichever turn is reserved
  if (!props.activeTurno || props.activeTurno === 'todos') {
    if (hasComida) return 'comida'
    if (hasCena) return 'cena'
    return 'none'
  }

  if (props.activeTurno === 'comida') {
    return hasComida ? 'comida' : 'none'
  }

  if (props.activeTurno === 'cena') {
    return hasCena ? 'cena' : 'none'
  }

  return 'none'
})

/** Label to show on the colored top half: 'M' for comida, null otherwise */
const topLabel = computed<string | null>(() => {
  if (turnOverlay.value === 'none') return null
  if (turnOverlay.value === 'cena') return null
  return 'M'
})

/** Label to show on the colored bottom half: 'T' for cena, null otherwise */
const bottomLabel = computed<string | null>(() => {
  if (turnOverlay.value === 'none') return null
  if (turnOverlay.value === 'comida') return null
  return 'T'
})

/**
 * Fill color:
 * When overlay active (comida/cena/full): green (libre),
 * the overlay itself IS the occupancy indicator.
 * Otherwise: normal estado color.
 */
const baseFillColor = computed(() => {
  if (turnOverlay.value === 'comida' || turnOverlay.value === 'cena' || turnOverlay.value === 'full') {
    return STATUS_COLORS['libre']
  }
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

// ── Text overlay (two stacked nodes) ──
//
// Two separate v-text nodes:
//   1. Table number (fontSize × 2) — positioned above center (numberY)
//   2. Capacity "Xpax" or client name (fontSize × 1) — positioned below center (paxY)
// Small tables (< 60px) only show the number at normal size.
// offsetX/offsetY center each text independently. Both counter-rotate.

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
const numberFontSize = computed(() => baseFontSize.value * 2)

/** Vertical gap between number and pax text centers inside the upright group */
const textGap = computed(() => baseFontSize.value * 1.0)

// ── Text content ──

/** Table number (or fusion label) rendered large, always shown. */
const numberText = computed(() => props.fusionLabel || String(props.mesa.numero_mesa))

/** Capacity suffix: "Xpax" or client name if reserved. Only for non-small tables. */
const paxText = computed(() => {
  if (isSmall.value) return ''
  if (props.estado === 'reservada' && props.reservasMap?.[props.mesa.id]) {
    return props.reservasMap[props.mesa.id]
  }
  return `${props.mesa.capacidad_base}pax`
})

// ── Turn overlay configs ──

const OVERLAY_RED = '#EF4444'
const OVERLAY_OPACITY = 1.0

/** Half dimension helper — returns height for rect/oval, side for square. */
const halfH = computed(() => {
  if (props.mesa.forma === 'cuadrada') return props.mesa.ancho / 2
  return props.mesa.alto / 2
})

/**
 * Rect overlay for rectangular/square tables — top half (comida). */
const rectOverlayTop = computed(() => ({
  x: 0,
  y: 0,
  width: props.mesa.ancho,
  height: halfH.value,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Rect overlay for rectangular/square tables — bottom half (cena). */
const rectOverlayBottom = computed(() => ({
  x: 0,
  y: halfH.value,
  width: props.mesa.ancho,
  height: halfH.value,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Wedge overlay for round tables — top semicircle (comida).
 * Konva angle 0 = 3-o'clock, sweep is clockwise.
 * rotation: -180 → starts at 9-o'clock, sweeps 180° clockwise → covers TOP half.
 * VCircle is centered at (0,0), wedge shares that center. */
const roundOverlayTop = computed(() => ({
  x: 0,
  y: 0,
  radius: props.mesa.ancho / 2,
  angle: 180,
  rotation: -180,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Wedge overlay for round tables — bottom semicircle (cena).
 * rotation: 0 → starts at 3-o'clock, sweeps 180° clockwise → covers BOTTOM half. */
const roundOverlayBottom = computed(() => ({
  x: 0,
  y: 0,
  radius: props.mesa.ancho / 2,
  angle: 180,
  rotation: 0,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Rect overlay for oval tables — top half (comida). */
const ovalOverlayTop = computed(() => ({
  x: -props.mesa.ancho / 2,
  y: -halfH.value,
  width: props.mesa.ancho,
  height: halfH.value,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Rect overlay for oval tables — bottom half (cena). */
const ovalOverlayBottom = computed(() => ({
  x: -props.mesa.ancho / 2,
  y: 0,
  width: props.mesa.ancho,
  height: halfH.value,
  fill: OVERLAY_RED,
  opacity: OVERLAY_OPACITY,
  listening: false,
}))

/**
 * Center position for the top label ('M').
 * - Rect/square: center of top half
 * - Round: center of top semicircle
 * - Oval: center of top half
 */
const topLabelPos = computed(() => {
  if (props.mesa.forma === 'redonda') return { x: 0, y: -props.mesa.ancho * 0.25 }
  if (props.mesa.forma === 'ovalada') return { x: 0, y: -props.mesa.alto * 0.25 }
  const h = props.mesa.forma === 'cuadrada' ? props.mesa.ancho : props.mesa.alto
  return { x: props.mesa.ancho * 0.5, y: h * 0.25 }
})

/**
 * Center position for the bottom label ('T').
 * - Rect/square: center of bottom half
 * - Round: center of bottom semicircle
 * - Oval: center of bottom half
 */
const bottomLabelPos = computed(() => {
  if (props.mesa.forma === 'redonda') return { x: 0, y: props.mesa.ancho * 0.25 }
  if (props.mesa.forma === 'ovalada') return { x: 0, y: props.mesa.alto * 0.25 }
  const h = props.mesa.forma === 'cuadrada' ? props.mesa.ancho : props.mesa.alto
  return { x: props.mesa.ancho * 0.5, y: h * 0.75 }
})

// Group config with Konva-native event handlers (avoids Vue fragment inheritance issue)
// dragDistance=5: requires 5px finger movement before initiating drag on
// mobile/touch, so a simple tap still fires onClick/onTap properly.
const groupConfig = computed(() => ({
  id: props.mesa.id,
  x: props.mesa.posicion_x,
  y: props.mesa.posicion_y,
  rotation: props.mesa.rotacion,
  draggable: true, // Always draggable (Transformer only in diseño mode)
  dragDistance: 5,
  dragBoundFunc: props.dragBoundFunc,
  onClick: (e: any) => emit('click', e?.evt),
  onTap: (e: any) => emit('click', e?.evt),
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
    <!-- Each half renders independently so 'full' shows both. -->
    <!-- ════════════════════════════════════════════════════════ -->

    <!-- Top half (comida): rect/square -->
    <v-rect
      v-if="(turnOverlay === 'comida' || turnOverlay === 'full') && (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada')"
      :config="rectOverlayTop"
    />
    <!-- Top half (comida): round -->
    <v-wedge
      v-else-if="(turnOverlay === 'comida' || turnOverlay === 'full') && mesa.forma === 'redonda'"
      :config="roundOverlayTop"
    />
    <!-- Top half (comida): oval -->
    <v-rect
      v-else-if="(turnOverlay === 'comida' || turnOverlay === 'full') && mesa.forma === 'ovalada'"
      :config="ovalOverlayTop"
    />

    <!-- Bottom half (cena): rect/square -->
    <v-rect
      v-if="(turnOverlay === 'cena' || turnOverlay === 'full') && (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada')"
      :config="rectOverlayBottom"
    />
    <!-- Bottom half (cena): round -->
    <v-wedge
      v-else-if="(turnOverlay === 'cena' || turnOverlay === 'full') && mesa.forma === 'redonda'"
      :config="roundOverlayBottom"
    />
    <!-- Bottom half (cena): oval -->
    <v-rect
      v-else-if="(turnOverlay === 'cena' || turnOverlay === 'full') && mesa.forma === 'ovalada'"
      :config="ovalOverlayBottom"
    />

    <!-- Turn label: 'M' on top (comida), 'T' on bottom (cena) -->
    <v-text
      v-if="topLabel"
      :config="{
        x: topLabelPos.x,
        y: topLabelPos.y,
        text: topLabel,
        fontSize: baseFontSize,
        fontStyle: 'bold',
        fontFamily: 'Inter, sans-serif',
        fill: '#FFFFFF',
        listening: false,
        offsetX: 7,
        offsetY: 7,
        rotation: -mesa.rotacion,
      }"
    />
    <v-text
      v-if="bottomLabel"
      :config="{
        x: bottomLabelPos.x,
        y: bottomLabelPos.y,
        text: bottomLabel,
        fontSize: baseFontSize,
        fontStyle: 'bold',
        fontFamily: 'Inter, sans-serif',
        fill: '#FFFFFF',
        listening: false,
        offsetX: 7,
        offsetY: 7,
        rotation: -mesa.rotacion,
      }"
    />

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Text overlay — upright group counter-rotates the       -->
    <!-- table rotation so y-offset always means visually down. -->
    <!-- ════════════════════════════════════════════════════════ -->
    <v-group :config="{ x: shapeCenter.x, y: shapeCenter.y, rotation: -mesa.rotacion }">
      <!-- Number (2× fontSize), above center in upright space -->
      <v-text
        :config="{
          x: 0,
          y: isSmall ? 0 : -textGap,
          offsetX: textWidth / 2,
          offsetY: isSmall ? baseFontSize / 2 : numberFontSize / 2,
          width: textWidth,
          align: 'center',
          verticalAlign: 'middle',
          text: numberText,
          fontSize: isSmall ? baseFontSize : numberFontSize,
          fontStyle: 'bold',
          fontFamily: 'Inter, sans-serif',
          fill: '#2D3748',
          listening: false,
        }"
      />

      <!-- Capacity / client name (1× fontSize), below center in upright space -->
      <v-text
        v-if="!isSmall"
        :config="{
          x: 0,
          y: textGap,
          offsetX: textWidth / 2,
          offsetY: baseFontSize / 2,
          width: textWidth,
          align: 'center',
          verticalAlign: 'middle',
          text: paxText,
          fontSize: baseFontSize,
          fontStyle: 'bold',
          fontFamily: 'Inter, sans-serif',
          fill: '#2D3748',
          listening: false,
        }"
      />
    </v-group>
  </v-group>
</template>
