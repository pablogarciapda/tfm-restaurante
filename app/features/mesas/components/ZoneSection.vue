<!--
  ZoneSection.vue — Labeled semi-transparent zone rectangle (MCA-002)

  Props: zona (Zona), x, y, width, height
  Renders a v-rect (zone background) + v-text (zone label) on the
  background layer of the Konva stage.

  Zone colors:
    Principal=#E8D5C4, Zingaro=#D4C5B9, Privado=#C9BFB0,
    Terraza=#B8C9B0, Bar=#C4B8D0
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Rect as VRect, Text as VText } from 'vue-konva'
import type { Zona } from '~/shared/contracts/mesas.contract'

const props = defineProps<{
  zona: Zona
  x: number
  y: number
  width: number
  height: number
}>()

const ZONE_COLORS: Record<Zona, string> = {
  Principal: '#E8D5C4',
  Zingaro: '#D4C5B9',
  Privado: '#C9BFB0',
  Terraza: '#B8C9B0',
  Bar: '#C4B8D0',
}

const fillColor = computed(() => ZONE_COLORS[props.zona])
</script>

<template>
  <!-- Zone background rectangle — semi-transparent -->
  <v-rect
    :config="{
      x,
      y,
      width,
      height,
      fill: fillColor,
      opacity: 0.3,
      stroke: 'transparent',
      listening: false,
    }"
  />

  <!-- Zone label text — centered in the zone area -->
  <v-text
    :config="{
      x: x + 16,
      y: y + 16,
      text: zona,
      fontSize: 20,
      fontFamily: 'Playfair Display, serif',
      fill: '#2D3748',
      listening: false,
    }"
  />
</template>
