<script setup lang="ts">
/**
 * ClientesTable — Admin clientes list with search + expandable history (CLI-001)
 *
 * Props: clientes (ClienteWithCount[]), loading
 * Emits: edit(cliente)
 */
import { ref, computed } from 'vue'
import type { ClienteWithCount, ReservaHistory } from '#shared/contracts/reservation.contract'

const props = defineProps<{
  clientes: ClienteWithCount[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [cliente: ClienteWithCount]
}>()

const search = ref('')
const expandedId = ref<string | null>(null)
const reservas = ref<ReservaHistory[]>([])
const reservasLoading = ref(false)

const filteredClientes = computed(() => {
  if (!search.value.trim()) return props.clientes

  const term = search.value.toLowerCase()
  return props.clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(term) ||
      (c.apellidos && c.apellidos.toLowerCase().includes(term)) ||
      c.telefono.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)),
  )
})

async function toggleExpand(clienteId: string) {
  if (expandedId.value === clienteId) {
    // Collapse
    expandedId.value = null
    reservas.value = []
    return
  }

  expandedId.value = clienteId
  reservasLoading.value = true

  try {
    const data = await $fetch<ReservaHistory[]>(
      `/api/cocina/clientes/${clienteId}/reservas`,
    )
    reservas.value = data || []
  } catch {
    reservas.value = []
  } finally {
    reservasLoading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function estadoBadge(estado: string | null): string {
  const map: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-800',
    completada: 'bg-blue-100 text-blue-800',
  }
  return map[estado || ''] || 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="rounded-lg bg-white shadow">
    <!-- Search bar -->
    <div class="border-b border-gray-200 px-4 py-3">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar cliente..."
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-8 text-center text-sm text-gray-400">
      Cargando...
    </div>

    <!-- Empty state -->
    <div v-else-if="!filteredClientes.length" class="p-8 text-center text-sm text-gray-400">
      No hay clientes registrados.
    </div>

    <!-- Client list -->
    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="cliente in filteredClientes"
        :key="cliente.id"
      >
        <!-- Client row -->
        <div
          class="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50"
          @click="toggleExpand(cliente.id)"
        >
          <div class="flex-1">
            <div class="font-medium text-slate">
              {{ cliente.nombre }}
              <span v-if="cliente.apellidos" class="text-gray-500">
                {{ cliente.apellidos }}
              </span>
            </div>
            <div class="text-sm text-gray-500">
              {{ cliente.telefono }}
              <span v-if="cliente.email"> · {{ cliente.email }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <span class="rounded-full bg-terracotta/10 px-2 py-1 text-xs font-medium text-terracotta">
              {{ cliente.reservas_count }} reserva{{ cliente.reservas_count !== 1 ? 's' : '' }}
            </span>

            <button
              type="button"
              class="rounded-lg px-2 py-1 text-sm text-gray-400 hover:text-terracotta"
              @click.stop="emit('edit', cliente)"
            >
              Editar
            </button>
          </div>
        </div>

        <!-- Expanded history -->
        <div
          v-if="expandedId === cliente.id"
          class="border-t border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div v-if="reservasLoading" class="py-2 text-center text-sm text-gray-400">
            Cargando reservas...
          </div>

          <div v-else-if="!reservas.length" class="py-2 text-center text-sm text-gray-400">
            Sin reservas registradas.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="r in reservas"
              :key="r.id"
              class="flex items-center justify-between rounded bg-white px-3 py-2 text-sm shadow-sm"
            >
              <span class="text-slate">{{ formatDateTime(r.fecha_hora) }}</span>
              <span>{{ r.numero_comensales }} comensales</span>
              <span
                :class="['rounded-full px-2 py-0.5 text-xs font-medium', estadoBadge(r.estado)]"
              >
                {{ r.estado || 'desconocido' }}
              </span>
              <span class="text-xs text-gray-400">#{{ r.id.slice(0, 8) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
