<script setup lang="ts">
import { ref } from 'vue'

/**
 * CategorySelector — Horizontal scrollable category bar (CN-001)
 *
 * Desktop: left/right arrow buttons when categories overflow.
 * Mobile: native touch scroll (overflow-x-auto).
 * Active category underlined with terracotta color.
 * v-model binding for active category.
 */

defineProps<{
  categories: string[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

function selectCategory(category: string) {
  emit('update:modelValue', category)
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
    class="sticky top-16 z-40 bg-cream/95 backdrop-blur-sm shadow-sm"
    aria-label="Categorías de la carta"
  >
    <div class="mx-auto flex max-w-7xl items-center px-4">
      <!-- Left arrow (desktop) -->
      <button
        data-testid="scroll-left"
        class="hidden shrink-0 rounded-full bg-white p-1.5 text-slate shadow-sm hover:bg-terracotta/10 md:flex"
        aria-label="Desplazar categorías hacia la izquierda"
        @click="scrollLeft"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Scrollable category list -->
      <div
        ref="scrollContainer"
        class="flex flex-1 gap-1 overflow-x-auto px-2 py-3 scrollbar-hide"
      >
        <button
          v-for="category in categories"
          :key="category"
          :data-testid="`category-btn-${category}`"
          class="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors"
          :class="
            modelValue === category
              ? 'bg-terracotta text-white'
              : 'text-slate hover:bg-terracotta/10 hover:text-terracotta'
          "
          @click="selectCategory(category)"
        >
          {{ category }}
        </button>
      </div>

      <!-- Right arrow (desktop) -->
      <button
        data-testid="scroll-right"
        class="hidden shrink-0 rounded-full bg-white p-1.5 text-slate shadow-sm hover:bg-terracotta/10 md:flex"
        aria-label="Desplazar categorías hacia la derecha"
        @click="scrollRight"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Hide scrollbar for Chrome/Safari/Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE/Edge/Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
