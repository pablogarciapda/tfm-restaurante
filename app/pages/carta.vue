<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

/**
 * Carta page — Category-based browsing with Supabase data (CN-006)
 *
 * Data sourced from Supabase via usePlatos composable.
 * Platos grouped by categoria, sorted by puesto.
 * Scroll-spy via IntersectionObserver for category navigation.
 */

interface PlatoSupabase {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  categoria: string
  tipo_menu?: string
  imagen_url?: string
  disponible: boolean
  calorias?: number
  alergenos?: string[]
  puesto?: number
  recomendado?: boolean
}

interface PlatoDisplay {
  plato: string
  precio: string
  descripcion?: string
  imagen_url?: string
  alergenos?: string[]
  calorias?: number
}

interface CategoryGroup {
  id: string
  categoria: string
  puesto: number
  open: boolean
  platos: PlatoDisplay[]
}

const { data: platos, error, pending } = usePlatos()

// Map Supabase rows → display format grouped by categoria
const categories = computed<CategoryGroup[]>(() => {
  const raw = platos.value as PlatoSupabase[] | null
  if (!raw || raw.length === 0) return []

  const groups = new Map<string, { platos: PlatoDisplay[]; minPuesto: number }>()

  for (const p of raw) {
    const display: PlatoDisplay = {
      plato: p.nombre,
      precio: p.precio ? `${p.precio.toFixed(2).replace('.', ',')}€` : '',
      descripcion: p.descripcion,
      imagen_url: p.imagen_url,
      alergenos: p.alergenos,
      calorias: p.calorias,
    }

    if (!groups.has(p.categoria)) {
      groups.set(p.categoria, { platos: [], minPuesto: p.puesto ?? 99 })
    }
    const group = groups.get(p.categoria)!
    group.platos.push(display)
    if ((p.puesto ?? 99) < group.minPuesto) {
      group.minPuesto = p.puesto ?? 99
    }
  }

  return Array.from(groups.entries()).map(([cat, g]) => ({
    id: cat.toLowerCase().replace(/\s+/g, '-'),
    categoria: cat,
    puesto: g.minPuesto,
    open: true,
    platos: g.platos,
  })).sort((a, b) => a.puesto - b.puesto)
})

const categoryNames = computed(() => categories.value.map((c) => c.categoria))
const activeCategory = ref(categoryNames.value[0] || '')

// Scroll-spy: IntersectionObserver (client-only)
let observer: IntersectionObserver | null = null

onMounted(() => {
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
    { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' },
  )

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

    <!-- Loading state -->
    <div v-if="pending" class="py-20 text-center text-gray-500">
      <p class="text-lg">Cargando carta...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-20 text-center text-gray-500">
      <p class="text-lg">Error al cargar la carta</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="categories.length === 0" class="py-20 text-center text-gray-500">
      <p class="text-lg">Carta no disponible</p>
    </div>

    <!-- Categories -->
    <template v-else>
      <CategorySelector
        v-model="activeCategory"
        :categories="categoryNames"
      />
      <ProductGrid :categories="categories" />
    </template>
  </div>
</template>
