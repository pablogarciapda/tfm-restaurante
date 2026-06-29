<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { mockCarta } from '../../shared/fixtures/carta-mock'

/**
 * Carta page — Category-based browsing with scroll-spy (CN-001, CN-002, CN-006)
 *
 * Scroll-spy: IntersectionObserver in onMounted (process.client guard per AD2)
 * updates activeCategory on scroll. <ClientOnly> NOT used — component shape
 * identical SSR/client per AD2.
 *
 * Data: shared/fixtures/carta-mock.ts, sorted by puesto.
 */

// Sort categories by puesto
const categories = [...mockCarta].sort((a, b) => a.puesto - b.puesto)
const categoryNames = categories.map((c) => c.categoria)
const activeCategory = ref(categoryNames[0] || '')

// Filter categories based on active selection
// For now, show all categories (filtering is optional per spec)

// Scroll-spy: IntersectionObserver (process.client guard per AD2)
let observer: IntersectionObserver | null = null

onMounted(() => {
  // import.meta.client guard for SSR safety (AD2)
  if (!import.meta.client) return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const category = entry.target.getAttribute('data-category')
          if (category) {
            activeCategory.value = category
          }
        }
      }
    },
    { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' }
  )

  // Observe category section headings
  const sections = document.querySelectorAll('[data-category]')
  sections.forEach((section) => observer!.observe(section))
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero
      title="Nuestra Carta"
      subtitle="Sabores tradicionales de la tierra leonesa"
    />

    <!-- Sticky category selector -->
    <CategorySelector
      v-model="activeCategory"
      :categories="categoryNames"
    />

    <!-- Product grid -->
    <ProductGrid :categories="categories" />
  </div>
</template>
