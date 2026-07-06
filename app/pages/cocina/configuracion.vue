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
}

const config = ref<ConfigData>({
  cliente_elige_mesa: false,
  capacidad_total_local: 80,
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

// ── Category management ──

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
    const toUpsert = categorias.value.filter((c) => !c._deleted)

    // Validate
    for (const cat of toUpsert) {
      if (!cat.nombre.trim()) {
        categoryError.value = 'Todas las categorías deben tener nombre'
        categorySaving.value = false
        return
      }
    }

    // Delete marked categories
    for (const cat of toDelete) {
      await client.from('categorias').delete().eq('id', cat.id!)
    }

    // Upsert: INSERT new (no id), UPDATE existing (has id)
    for (const cat of toUpsert) {
      const payload = { nombre: cat.nombre.trim().toUpperCase(), puesto: cat.puesto }
      if (cat.id) {
        await client.from('categorias').update(payload).eq('id', cat.id)
      } else {
        await client.from('categorias').insert(payload)
      }
    }

    await loadCategories()
  } catch (err) {
    categoryError.value = 'Error al guardar categorías'
  } finally {
    categorySaving.value = false
  }
}

onMounted(() => {
  loadConfig()
  loadCategories()
})
</script>

<template>
  <div class="space-y-6">
    <ConfiguracionForm :current-config="config" :saving="saving" @submit="handleSubmit" />

    <!-- Category Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Gestión de Categorías</h2>

      <p class="mb-4 text-xs text-gray-400">El número es el orden de aparición (menor = primero). Los nombres se guardan automáticamente en MAYÚSCULAS.</p>

      <!-- Category rows -->
      <div class="space-y-3">
        <div
          v-for="(cat, index) in categorias"
          :key="index"
          class="flex items-center gap-3"
        >
          <template v-if="!cat._deleted">
            <input
              :value="cat.nombre"
              @input="cat.nombre = ($event.target as HTMLInputElement).value.toUpperCase()"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Nombre de categoría"
            />
            <input
              v-model.number="cat.puesto"
              type="number"
              step="10"
              min="0"
              class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Orden"
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
