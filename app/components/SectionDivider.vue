<script setup lang="ts">
/**
 * SectionDivider — Horizontal rule with optional label (PU-008)
 *
 * Semantic separator with role="separator", optional centered label text.
 */

defineProps<{
  label?: string
}>()
</script>

<template>
  <div role="separator" class="my-8 flex items-center gap-4">
    <!-- Left line -->
    <div class="h-px flex-1 bg-gray-300" />

    <!-- Optional label -->
    <span
      v-if="label"
      class="shrink-0 text-sm font-semibold uppercase tracking-wider text-slate"
    >
      {{ label }}
    </span>

    <!-- Right line -->
    <div class="h-px flex-1 bg-gray-300" />
  </div>
</template>
