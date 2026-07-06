<!--
  Configuracion Admin — System settings (CFG-001–CFG-003)
  Admin-only via permissions middleware.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()

interface ConfigData {
  id?: string
  cliente_elige_mesa: boolean
  capacidad_total_local: number
  precio_menu_diario?: number | null
  precio_menu_sabado?: number | null
  mostrar_recomendados: boolean
  titulo_recomendados: string
  modo_ocupacion: string
  ocupacion_manual: number
  // Image optimization
  max_ancho_imagen: number
  calidad_imagen: number
  max_peso_imagen: number
  auto_comprimir_imagen: boolean
}

const config = ref<ConfigData>({
  cliente_elige_mesa: false,
  capacidad_total_local: 80,
  mostrar_recomendados: true,
  titulo_recomendados: 'NUESTRAS RECOMENDACIONES',
  modo_ocupacion: 'auto',
  ocupacion_manual: 0,
  max_ancho_imagen: 1200,
  calidad_imagen: 80,
  max_peso_imagen: 5,
  auto_comprimir_imagen: true,
})

const saving = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3000)
}

async function loadConfig() {
  const { data } = await client.from('configuracion').select('*').limit(1).single()
  if (data) {
    config.value = data as ConfigData
  }
}

async function handleSubmit(formData: ConfigData) {
  saving.value = true
  try {
    if (config.value.id) {
      await client.from('configuracion').update(formData).eq('id', config.value.id)
    } else {
      await client.from('configuracion').insert(formData)
    }
    await loadConfig()
    showToast('Configuración guardada correctamente', 'success')
  } catch {
    showToast('Error al guardar la configuración', 'error')
  } finally {
    saving.value = false
  }
}

// ── Drag-and-drop helpers ──

interface DragState {
  index: number | null
  overIndex: number | null
}

const drag = ref<DragState>({ index: null, overIndex: null })

function onDragStart(index: number) {
  drag.value = { index, overIndex: null }
}

