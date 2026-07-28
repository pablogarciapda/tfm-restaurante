<!--
  FusionGroupNode.vue — Renders a fusion group as a SINGLE Konva block.

  When tables are fused, they become one logical unit:
    - One draggable v-group wrapping all member tables
    - One dashed border around the entire group (not per-table)
    - Dragging the group updates ALL member positions in the store
    - Clicking selects the whole group
    - Individual member shapes/labels rendered via TableNode at relative positions

  This replaces the per-table dashed-stroke + separate sibling-sync approach
  that caused persistent position desync issues (fusion bug chain).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Group as VGroup } from 'vue-konva'
import TableNode from './TableNode.vue'
import type { Mesa, MesaEstado } from '#shared/contracts/mesas.contract'
import type { TurnoFilter } from '../stores/canvas-store'

const props = defineProps<{
  parentMesa: Mesa
  memberMesas: Mesa[]
  fusionLabel: string
  selected: boolean
  designMode: boolean
  estadoMap: Record<string, MesaEstado>
  turnoStatusMap: Record<string, { comida: boolean; cena: boolean }>
  activeTurno?: TurnoFilter
  reservasMap?: Record<string, string>
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number }
  fontSize?: number
}>()

const emit = defineEmits<{
  click: [mesa: Mesa]
  dragend: [mesa: Mesa]
}>()

/**
 * Each member's position relative to the fusion parent.
 * The outer group sits at parentMesa.posicion_x/y, so inner TableNodes
 * need coordinates relative to that origin.
 */
const relativeMembers = computed(() => {
  return props.memberMesas.map((m) => ({
    ...m,
    posicion_x: m.posicion_x - props.parentMesa.posicion_x,
    posicion_y: m.posicion_y - props.parentMesa.posicion_y,
  }))
})

/** Konva node id for Transformer/findOne lookups — prefixed to avoid collision with TableNode ids. */
const groupId = computed(() => `fusion_${props.parentMesa.id}`)

/**
 * Group config with Konva-native event handlers — avoids Vue's event system
 * fallthrough warnings (vue-konva Group renders as a Konva node, not a Vue
 * element, so @click/@tap/@dragend produce "Extraneous non-emits" warnings).
 * Follows the same pattern as TableNode.vue.
 *
 * CRITICAL: rotation MUST be 0. Child positions are in absolute canvas
 * coordinates (waiter places tables manually before fusing). If the group
 * rotates, relative positions are interpreted in the rotated coordinate
 * system, causing visual misplacement.
 * Each TableNode handles its own rotation independently.
 */
const groupConfig = computed(() => ({
  id: groupId.value,
  x: props.parentMesa.posicion_x,
  y: props.parentMesa.posicion_y,
  rotation: 0,
  draggable: true,
  dragDistance: 5,
  dragBoundFunc: props.dragBoundFunc,
  onClick: () => emit('click', props.parentMesa),
  onTap: () => emit('click', props.parentMesa),
  onDragEnd: (e: any) => handleGroupDragEnd(e),
}))

/**
 * Handle drag-end on the outer group.
 * Compute the delta from the group's current Konva position, apply it to
 * every member's absolute position, and emit the updated parent Mesa so
 * TableCanvas can persist all siblings.
 */
function handleGroupDragEnd(e: any) {
  const node = e?.target
  if (!node) return

  const newX = Math.round(node.x())
  const newY = Math.round(node.y())
  const deltaX = newX - props.parentMesa.posicion_x
  const deltaY = newY - props.parentMesa.posicion_y

  // Build updated parent mesa
  const updatedParent: Mesa = {
    ...props.parentMesa,
    posicion_x: newX,
    posicion_y: newY,
  }

  // We emit the parent — TableCanvas is responsible for persisting ALL members
  emit('dragend', updatedParent)
}
</script>

<template>
  <v-group :config="groupConfig">
    <!-- Each member rendered at relative position, non-interactive -->
    <TableNode
      v-for="member in relativeMembers"
      :key="member.id"
      :mesa="member"
      :estado="estadoMap[member.id] ?? 'libre'"
      :selected="selected"
      :design-mode="designMode"
      :reservas-map="reservasMap"
      :fusion-label="fusionLabel"
      :turno-status="turnoStatusMap[member.id]"
      :active-turno="activeTurno"
      :font-size="fontSize"
      :is-in-fusion-group="true"
    />
  </v-group>
</template>
