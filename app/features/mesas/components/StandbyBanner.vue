<!--
  StandbyBanner.vue — Floating banner for standby reservations (MFU-006)

  Persistent banner at top of canvas area showing standby reservations.
  Each shows client name, date, pax, and "Asignar mesa" button.
  Styled with amber/yellow warning background.
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
  reservations: ReservaStandby[]
}>()

const emit = defineEmits<{
  assign: [reservaId: string]
}>()
</script>

<template>
  <div class="mb-2">
    <!-- Empty state -->
    <p
      v-if="reservations.length === 0"
      class="rounded-md bg-slate-100 px-4 py-2 text-center text-sm text-slate-500"
    >
      No hay reservas pendientes
    </p>

    <!-- Reservation items -->
    <div v-else class="space-y-2 rounded-md bg-amber-50 p-3 shadow-sm">
      <h3 class="mb-2 text-sm font-semibold text-amber-800">
        Reservas pendientes de asignación
      </h3>

      <div
        v-for="reserva in reservations"
        :key="reserva.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white px-3 py-2 text-sm"
      >
        <div class="flex flex-wrap items-center gap-x-2 text-slate-700">
          <span class="font-medium">{{ reserva.nombre_cliente }}</span>
          <span class="text-slate-400">
            — {{ new Date(reserva.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
          </span>
          <span class="text-slate-400">· {{ reserva.numero_comensales }} pax</span>
        </div>

        <button
          class="rounded bg-terracotta px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-terracotta/90"
          @click="emit('assign', reserva.id)"
        >
          Asignar mesa
        </button>
      </div>
    </div>
  </div>
</template>
