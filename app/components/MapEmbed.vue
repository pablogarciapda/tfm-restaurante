<script setup lang="ts">
/**
 * MapEmbed — Lazy-loaded map iframe (CO-002)
 *
 * Iframe with loading="lazy", title attribute for a11y,
 * fallback address text below.
 */

defineProps<{
  src: string
  title: string
  caption?: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-xl bg-gray-100">
    <iframe
      :src="src"
      :title="title"
      loading="lazy"
      width="100%"
      height="400"
      class="border-0"
      allowfullscreen
      referrerpolicy="no-referrer-when-downgrade"
    />
    <p class="p-4 text-center text-sm text-gray-500">
      {{ caption || 'Ubicación del restaurante' }}
    </p>
  </div>
</template>
