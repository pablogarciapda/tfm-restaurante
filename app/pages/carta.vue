<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'

/**
 * Carta page — Category-based browsing with Supabase data (CN-006)
 *
 * Data sourced from Supabase via usePlatos composable.
 * Platos grouped by categoria, sorted by puesto.
 * Only one category visible at a time, selected via CategorySelector.
 *
 * Categories with families (e.g. VINOS → 13 D.O. families, POSTRES → HELADOS/CASEROS)
 * display a second horizontal scroll for family filtering.
 *
 * A synthetic "Recomendados" section is built from platos with
 * recomendado=true. Its title and visibility are configurable
 * from the admin Configuracion page.
 *
 * BUG FIX (2026-07-09): categoryNames must use ALL categories from DB,
 * NOT the filtered categories list, so family filtering in VINOS/POSTRES
 * doesn't hide main category navigation.
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
  familia_id?: string | null
}

interface PlatoDisplay {
  plato: string
  precio: string
  stock: string
  descripcion?: string
  imagen_url?: string
  alergenos?: string[]
  calorias?: number
  subcategoria?: string
}

interface CategoryGroup {
  id: string
  categoria: string
  puesto: number
  open: boolean
  platos: PlatoDisplay[]
}

interface FamiliaRow {
  id: string
  nombre: string
  categoria_id: string
  puesto: number
}

interface RecomendadosConfig {
  mostrar_recomendados: boolean
  titulo_recomendados: string
}

interface CategoriaRow {
  nombre: string
  puesto: number
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
  const { data } = await client.from('categorias').select('id, nombre, puesto').order('puesto')
  return data ?? []
})

// Load familias for sub-category filtering (e.g. wine types)
const { data: familiasRows } = useAsyncData('carta-familias', async () => {
  const { data } = await client
    .from('familias')
    .select('id, nombre, categoria_id, puesto')
    .order('puesto')
  return (data ?? []) as FamiliaRow[]
})

// Realtime: refresh carta when platos, categorias or familias change
const realtimeChannel = client
  .channel('carta-realtime')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'platos' },
    () => refreshNuxtData('platos'),
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'categorias' },
    () => refreshNuxtData('carta-categorias'),
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'familias' },
    () => refreshNuxtData('carta-familias'),
  )
  .subscribe()

onUnmounted(() => {
  realtimeChannel.unsubscribe()
})

// Map categoria nombre → puesto
const categoriaPuesto = computed(() => {
  const map: Record<string, number> = {}
  if (categoriasRows.value) {
    for (const c of categoriasRows.value) {
      map[c.nombre] = c.puesto
    }
  }
  return map
})

// Build a map: categoria_nombre → familias[] (from categoria_id FK)
const familiasPorCategoria = computed(() => {
  const map = new Map<string, FamiliaRow[]>()
  if (!familiasRows.value?.length || !categoriasRows.value?.length) return map

  // Build categoria nombre → id lookup
  const catNombreToId = new Map<string, string>()
  for (const c of categoriasRows.value) {
    const row = c as CategoriaRow & { id?: string }
    if (row.id) catNombreToId.set(row.nombre, row.id)
  }

  // Invert: categoria_id → categoria nombre
  const catIdToNombre = new Map<string, string>()
  for (const [nombre, id] of catNombreToId) {
    catIdToNombre.set(id, nombre)
  }

  // Group familias by their category name
  for (const f of familiasRows.value) {
    const catName = catIdToNombre.get(f.categoria_id)
    if (catName) {
      if (!map.has(catName)) map.set(catName, [])
      map.get(catName)!.push(f)
    }
  }
  return map
})

const recTitle = computed(() => sysConfig.value?.titulo_recomendados ?? 'NUESTRAS RECOMENDACIONES')
const showRec = computed(() => sysConfig.value?.mostrar_recomendados ?? true)

// Active category & family
const activeCategory = ref('')
const activeFamily = ref<string | null>(null)

// Category names for the first scroll — always ALL categories from DB (never filtered)
const categoryNames = computed(() => {
  const names: string[] = []
  if (categoriasRows.value) {
    for (const c of categoriasRows.value) {
      names.push(c.nombre)
    }
  }
  // Synthetic Recomendados at the front
  if (showRec.value) {
    names.unshift(recTitle.value)
  }
  return names
})

// Computed display category: fallback to first category w/ platos when none selected
const displayCategory = computed({
  get: () => {
    if (activeCategory.value) return activeCategory.value
    // First category from the full list that actually has platos
    const firstWithContent = categories.value.find((c) => c.platos.length > 0)
    return firstWithContent?.categoria || categoryNames.value[0] || ''
  },
  set: (val: string) => {
    // If clicking the same category, toggle family off; if switching, reset family
    if (val !== activeCategory.value) {
      activeFamily.value = null
    }
    activeCategory.value = val
  },
})

// Families for the currently selected category (second scroll)
const familiesForActive = computed(() => {
  return familiasPorCategoria.value.get(displayCategory.value) ?? []
})

// Whether to show the second family scroll
const showFamilyScroll = computed(() => familiesForActive.value.length > 0)

// Map Supabase rows → display format grouped by categoria AND optionally filtered by familia
const categories = computed<CategoryGroup[]>(() => {
  const raw = platos.value as PlatoSupabase[] | null
  if (!raw || raw.length === 0) return []

  const groups = new Map<string, { platos: PlatoDisplay[]; minPuesto: number }>()
  const useRec = showRec.value
  const recName = recTitle.value

  for (const p of raw) {
    if (!p.disponible) continue

    // If a family filter is active, skip platos that don't match
    if (activeFamily.value && p.familia_id !== activeFamily.value) continue

    const display: PlatoDisplay = {
      plato: p.nombre,
      precio: (p.precio != null && p.precio > 0) ? `${p.precio.toFixed(2).replace('.', ',')}€` : 'Consultar',
      stock: 'Disponible',
      descripcion: p.descripcion,
      imagen_url: p.imagen_url,
      alergenos: p.alergenos,
      calorias: p.calorias,
      subcategoria: p.familia_id ? (familiaMap.value[p.familia_id] ?? undefined) : undefined,
    }

    if (!groups.has(p.categoria)) {
      groups.set(p.categoria, { platos: [], minPuesto: p.puesto ?? 99 })
    }
    const group = groups.get(p.categoria)!
    group.platos.push(display)
    if ((p.puesto ?? 99) < group.minPuesto) {
      group.minPuesto = p.puesto ?? 99
    }

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
    puesto: cat === recName ? -1 : (catOrderMap[cat] ?? 999),
    open: true,
    platos: g.platos,
  })).sort((a, b) => a.puesto - b.puesto)
})

// Show only the selected category
const filteredCategories = computed(() =>
  categories.value.filter((c) => c.categoria === displayCategory.value),
)

// Family names for the second scroll
const familyNames = computed(() => familiesForActive.value.map((f) => f.nombre))

// Map familia_id → nombre for subcategory labels (e.g. "TINTOS D.O. LEÓN")
const familiaMap = computed(() => {
  const map: Record<string, string> = {}
  if (familiasRows.value) {
    for (const f of familiasRows.value) {
      map[f.id] = f.nombre
    }
  }
  return map
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
    <div v-else>
      <!-- First scroll: categories -->
      <CategorySelector
        v-model="displayCategory"
        :categories="categoryNames"
      />

      <!-- Second scroll: families (only when active category has families) -->
      <FamilySelector
        v-if="showFamilyScroll"
        v-model="activeFamily"
        :families="familiesForActive"
      />

      <ProductGrid :categories="filteredCategories" />
    </div>
  </div>
</template>
