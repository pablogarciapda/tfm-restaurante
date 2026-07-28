<!--
  FusionConfirmDialog.vue — Unfusion confirmation dialog (MFU-005)
-->
<script setup lang="ts">
import { ref } from 'vue'

interface ReservaStandby {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

interface AvailableTable {
  id: string
  numero_mesa: number
  capacidad_actual: number
  zona: string
}

const props = defineProps<{
  show: boolean
  reservations: ReservaStandby[]
  fusionId: string
  availableTables?: AvailableTable[]
}>()

const emit = defineEmits<{
  cancel: []
  standby: []
  reassign: [reservaId: string, mesaId: string]
  close: []
}>()

const selectedMesaId = ref('')

function handleReassign(reservaId: string) {
  if (!selectedMesaId.value) return
  emit('reassign', reservaId, selectedMesaId.value)
  selectedMesaId.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      data-testid="fusion-dialog"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="emit('close')" />

      <!-- Dialog -->
      <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 class="mb-4 font-serif text-lg font-bold text-slate-800">
          Reservas activas en esta fusión
        </h2>

        <p class="mb-4 text-sm text-slate-600">
          Hay {{ reservations.length }} reservas vinculadas a esta fusión. ¿Qué deseas hacer?
        </p>

        <!-- Reservation list -->
        <div class="mb-6 max-h-40 space-y-2 overflow-y-auto">
          <div
            v-for="reserva in reservations"
            :key="reserva.id"
            class="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm"
          >
            <span class="font-medium text-slate-700">{{ reserva.nombre_cliente }}</span>
            <span class="ml-2 text-slate-500">
              — {{ new Date(reserva.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
            </span>
            <span class="ml-2 text-slate-500">· {{ reserva.numero_comensales }} pax</span>

            <!-- Reassign to individual table -->
            <div v-if="availableTables && availableTables.length > 0" class="mt-2 flex items-center gap-2">
              <select
                v-model="selectedMesaId"
                class="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="" disabled>Reasignar a mesa...</option>
                <option
                  v-for="t in availableTables.filter(t => t.capacidad_actual >= reserva.numero_comensales)"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.zona }} — Mesa {{ t.numero_mesa }} ({{ t.capacidad_actual }} pax)
                </option>
              </select>
              <button
                class="rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                :disabled="!selectedMesaId"
                @click="handleReassign(reserva.id)"
              >
                Reasignar
              </button>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap justify-end gap-2">
          <button
            data-testid="btn-cancel"
            class="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            @click="emit('cancel')"
          >
            Cancelar reservas y notificar
          </button>

          <button
            data-testid="btn-standby"
            class="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            @click="emit('standby')"
          >
            Mover a standby
          </button>

          <button
            data-testid="btn-close"
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            @click="emit('close')"
          >
            No desfusionar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
