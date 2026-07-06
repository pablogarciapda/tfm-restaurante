<!--
  Carta Admin — CRUD platos management (CRUD-001–CRUD-005)
  Middleware: auth → role → permissions
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Database } from '~/types/database.types'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const supabase = useSupabaseClient<Database>()

interface Plato {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
  tipo_menu: string
  puesto: number
  descripcion?: string
  imagen_url?: string
  calorias?: number
  alergenos?: string[]
  recomendado?: boolean
}

const platos = ref<Plato[]>([])
const categoriasData = ref<{ id: string; nombre: string; puesto: number }[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingPlato = ref<Plato | null>(null)
const savingOrder = ref(false)

// ── Filters ──
const searchTerm = ref('')
const categoriaFilter = ref('')

// Drag mode: enabled only when filtering by a single category (no search active)
const isDraggable = computed(() => !!categoriaFilter.value && !searchTerm.value.trim() && !showForm.value)

// Filter categories from the official categorias table, not platos
const categorias = computed(() =>
  categoriasData.value.map((c) => c.nombre)
)

const filteredPlatos = computed(() => {
  let result = platos.value
  if (searchTerm.value.trim()) {
    const q = searchTerm.value.trim().toLowerCase()
    result = result.filter((p) => p.nombre.toLowerCase().includes(q))
  }
  if (categoriaFilter.value) {
    result = result.filter((p) => p.categoria === categoriaFilter.value)
  }
  return result
})

async function loadPlatos() {
  loading.value = true
  const { data, error } = await supabase
    .from('platos')
    .select('*')
    .order('puesto')

  if (!error && data) {
    platos.value = data as Plato[]
  }
  loading.value = false
}

async function loadCategories() {
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .order('puesto')
  if (data) {
    categoriasData.value = data
  }
}

async function handleCreate(data: Record<string, unknown>) {
  const { error } = await supabase.from('platos').insert(data as Database['public']['Tables']['platos']['Insert'])
  if (!error) {
    showForm.value = false
    await loadPlatos()
  }
}

async function handleUpdate(data: Record<string, unknown>) {
  const { error } = await supabase
    .from('platos')
    .update(data as Database['public']['Tables']['platos']['Update'])
    .eq('id', editingPlato.value!.id)

  if (!error) {
    showForm.value = false
    editingPlato.value = null
    await loadPlatos()
  }
}

function handleEdit(id: string) {
  const plato = platos.value.find((p) => p.id === id)
  if (plato) {
    editingPlato.value = plato
    showForm.value = true
  }
}

async function handleDelete(id: string) {
  if (!confirm('¿Eliminar este plato?')) return

  const { error } = await supabase.from('platos').delete().eq('id', id)
  if (!error) {
    await loadPlatos()
  }
}

async function handleToggleDisponible(id: string, value: boolean) {
  await supabase.from('platos').update({ disponible: value } as Database['public']['Tables']['platos']['Update']).eq('id', id)
  await loadPlatos()
}

function handleSubmit(data: Record<string, unknown>) {
  if (editingPlato.value) {
    handleUpdate(data)
  } else {
    handleCreate(data)
  }
}

function handleCancel() {
  showForm.value = false
  editingPlato.value = null
}

async function handleReorder(platoIds: string[]) {
  savingOrder.value = true
  // Assign sequential puesto values based on visual order
  const updates = platoIds.map((id, index) =>
    supabase
      .from('platos')
      .update({ puesto: index + 1 })
      .eq('id', id),
  )

  // Fire all updates in parallel
  await Promise.all(updates)

  // Reload to sync local state with DB
  await loadPlatos()
  savingOrder.value = false
}

onMounted(() => {
  loadPlatos()
  loadCategories()
})

watch(showForm, (isOpen) => {
  if (isOpen) loadCategories()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Fixed toolbar: title + search + nuevo (outside scroll) -->
    <div class="flex-shrink-0 -mx-6 -mt-6 bg-cream px-6 pt-6 pb-3 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate">Gestión de Carta</h1>
        <button
          v-if="!showForm"
          class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
          @click="showForm = true"
        >
          + Nuevo plato
        </button>
      </div>

      <!-- Search + filter bar -->
      <div class="flex flex-wrap gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar por nombre…"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate placeholder-gray-400 focus:border-terracotta focus:outline-none"
          />
        </div>
        <select
          v-model="categoriaFilter"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate focus:border-terracotta focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
        </select>

        <span v-if="!showForm" class="text-sm text-gray-400 self-center">
          {{ filteredPlatos.length }} platos
        </span>
      </div>
    </div>

    <!-- Scrollable area: form or table -->
    <div v-if="showForm" class="-mx-6 px-6 pt-6 overflow-y-auto">
      <PlatoForm
        :initial-plato="editingPlato ?? undefined"
        :categories="categoriasData"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <!-- Table block with optional drag hint + sticky column headers -->
    <div v-else class="flex flex-col flex-1 overflow-y-auto min-h-0 -mx-6 px-6 pb-6">
      <!-- Drag-mode hint (only when filtering by category) -->
      <div
        v-if="isDraggable"
        class="pt-3 pb-2 flex-shrink-0"
      >
        <div class="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>↕</span>
          <span>
            Arrastra los platos para reordenarlos en
            <strong class="font-semibold">{{ categoriaFilter }}</strong>
          </span>
          <span v-if="savingOrder" class="ml-auto text-amber-600">Guardando…</span>
          <span v-else class="ml-auto text-amber-500 text-xs">Los cambios se guardan al soltar</span>
        </div>
      </div>
      <PlatosTable
        :platos="filteredPlatos"
        :draggable="isDraggable"
        @edit="handleEdit"
        @delete="handleDelete"
        @toggle-disponible="handleToggleDisponible"
        @reorder="handleReorder"
      />
    </div>
  </div>
</template>
