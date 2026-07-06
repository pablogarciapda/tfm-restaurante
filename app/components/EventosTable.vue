<!--
  EventosTable — Sortable eventos table (CEV-001, CEV-003)
-->
<script setup lang="ts">
interface CategoriaEvento {
  id: string
  nombre: string
}

interface Evento {
  id: string
  titulo: string
  fecha: string
  categoria_id: string
  activo: boolean
  estado?: string
}

const props = defineProps<{
  eventos: Evento[]
  categorias: Record<string, string>
}>()
const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  'toggle-activo': [id: string, value: boolean]
}>()

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-white shadow">
    <div v-if="eventos.length === 0" class="px-6 py-12 text-center text-gray-500">
      <p class="text-lg">No hay eventos. Crea el primero.</p>
    </div>

    <table v-else class="w-full text-left text-sm">
      <thead class="bg-cream">
        <tr>
          <th class="px-4 py-3 font-medium text-slate">Título</th>
          <th class="px-4 py-3 font-medium text-slate">Fecha</th>
          <th class="px-4 py-3 font-medium text-slate">Categoría</th>
          <th class="px-4 py-3 font-medium text-slate">Activo</th>
          <th class="px-4 py-3 text-right font-medium text-slate">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr v-for="ev in eventos" :key="ev.id" class="hover:bg-cream/50">
          <td class="px-4 py-3 font-medium text-slate">{{ ev.titulo }}</td>
          <td class="px-4 py-3 text-gray-600">{{ formatFecha(ev.fecha) }}</td>
          <td class="px-4 py-3">
            <span class="rounded-full bg-cream px-2 py-0.5 text-xs text-slate">{{ props.categorias[ev.categoria_id] ?? ev.categoria_id }}</span>
          </td>
          <td class="px-4 py-3">
            <button
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="ev.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              @click="emit('toggle-activo', ev.id, !ev.activo)"
            >
              {{ ev.activo ? 'Activo' : 'Inactivo' }}
            </button>
          </td>
          <td class="px-4 py-3 text-right">
            <button data-testid="edit-evento" class="mr-2 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" @click="emit('edit', ev.id)">Editar</button>
            <button data-testid="delete-evento" class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="emit('delete', ev.id)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
