<!--
  PlatosTable — Sortable platos table (CRUD-001, CRUD-004, CRUD-005)
  Columns: nombre, categoria, precio, disponible, acciones.
  Emits edit/delete for row actions.
-->
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Plato {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
  tipo_menu?: string
  puesto?: number
  recomendado?: boolean
}

const props = defineProps<{
  platos: Plato[]
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  'toggle-disponible': [id: string, value: boolean]
}>()

type SortField = 'nombre' | 'categoria' | 'precio' | 'tipo_menu' | 'disponible' | null
const sortField = ref<SortField>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

const sortedPlatos = computed(() => {
  if (!sortField.value) return props.platos
  const field = sortField.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.platos].sort((a, b) => {
    const aVal = a[field] ?? ''
    const bVal = b[field] ?? ''
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * dir
    }
    return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * dir
  })
})

function toggleSort(field: SortField) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function sortIndicator(field: SortField): string {
  if (sortField.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function formatPrecio(precio: number): string {
  return `${precio.toFixed(2).replace('.', ',')}€`
}
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-white shadow">
    <!-- Empty state -->
    <div
      v-if="sortedPlatos.length === 0"
      class="px-6 py-12 text-center text-gray-500"
    >
      <p class="text-lg">No hay platos. Crea el primero.</p>
    </div>

    <!-- Table -->
    <table v-else class="w-full text-left text-sm">
      <thead class="bg-cream">
        <tr>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            @click="toggleSort('nombre')"
          >
            Nombre <span class="text-xs text-gray-400">{{ sortIndicator('nombre') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            @click="toggleSort('categoria')"
          >
            Categoría <span class="text-xs text-gray-400">{{ sortIndicator('categoria') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            @click="toggleSort('precio')"
          >
            Precio <span class="text-xs text-gray-400">{{ sortIndicator('precio') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            @click="toggleSort('tipo_menu')"
          >
            Tipo <span class="text-xs text-gray-400">{{ sortIndicator('tipo_menu') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            @click="toggleSort('disponible')"
          >
            Disponible <span class="text-xs text-gray-400">{{ sortIndicator('disponible') }}</span>
          </th>
          <th class="sticky top-0 z-10 bg-cream px-4 py-3 font-medium text-slate">Recomendado</th>
          <th class="sticky top-0 z-10 bg-cream px-4 py-3 text-right font-medium text-slate">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr
          v-for="plato in sortedPlatos"
          :key="plato.id"
          class="hover:bg-cream/50 transition-colors"
        >
          <td class="px-4 py-3 font-medium text-slate">{{ plato.nombre }}</td>
          <td class="px-4 py-3 text-gray-600">{{ plato.categoria }}</td>
          <td class="px-4 py-3 font-medium text-terracotta">{{ formatPrecio(plato.precio) }}</td>
          <td class="px-4 py-3">
            <span class="rounded-full bg-cream px-2 py-0.5 text-xs text-slate">
              {{ plato.tipo_menu === 'menu_diario' ? 'Menú' : plato.tipo_menu === 'ambos' ? 'Ambos' : 'Carta' }}
            </span>
          </td>
          <td class="px-4 py-3">
            <button
              class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
              :class="plato.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              data-testid="toggle-disponible"
              @click="emit('toggle-disponible', plato.id, !plato.disponible)"
            >
              {{ plato.disponible ? 'Disponible' : 'No disponible' }}
            </button>
          </td>
          <td class="px-4 py-3">
            <span
              v-if="plato.recomendado"
              class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"
            >
              ★ Recomendado
            </span>
            <span v-else class="text-xs text-gray-400">—</span>
          </td>
          <td class="px-4 py-3 text-right">
            <button
              data-testid="edit-plato"
              class="mr-2 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
              @click="emit('edit', plato.id)"
            >
              Editar
            </button>
            <button
              data-testid="delete-plato"
              class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              @click="emit('delete', plato.id)"
            >
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
