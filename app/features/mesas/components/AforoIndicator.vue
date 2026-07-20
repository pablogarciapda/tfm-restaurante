<!--
  AforoIndicator.vue — Occupancy progress bar + counter (MCA-006)

  Props: aforoInfo (AforoInfo)
  Emits: mode-change ('auto' | 'manual'), manual-change (number)

  Dual mode: auto (SUM capacidad_actual) / manual (admin input).
  Progress bar color: green <70%, yellow 70-90%, red >90%.
  Spanish labels: "Aforo", "Automático", "Manual", "Ocupación manual".
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { AforoInfo, AforoMode } from '#shared/contracts/mesas.contract'

const props = defineProps<{
  aforoInfo: AforoInfo
  loading?: boolean
}>()

const emit = defineEmits<{
  'mode-change': [mode: AforoMode]
  'manual-change': [value: number]
}>()

const ocupacion = computed(() => {
  return props.aforoInfo.modo === 'manual'
    ? props.aforoInfo.ocupacion_manual
    : props.aforoInfo.ocupacion_auto
})

/** MFU-008: overflow when explicit flag set OR ocupacion exceeds capacidad_total */
const overflow = computed(() => {
  return props.aforoInfo.overflow === true
    || ocupacion.value > props.aforoInfo.capacidad_total
})

const porcentaje = computed(() => {
  if (props.aforoInfo.capacidad_total === 0) return 0
  return Math.min(100, (ocupacion.value / props.aforoInfo.capacidad_total) * 100)
})

const barColor = computed(() => {
  if (overflow.value) return 'bg-red-600'
  if (porcentaje.value > 90) return 'bg-red-500'
  if (porcentaje.value > 70) return 'bg-yellow-500'
  return 'bg-green-500'
})

function onModeChange(mode: AforoMode) {
  emit('mode-change', mode)
}

function onManualChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('manual-change', Number(target.value))
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Label + Toggle -->
    <div class="flex items-center gap-2 text-xs font-medium text-slate-600">
      <span>Aforo</span>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="radio"
          name="modo-ocupacion"
          value="auto"
          :checked="aforoInfo.modo === 'auto'"
          class="h-3 w-3 accent-terracotta"
          @change="onModeChange('auto')"
        />
        <span>Automático</span>
      </label>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="radio"
          name="modo-ocupacion"
          value="manual"
          :checked="aforoInfo.modo === 'manual'"
          class="h-3 w-3 accent-terracotta"
          @change="onModeChange('manual')"
        />
        <span>Manual</span>
      </label>
    </div>

    <!-- Progress bar -->
    <div class="flex items-center gap-2">
      <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          :class="loading ? 'bg-gray-300 animate-pulse' : barColor"
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: loading ? '100%' : porcentaje + '%' }"
        />
      </div>
      <span
        class="text-xs font-semibold tabular-nums"
        :class="porcentaje > 90 ? 'text-red-600' : 'text-slate-700'"
      >
        <template v-if="loading">
          <span class="inline-block w-12 h-3 bg-gray-200 rounded animate-pulse align-middle" />
        </template>
        <template v-else>
          {{ ocupacion }} / {{ aforoInfo.capacidad_total }} plazas
        </template>
      </span>
    </div>

    <!-- Manual input (only visible in manual mode) -->
    <div v-if="aforoInfo.modo === 'manual'" class="flex items-center gap-2">
      <label class="text-xs text-slate-500">Ocupación manual</label>
      <input
        type="number"
        :value="aforoInfo.ocupacion_manual"
        min="0"
        :max="aforoInfo.capacidad_total"
        class="w-20 rounded border border-gray-300 px-2 py-0.5 text-xs focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta/30"
        @input="onManualChange"
      />
    </div>
  </div>
</template>
