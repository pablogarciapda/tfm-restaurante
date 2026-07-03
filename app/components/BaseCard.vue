<script setup lang="ts">
/**
 * BaseCard — Reusable card component (PU-006)
 *
 * Default slot for content, optional image prop rendered at top
 * with object-cover, cream bg, rounded shadow.
 */

defineProps<{
  image?: string
  imageAlt?: string
}>()
</script>

<template>
  <article class="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-md">
    <!-- Optional image at top -->
    <img
      v-if="image"
      :src="image"
      :alt="imageAlt ?? ''"
      loading="lazy"
      class="h-48 w-full object-cover"
    />

    <!-- Slot content -->
    <div class="flex flex-1 flex-col p-5">
      <slot />
    </div>
  </article>
</template>
