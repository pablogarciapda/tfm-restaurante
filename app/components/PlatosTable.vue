<!--
  PlatosTable — Sortable platos table with drag-and-drop reorder (CRUD-001, CRUD-004, CRUD-005)
  Props: platos, draggable (enable DnD reorder when filtering by category).
  Emits edit/delete/toggle-disponible for row actions.
  Emits reorder(newOrder: string[]) when drag completes — array of plato IDs in new visual order.
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
  draggable?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  'toggle-disponible': [id: string, value: boolean]
  reorder: [platoIds: string[]]
}>()

// ── Sort (only when NOT in drag mode) ──
type SortField = 'nombre' | 'categoria' | 'precio' | 'tipo_menu' | 'disponible' | null
const sortField = ref<SortField>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

const sortedPlatos = computed(() => {
  // In drag mode: show platos in DB order (no user sorting)
  if (props.draggable) return props.platos
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
  if (props.draggable) return // no sort during drag mode
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function sortIndicator(field: SortField): string {
  if (props.draggable) return ''
  if (sortField.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function formatPrecio(precio: number): string {
  return `${precio.toFixed(2).replace('.', ',')}€`
}

// ── Drag & Drop state ──
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const localOrder = ref<string[] | null>(null)

const displayPlatos = computed(() => {
  if (!localOrder.value || !props.draggable) return sortedPlatos.value
  return localOrder.value
    .map((id) => props.platos.find((p) => p.id === id))
    .filter(Boolean) as Plato[]
})

function onDragStart(event: DragEvent, index: number) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return
  dragOverIndex.value = index
  event.dataTransfer!.dropEffect = 'move'
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(event: DragEvent, dropIdx: number) {
  event.preventDefault()
  const fromIdx = dragIndex.value
  if (fromIdx === null || fromIdx === dropIdx) {
    resetDrag()
    return
  }

  // Build new order based on current display order
  const currentOrder = displayPlatos.value.map((p) => p.id)
  const [moved] = currentOrder.splice(fromIdx, 1)
  currentOrder.splice(dropIdx, 0, moved)
  localOrder.value = currentOrder

  // Emit the new order so parent can save
  emit('reorder', currentOrder)

  resetDrag()
}

function onDragEnd() {
  resetDrag()
}

function resetDrag() {
  dragIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="rounded-lg bg-white shadow">
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
          <!-- Drag handle column header (only in drag mode) -->
          <th v-if="draggable" class="sticky top-0 z-10 w-10 bg-cream px-2 py-3"></th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            :class="{ 'cursor-default hover:bg-cream': draggable }"
            @click="toggleSort('nombre')"
          >
            Nombre <span class="text-xs text-gray-400">{{ sortIndicator('nombre') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            :class="{ 'cursor-default hover:bg-cream': draggable }"
            @click="toggleSort('categoria')"
          >
            Categoría <span class="text-xs text-gray-400">{{ sortIndicator('categoria') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            :class="{ 'cursor-default hover:bg-cream': draggable }"
            @click="toggleSort('precio')"
          >
            Precio <span class="text-xs text-gray-400">{{ sortIndicator('precio') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            :class="{ 'cursor-default hover:bg-cream': draggable }"
            @click="toggleSort('tipo_menu')"
          >
            Tipo <span class="text-xs text-gray-400">{{ sortIndicator('tipo_menu') }}</span>
          </th>
          <th
            class="sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap bg-cream px-4 py-3 font-medium text-slate transition-colors hover:bg-gray-200"
            :class="{ 'cursor-default hover:bg-cream': draggable }"
            @click="toggleSort('disponible')"
          >
            Disponible <span class="text-xs text-gray-400">{{ sortIndicator('disponible') }}</span>
          </th>
          <th class="sticky top-0 z-10 bg-cream px-2 py-3 text-center font-medium text-slate">Recom</th>
          <th class="sticky top-0 z-10 bg-cream px-4 py-3 text-right font-medium text-slate">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr
          v-for="(plato, index) in displayPlatos"
          :key="plato.id"
          :draggable="draggable"
          class="transition-colors"
          :class="{
            'hover:bg-cream/50': !draggable,
            'cursor-grab active:cursor-grabbing': draggable,
            'opacity-40': draggable && dragIndex === index,
            'border-t-2 border-terracotta': draggable && dragOverIndex === index,
          }"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
        >
          <!-- Drag handle -->
          <td v-if="draggable" class="w-10 px-2 py-3 text-center text-gray-400 select-none">
            ⠿
          </td>
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
          <td class="px-2 py-3 text-center text-base">
            <span v-if="plato.recomendado" class="text-yellow-500">★</span>
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