function onDragEnter(dropIndex: number) {
  const d = drag.value
  if (d.index === null || d.index === dropIndex) return
  d.overIndex = dropIndex
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

function onDragLeave() {
  if (drag.value.overIndex !== null) {
    drag.value.overIndex = null
  }
}

function onDrop<T extends { id?: string; nombre: string; puesto: number; _deleted?: boolean }>(
  event: DragEvent,
  dropIdx: number,
  arr: T[],
) {
  event.preventDefault()
  const d = drag.value
  if (d.index === null || d.index === dropIdx) {
    resetDrag()
    return
  }

  const [moved] = arr.splice(d.index, 1)
  arr.splice(dropIdx, 0, moved)
  resetDrag()
}

function onDragEnd() {
  resetDrag()
}

function resetDrag() {
  drag.value = { index: null, overIndex: null }
}

function dragClasses(index: number): string {
  const d = drag.value
  if (d.index === index) return 'opacity-40'
  if (d.overIndex === index) return 'border-t-2 border-terracotta'
  return ''
}

// ── Category management (platos) ──

interface CategoryRow {
  id?: string
  nombre: string
  puesto: number
  _deleted?: boolean
}

const categorias = ref<CategoryRow[]>([])
const categoryError = ref('')
const categorySaving = ref(false)

async function loadCategories() {
  const { data } = await client.from('categorias').select('*').order('puesto')
  if (data) {
    categorias.value = data.map((c) => ({ ...c, nombre: c.nombre.toUpperCase(), _deleted: false }))
  }
}

function addCategory() {
  categorias.value.push({ nombre: '', puesto: (categorias.value.length + 1) * 10 })
}

function removeCategory(index: number) {
  const cat = categorias.value[index]
  if (!cat || cat._deleted) return

  if (confirm('¿Eliminar esta categoría?')) {
    if (cat.id) {
      cat._deleted = true
    } else {
      categorias.value.splice(index, 1)
    }
  }
}

async function saveCategories() {
  categorySaving.value = true
  categoryError.value = ''

  try {
    const toDelete = categorias.value.filter((c) => c._deleted && c.id)
    const toUpsert = categorias.value
      .filter((c) => !c._deleted)
      .map((c, i) => ({ ...c, puesto: (i + 1) * 10 }))

    for (const cat of toUpsert) {
      if (!cat.nombre.trim()) {
        categoryError.value = 'Todas las categorías deben tener nombre'
        categorySaving.value = false
        return
      }
    }

    for (const cat of toDelete) {
      await client.from('categorias').delete().eq('id', cat.id!)
    }

    for (const cat of toUpsert) {
      const payload = { nombre: cat.nombre.trim().toUpperCase(), puesto: cat.puesto }
      if (cat.id) {
        await client.from('categorias').update(payload).eq('id', cat.id)
      } else {
        await client.from('categorias').insert(payload)
      }
    }

    await loadCategories()
  } catch {
    categoryError.value = 'Error al guardar categorías'
  } finally {
    categorySaving.value = false
  }
}

// ── Event category management ──

interface EventCategoryRow {
  id?: string
  nombre: string
  puesto: number
  _deleted?: boolean
}

const eventCategorias = ref<EventCategoryRow[]>([])
const eventCatError = ref('')
const eventCatSaving = ref(false)

async function loadEventCategorias() {
  const { data } = await client.from('categorias_eventos').select('*').order('puesto')
  if (data) {
    eventCategorias.value = data.map((c) => ({ ...c, _deleted: false }))
  }
}

function addEventCategory() {
  eventCategorias.value.push({ nombre: '', puesto: (eventCategorias.value.length + 1) * 10 })
}

function removeEventCategory(index: number) {
  const cat = eventCategorias.value[index]
  if (!cat || cat._deleted) return

  if (confirm('¿Eliminar esta categoría? Los eventos asignados se quedarán sin categoría.')) {
    if (cat.id) {
      cat._deleted = true
    } else {
      eventCategorias.value.splice(index, 1)
    }
  }
}

async function saveEventCategories() {
  eventCatSaving.value = true
  eventCatError.value = ''

  try {
    const toDelete = eventCategorias.value.filter((c) => c._deleted && c.id)
    const toUpsert = eventCategorias.value
      .filter((c) => !c._deleted)
      .map((c, i) => ({ ...c, puesto: (i + 1) * 10 }))

    for (const cat of toUpsert) {
      if (!cat.nombre.trim()) {
        eventCatError.value = 'Todas las categorías deben tener nombre'
        eventCatSaving.value = false
        return
      }
    }

    for (const cat of toDelete) {
      await client.from('eventos').update({ categoria_id: null }).eq('categoria_id', cat.id!)
      await client.from('categorias_eventos').delete().eq('id', cat.id!)
    }

    for (const cat of toUpsert) {
      const payload = { nombre: cat.nombre.trim(), puesto: cat.puesto }
      if (cat.id) {
        await client.from('categorias_eventos').update(payload).eq('id', cat.id)
      } else {
        await client.from('categorias_eventos').insert(payload)
      }
    }

    await loadEventCategorias()
  } catch {
    eventCatError.value = 'Error al guardar categorías de eventos'
  } finally {
    eventCatSaving.value = false
  }
}

onMounted(() => {
  loadConfig()
  loadCategories()
  loadEventCategorias()
})
</script>

<template>
  <div class="space-y-6">
    <ConfiguracionForm :current-config="config" :saving="saving" @submit="handleSubmit" />

    <!-- Category Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Gestión de Categorías</h2>

      <p class="mb-4 text-xs text-gray-400">
        Arrastra las categorías para reordenarlas. Los nombres se guardan automáticamente en MAYÚSCULAS.
      </p>

      <!-- Category rows -->
      <div class="space-y-1">
        <div
          v-for="(cat, index) in categorias"
          :key="index"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', dragClasses(index)]"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragenter="onDragEnter(index)"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index, categorias)"
          @dragend="onDragEnd"
        >
          <template v-if="!cat._deleted">
            <!-- Drag handle -->
            <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>

            <input
              :value="cat.nombre"
              @input="cat.nombre = ($event.target as HTMLInputElement).value.toUpperCase()"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Nombre de categoría"
            />
            <button
              type="button"
              class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
              @click="removeCategory(index)"
            >
              Eliminar
            </button>
          </template>
        </div>
      </div>

      <p v-if="categoryError" class="mt-2 text-sm text-red-600">{{ categoryError }}</p>

      <!-- Add category button -->
      <button
        type="button"
        class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta"
        @click="addCategory"
      >
        + Añadir categoría
      </button>

      <!-- Save button -->
      <div class="mt-6">
        <button
          type="button"
          class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
          :disabled="categorySaving"
          @click="saveCategories"
        >
          {{ categorySaving ? 'Guardando...' : 'Guardar categorías' }}
        </button>
      </div>
    </div>

    <!-- Event Category Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Categorías de Eventos</h2>

      <p class="mb-4 text-xs text-gray-400">
        Arrastra las categorías para reordenarlas.
      </p>

      <div class="space-y-1">
        <div
          v-for="(cat, index) in eventCategorias"
          :key="index"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', dragClasses(index)]"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragenter="onDragEnter(index)"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index, eventCategorias)"
          @dragend="onDragEnd"
        >
          <template v-if="!cat._deleted">
            <!-- Drag handle -->
            <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>

            <input
              :value="cat.nombre"
              @input="cat.nombre = ($event.target as HTMLInputElement).value"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nombre de categoría"
            />
            <button
              type="button"
              class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
              @click="removeEventCategory(index)"
            >
              Eliminar
            </button>
          </template>
        </div>
      </div>

      <p v-if="eventCatError" class="mt-2 text-sm text-red-600">{{ eventCatError }}</p>

      <button
        type="button"
        class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta"
        @click="addEventCategory"
      >
        + Añadir categoría
      </button>

      <div class="mt-6">
        <button
          type="button"
          class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
          :disabled="eventCatSaving"
          @click="saveEventCategories"
        >
          {{ eventCatSaving ? 'Guardando...' : 'Guardar categorías de eventos' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <Teleport to="body">
    <div
      v-if="toast"
      class="fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all"
      :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>
