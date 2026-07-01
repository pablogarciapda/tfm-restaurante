<!--
  TableToolbar.vue — Canvas toolbar for table CRUD (MCA-003)

  Props: selectedMesa (Mesa | null), aforoInfo (AforoInfo)
  Emits: add, delete, save
  Contains AforoIndicator for occupancy display.
  Sticky top, terracotta/cream/slate palette.
-->
<script setup lang="ts">
import type { Mesa, AforoInfo } from '~/shared/contracts/mesas.contract'
import AforoIndicator from './AforoIndicator.vue'

defineProps<{
  selectedMesa: Mesa | null
  aforoInfo: AforoInfo
}>()

const emit = defineEmits<{
  add: []
  delete: []
  save: []
}>()
</script>

<template>
  <div
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-cream/95 p-4 shadow-sm backdrop-blur-sm"
  >
    <!-- Left: action buttons -->
    <div class="flex items-center gap-2">
      <button
        class="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        @click="emit('add')"
      >
        + Nueva Mesa
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

    <!-- Right: Aforo -->
    <div class="flex items-center gap-2">
      <AforoIndicator :aforo-info="aforoInfo" />
    </div>
  </div>
</template>
