<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Carta page — Category-based browsing with Supabase data (CN-006)
 *
 * Data sourced from Supabase via usePlatos composable.
 * Platos grouped by categoria, sorted by puesto.
 * Only one category visible at a time, selected via CategorySelector.
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
  stock: string
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
    // Skip non-disponible platos
    if (!p.disponible) continue

    const display: PlatoDisplay = {
      plato: p.nombre,
      precio: p.precio ? `${p.precio.toFixed(2).replace('.', ',')}€` : '',
      stock: 'Disponible',
      descripcion: p.descripcion,
      imagen_url: p.imagen_url,
      alergenos: p.alergenos,
      calorias: p.calorias,
    }

    // Add to its category group
    if (!groups.has(p.categoria)) {
      groups.set(p.categoria, { platos: [], minPuesto: p.puesto ?? 99 })
    }
    const group = groups.get(p.categoria)!
    group.platos.push(display)
    if ((p.puesto ?? 99) < group.minPuesto) {
      group.minPuesto = p.puesto ?? 99
    }

    // Also add to "Nuestras Recomendaciones" if marked as recomendado
    if (p.recomendado) {
      if (!groups.has('Nuestras Recomendaciones')) {
        groups.set('Nuestras Recomendaciones', { platos: [], minPuesto: -1 })
      }
      groups.get('Nuestras Recomendaciones')!.platos.push(display)
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
const activeCategory = ref('')

// Default to "Nuestras Recomendaciones" when categories load
watch(categoryNames, (names) => {
  if (names.length > 0 && !activeCategory.value) {
    activeCategory.value = names.includes('Nuestras Recomendaciones')
      ? 'Nuestras Recomendaciones'
      : names[0] ?? ''
  }
}, { immediate: true })

// Only show the selected category
const filteredCategories = computed(() =>
  categories.value.filter((c) => c.categoria === activeCategory.value),
)
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
      <ProductGrid :categories="filteredCategories" />
    </template>
  </div>
</template>
