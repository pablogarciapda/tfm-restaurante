<script setup lang="ts">
import { ref } from 'vue'
import { toProxyUrl } from '~/utils/image-url'

/**
 * ProductCard — Single dish card for the carta (CN-004, CN-007)
 *
 * Image (aspect-square, loading="lazy", placeholder on error),
 * name, description (line-clamp-2), price, allergen badges.
 */

defineProps<{
  plato: {
    plato: string
    precio: string
    stock?: string
    descripcion?: string
    imagen_url?: string
    alergenos?: string[]
    calorias?: number
  }
}>()

const imageError = ref(false)

function onImageError() {
  imageError.value = true
}
</script>

<template>
  <article class="overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg">
    <!-- Image: shorter on mobile, square on desktop -->
    <div class="relative aspect-video overflow-hidden bg-gray-200 sm:aspect-square">
      <img
        v-if="plato.imagen_url"
        :src="toProxyUrl(plato.imagen_url)"
        :alt="`Foto de ${plato.plato}`"
        loading="lazy"
        class="h-full w-full object-cover transition-opacity"
        :class="{ 'opacity-0': imageError }"
        @error="onImageError"
      />
      <!-- Placeholder gradient (shown on load and on error) -->
      <div
        v-if="!plato.imagen_url || imageError"
        class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-terracotta/20 to-cream"
      >
        <span class="text-4xl">🍽️</span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 sm:p-4">
      <!-- Name -->
      <h3 class="text-base font-bold text-slate sm:text-lg">
        {{ plato.plato }}
      </h3>

      <!-- Description (line-clamp-2) -->
      <p
        v-if="plato.descripcion"
        class="mt-1 line-clamp-2 text-sm text-gray-600"
      >
        {{ plato.descripcion }}
      </p>

      <div class="mt-3 flex items-center justify-between">
        <!-- Price -->
        <span
          data-testid="product-price"
          class="text-lg font-semibold text-terracotta"
        >
          {{ plato.precio }}
          <span
            v-if="plato.precio.includes('/')"
            class="text-xs font-normal text-gray-500"
          >
            / pers.
          </span>
        </span>
      </div>

      <!-- Allergen badges -->
      <div v-if="plato.alergenos && plato.alergenos.length > 0" class="mt-3 flex flex-wrap gap-1">
        <span
          v-for="alergeno in plato.alergenos"
          :key="alergeno"
          data-testid="allergen-badge"
          class="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-slate"
        >
          {{ alergeno }}
        </span>
      </div>
    </div>
  </article>
</template>
