<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Carta page — Category-based browsing with Supabase data (CN-006)
 *
 * Data sourced from Supabase via usePlatos composable.
 * Platos grouped by categoria, sorted by puesto.
 * Only one category visible at a time, selected via CategorySelector.
 *
 * A synthetic "Recomendados" section is built from platos with
 * recomendado=true. Its title and visibility are configurable
 * from the admin Configuracion page.
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

interface RecomendadosConfig {
  mostrar_recomendados: boolean
  titulo_recomendados: string
}

const client = useSupabaseClient()
const { data: platos, error, pending } = usePlatos()

// Load config for the synthetic recomendados section
const { data: sysConfig } = useAsyncData('carta-config', async () => {
  const { data } = await client
    .from('configuracion')
    .select('mostrar_recomendados, titulo_recomendados')
    .single()
  return (data ?? { mostrar_recomendados: true, titulo_recomendados: 'NUESTRAS RECOMENDACIONES' }) as RecomendadosConfig
})

// Load categorias for display order (puesto from DB, not from platos)
const { data: categoriasRows } = useAsyncData('carta-categorias', async () => {
  const { data } = await client.from('categorias').select('nombre, puesto').order('puesto')
  return data ?? []
})

const categoriaPuesto = computed(() => {
  const map: Record<string, number> = {}
  if (categoriasRows.value) {
    for (const c of categoriasRows.value) {
      map[c.nombre] = c.puesto
    }
  }
  return map
})

const recTitle = computed(() => sysConfig.value?.titulo_recomendados ?? 'NUESTRAS RECOMENDACIONES')
const showRec = computed(() => sysConfig.value?.mostrar_recomendados ?? true)

// Map Supabase rows → display format grouped by categoria
const categories = computed<CategoryGroup[]>(() => {
  const raw = platos.value as PlatoSupabase[] | null
  if (!raw || raw.length === 0) return []

  const groups = new Map<string, { platos: PlatoDisplay[]; minPuesto: number }>()
  const useRec = showRec.value
  const recName = recTitle.value

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

    // Also add to the synthetic recomendados section if marked as recomendado
    if (useRec && p.recomendado) {
      if (!groups.has(recName)) {
        groups.set(recName, { platos: [], minPuesto: -1 })
      }
      groups.get(recName)!.platos.push(display)
    }
  }

  const catOrderMap = categoriaPuesto.value

  return Array.from(groups.entries()).map(([cat, g]) => ({
    id: cat.toLowerCase().replace(/\s+/g, '-'),
    categoria: cat,
    // Synthetic group (puesto -1) always first; real categories use DB puesto
    puesto: cat === recName ? -1 : (catOrderMap[cat] ?? 999),
    open: true,
    platos: g.platos,
  })).sort((a, b) => a.puesto - b.puesto)
})

const categoryNames = computed(() => categories.value.map((c) => c.categoria))

// Active category: start empty, sync with available categories ASAP.
// Using immediate watch ensures SSR and client agree on the initial value:
// - SSR: renders first with '', then data resolves and sets activeCategory before HTML serialization
// - Client: Nuxt payload is available immediately so watch fires during setup
const activeCategory = ref('')

watch(categoryNames, (names) => {
  if (names.length > 0 && (!activeCategory.value || !names.includes(activeCategory.value))) {
    activeCategory.value = names[0]
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

    <!-- Categories (div wrapper avoids Suspense fragment issues) -->
    <div v-else>
      <CategorySelector
        v-model="activeCategory"
        :categories="categoryNames"
      />
      <ProductGrid :categories="filteredCategories" />
    </div>
  </div>
</template>
