<script setup lang="ts">
import { ref } from 'vue'

/**
 * FamilySelector — Second-level horizontal scroll for sub-categories (e.g. wine types)
 *
 * Appears below CategorySelector when the selected category has families.
 * Selecting a family filters the product grid further.
 * Clicking an already-selected family deselects it (shows all).
 * v-model="null" means "show all families".
 */

defineProps<{
  families: { id: string; nombre: string; puesto: number }[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

function selectFamily(id: string, current: string | null) {
  // Toggle: clicking the same family deselects it
  emit('update:modelValue', current === id ? null : id)
}

function scrollLeft() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -200, behavior: 'smooth' })
  }
}

function scrollRight() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 200, behavior: 'smooth' })
  }
}
</script>

<template>
  <nav
    class="sticky top-[calc(4rem+52px)] z-30 bg-cream/80 backdrop-blur-sm border-t border-terracotta/10"
    aria-label="Familias dentro de la categoría"
  >
    <div class="mx-auto flex max-w-7xl items-center px-4">
      <!-- Left arrow (desktop) -->
      <button
        class="hidden shrink-0 rounded-full bg-white p-1 text-slate shadow-sm hover:bg-terracotta/10 md:flex"
        aria-label="Desplazar familias hacia la izquierda"
        @click="scrollLeft"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Scrollable family list -->
      <div
        ref="scrollContainer"
        class="flex flex-1 gap-1 overflow-x-auto px-2 py-2 scrollbar-hide"
      >
        <button
          v-for="family in families"
          :key="family.id"
          :data-testid="`family-btn-${family.nombre}`"
          class="shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
          :class="
            modelValue === family.id
              ? 'bg-terracotta/80 text-white'
              : 'text-slate/70 hover:bg-terracotta/10 hover:text-terracotta'
          "
          @click="selectFamily(family.id, modelValue)"
        >
          {{ family.nombre }}
        </button>
      </div>

      <!-- Right arrow (desktop) -->
      <button
        class="hidden shrink-0 rounded-full bg-white p-1 text-slate shadow-sm hover:bg-terracotta/10 md:flex"
        aria-label="Desplazar familias hacia la derecha"
        @click="scrollRight"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
