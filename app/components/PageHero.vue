<script setup lang="ts">
/**
 * PageHero — Hero section for page headers (PU-007)
 *
 * Renders title as <h1>, optional subtitle, optional background image
 * with dark overlay for text contrast.
 */

defineProps<{
  title: string
  subtitle?: string
  background?: string
}>()
</script>

<template>
  <section class="relative overflow-hidden">
    <!-- Background image with dark overlay -->
    <div
      v-if="background"
      data-testid="hero-background"
      class="absolute inset-0"
    >
      <img
        :src="background"
        alt=""
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-slate/60" />
    </div>

    <!-- Text content -->
    <div
      :class="[
        'relative mx-auto max-w-7xl px-4 py-12 text-center',
        background ? 'text-white' : 'text-slate',
      ]"
    >
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="mx-auto mt-2 max-w-2xl text-lg opacity-90"
      >
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
