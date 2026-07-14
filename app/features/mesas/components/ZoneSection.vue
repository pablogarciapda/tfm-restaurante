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
import { computed, ref, onMounted, watch } from 'vue'
import { Rect as VRect, Text as VText, Image as VImage } from 'vue-konva'
import type { Zona } from '#shared/contracts/mesas.contract'

const props = defineProps<{
  zona: Zona
  x: number
  y: number
  width: number
  height: number
  /** Optional fill color override. Falls back to ZONE_COLORS map or neutral default. */
  zoneColor?: string
  /** Optional background image URL for the zone. When provided, renders v-image instead of v-rect. */
  imageUrl?: string | null
  /** Image scale factor (zoom). Default 1. Used from zonasConfig.imagen_scale */
  imageScale?: number
}>()

const ZONE_COLORS: Record<string, string> = {
  Principal: '#E8D5C4',
  Zingaro: '#D4C5B9',
  Privado: '#C9BFB0',
  Terraza: '#B8C9B0',
  Bar: '#C4B8D0',
}

const fillColor = computed(() => props.zoneColor || ZONE_COLORS[props.zona] || '#D4C5B9')
const showBackground = computed(() => !props.imageUrl) // Only show colored rect if no image

/** Image config with scale factor for zoom control */
const imageConfig = computed(() => {
  if (!konvaImage.value) return null
  const scale = props.imageScale ?? 1
  const imgW = konvaImage.value.naturalWidth * scale
  const imgH = konvaImage.value.naturalHeight * scale
  // Center the image in the zone
  const offsetX = (props.width - imgW) / 2
  const offsetY = (props.height - imgH) / 2
  return {
    x: props.x + (scale === 1 ? 0 : offsetX),
    y: props.y + (scale === 1 ? 0 : offsetY),
    width: scale === 1 ? props.width : imgW,
    height: scale === 1 ? props.height : imgH,
    image: konvaImage.value,
    listening: false,
  }
})

/** Konva Image instance — loaded from imageUrl */
const konvaImage = ref<HTMLImageElement | null>(null)
const imageLoading = ref(false)

function loadImage(url: string | null | undefined) {
  if (!url) {
    konvaImage.value = null
    return
  }
  imageLoading.value = true
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    konvaImage.value = img
    imageLoading.value = false
  }
  img.onerror = () => {
    konvaImage.value = null
    imageLoading.value = false
    console.warn(`[ZoneSection] Failed to load background image for zone "${props.zona}": ${url}`)
  }
  img.src = url
}

onMounted(() => loadImage(props.imageUrl))

watch(() => props.imageUrl, (url) => loadImage(url))
</script>

<template>
  <!-- Zone background: image if available, fallback to semi-transparent rect -->
  <v-image
    v-if="konvaImage && !imageLoading"
    :config="imageConfig"
  />
  <v-rect
    v-else
    :config="{
      x,
      y,
      width,
      height,
      fill: fillColor,
      opacity: 0,
      stroke: 'transparent',
      listening: false,
    }"
  />

  <!-- Zone label text — positioned top-left in the zone area -->
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
