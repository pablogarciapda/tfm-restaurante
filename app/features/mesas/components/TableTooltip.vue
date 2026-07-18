<!--
  TableTooltip.vue — Hover card showing full table data (MCA-009)

  Renders an HTML overlay card with mesa info, status, reservation
  details, and fusion info. Positioned by parent via style binding.

  Props:
    data — TooltipData with mesa, estado, reserva, fusionMesas
-->
<script setup lang="ts">
import type { Mesa, MesaEstado } from '#shared/contracts/mesas.contract'

export interface TooltipReservaDetail {
  nombre_cliente: string
  hora: string
  comensales: number
  referencia: string
  fecha: string
  turno: 'comida' | 'cena'
}

export interface TooltipData {
  mesa: Mesa
  estado: MesaEstado
  reservas?: TooltipReservaDetail[]
  /** Sorted mesa numbers in the fusion group */
  fusionMesas?: number[]
  /** Combined capacity when fused */
  fusionCapacidad?: number
}

defineProps<{
  data: TooltipData
}>()

const STATUS_LABELS: Record<MesaEstado, { label: string; color: string }> = {
  libre: { label: 'Libre', color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
  reservada: { label: 'Reservada', color: '#F59E0B' },
}

const TURNO_LABELS: Record<string, { label: string; bg: string }> = {
  comida: { label: 'M', bg: '#EF4444' },
  cena: { label: 'T', bg: '#EF4444' },
}
</script>

<template>
  <div
    class="min-w-[220px] max-w-[280px] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5"
  >
    <!-- Header: mesa number + fusion badge -->
    <div class="border-b border-gray-100 px-4 py-2.5">
      <div class="flex items-center gap-2">
        <span class="text-base font-bold text-slate">
          Mesa {{ data.mesa.numero_mesa }}
        </span>
        <span
          v-if="data.mesa.id_fusion"
          class="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-medium leading-none text-purple-700"
        >
          Fusionada
        </span>
      </div>
    </div>

    <!-- Body: info rows -->
    <div class="space-y-1.5 px-4 py-2.5 text-sm">
      <!-- Capacidad -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-gray-500">Capacidad</span>
        <span class="font-medium text-slate">
          {{ data.mesa.capacidad_base }} pax
          <span v-if="data.fusionCapacidad" class="text-gray-400">
            → {{ data.fusionCapacidad }} pax
          </span>
        </span>
      </div>

      <!-- Zona -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-gray-500">Zona</span>
        <span class="font-medium text-slate">{{ data.mesa.zona }}</span>
      </div>

      <!-- Estado -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-gray-500">Estado</span>
        <span class="flex items-center gap-1.5 font-medium">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: STATUS_LABELS[data.estado].color }"
          />
          {{ STATUS_LABELS[data.estado].label }}
        </span>
      </div>

      <!-- Reservation details (may be multiple for same table) -->
      <template v-if="data.reservas && data.reservas.length > 0">
        <hr class="border-gray-100">
        <div
          v-for="(r, i) in data.reservas"
          :key="i"
          class="space-y-1"
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              :style="{ backgroundColor: TURNO_LABELS[r.turno].bg }"
            >
              {{ TURNO_LABELS[r.turno].label }}
            </span>
            <span class="text-xs font-medium text-gray-500">{{ r.referencia }}</span>
          </div>
          <div class="ml-7 space-y-0.5">
            <div class="flex items-center justify-between gap-4">
              <span class="text-gray-500">Cliente</span>
              <span class="truncate font-medium text-slate">{{ r.nombre_cliente }}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-gray-500">Día</span>
              <span class="font-medium text-slate">{{ r.fecha }}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-gray-500">Hora</span>
              <span class="font-medium text-slate">{{ r.hora }}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-gray-500">Comensales</span>
              <span class="font-medium text-slate">{{ r.comensales }}</span>
            </div>
          </div>
          <hr v-if="i < data.reservas.length - 1" class="border-gray-100">
        </div>
      </template>

      <!-- Fusion composition -->
      <template v-if="data.fusionMesas && data.fusionMesas.length > 0">
        <hr class="border-gray-100">
        <div class="flex items-center justify-between gap-4">
          <span class="text-gray-500">Mesas unidas</span>
          <span class="font-medium text-slate">
            {{ data.fusionMesas.join(' + ') }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
