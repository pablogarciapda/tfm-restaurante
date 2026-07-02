<!--
  FusionConfirmDialog.vue — Unfusion confirmation dialog (MFU-005)
-->
<script setup lang="ts">
interface ReservaStandby {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

defineProps<{
  show: boolean
  reservations: ReservaStandby[]
  fusionId: string
}>()

const emit = defineEmits<{
  cancel: []
  standby: []
  close: []
}>()
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
