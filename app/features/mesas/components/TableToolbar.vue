<!--
  TableToolbar.vue — Canvas toolbar (MCA-003, Slice 4: fusion buttons, AD-14: shape selector)

  Props: selectedMesa, aforoInfo, fusionMode, canFuse, canUnfuse
  Emits: add(shape), delete, save, fuse, unfuse
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Mesa, AforoInfo, FormaMesa } from '#shared/contracts/mesas.contract'
import type { TurnoFilter } from '../stores/canvas-store'
import AforoIndicator from './AforoIndicator.vue'

const props = defineProps<{
  selectedMesa: Mesa | null
  aforoInfo: AforoInfo
  fusionMode?: boolean
  canFuse?: boolean
  canUnfuse?: boolean
  activeTurno?: TurnoFilter
}>()

const emit = defineEmits<{
  add: [shape: FormaMesa]
  delete: []
  save: []
  fuse: []
  unfuse: []
  'update:activeTurno': [value: TurnoFilter]
}>()

const selectedForma = ref<FormaMesa>('rectangular')

const turnoOptions: { value: TurnoFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'comida', label: 'Comida' },
  { value: 'cena', label: 'Cena' },
]

const activeTurnoValue = computed({
  get: () => props.activeTurno ?? 'todos',
  set: (val: TurnoFilter) => emit('update:activeTurno', val),
})
</script>

<template>
  <div
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-cream/95 p-4 shadow-sm backdrop-blur-sm"
  >
    <!-- Left: action buttons -->
    <div class="flex items-center gap-2">
      <!-- Shape selector dropdown + add button -->
      <div class="flex items-center gap-1">
        <select
          v-model="selectedForma"
          class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-slate shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
          title="Forma de la mesa"
        >
          <option value="rectangular">Rectangular</option>
          <option value="cuadrada">Cuadrada</option>
          <option value="redonda">Redonda</option>
          <option value="ovalada">Ovalada</option>
        </select>
        <button
          class="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
          @click="emit('add', selectedForma)"
        >
          + Nueva Mesa
        </button>
      </div>

      <!-- Fusion buttons (Slice 4) -->
      <button
        :disabled="!canFuse"
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
        :class="
          canFuse
            ? 'bg-terracotta/80 text-white hover:bg-terracotta focus:ring-terracotta/50'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
        "
        @click="canFuse && emit('fuse')"
      >
        Fusionar
      </button>

      <button
        :disabled="!canUnfuse"
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
        :class="
          canUnfuse
            ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500/50'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
        "
        @click="canUnfuse && emit('unfuse')"
      >
        Desfusionar
      </button>

      <button
        :disabled="!selectedMesa"
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
        :class="
          selectedMesa
            ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/50'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
        "
        @click="selectedMesa && emit('delete')"
      >
        Eliminar
      </button>

      <button
        class="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
        @click="emit('save')"
      >
        Guardar
      </button>

      <!-- Selected mesa info -->
      <span
        v-if="selectedMesa"
        class="ml-2 text-sm text-slate-500"
      >
        Mesa {{ selectedMesa.numero_mesa }}
      </span>
    </div>

    <!-- Center: Turn filter -->
    <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        v-for="opt in turnoOptions"
        :key="opt.value"
        type="button"
        class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          activeTurnoValue === opt.value
            ? 'bg-terracotta text-white shadow-sm'
            : 'text-slate hover:bg-gray-100'
        "
        @click="activeTurnoValue = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Right: Aforo -->
    <div class="flex items-center gap-2">
      <AforoIndicator :aforo-info="aforoInfo" />
    </div>
  </div>
</template>
