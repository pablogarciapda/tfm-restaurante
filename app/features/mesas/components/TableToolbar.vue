<!--
  TableToolbar.vue — Canvas toolbar (MCA-003, Slice 4: fusion buttons, AD-14: shape selector)

  Props: mode ('diseno' | 'operacion'), selectedMesa, aforoInfo, fusion buttons, etc.
  Emits: add(shape), delete, save, fuse, unfuse, etc.

  Mode separation: diseno (layout editing) vs operación (reservations + fusion).
  'diseno' mode: shape selector, add/delete/save, drawing mode, background upload.
  'operacion' mode: fuse/unfuse buttons, turno filter, aforo indicator.
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Mesa, AforoInfo, FormaMesa } from '#shared/contracts/mesas.contract'
import type { TurnoFilter } from '../stores/canvas-store'
import AforoIndicator from './AforoIndicator.vue'

const props = defineProps<{
  mode: 'diseno' | 'operacion'
  selectedMesa: Mesa | null
  aforoInfo: AforoInfo
  // Fusion (operación mode)
  canFuse?: boolean
  canUnfuse?: boolean
  canFusionar?: boolean
  // Turn filter (operación mode)
  activeTurno?: TurnoFilter
  // Drawing / walls (diseño mode)
  isDrawing?: boolean
  wallLinesCount?: number
  activeZona?: string
  uploading?: boolean
  saving?: boolean
  fontSize?: number
  multiSelect?: boolean
  multiSelectCount?: number
}>()

const emit = defineEmits<{
  add: [shape: FormaMesa]
  delete: []
  save: []
  fuse: []
  unfuse: []
  'update:activeTurno': [value: TurnoFilter]
  toggleDrawing: []
  clearWalls: []
  backgroundImageUploaded: [url: string]
  'font-size-change': [size: number]
  'toggle-multi-select': []
}>()

const selectedForma = ref<FormaMesa>('cuadrada')
const fileInput = ref<HTMLInputElement | null>(null)

const { uploading, uploadFromFile } = useImageUpload({ bucket: 'config-images' })

async function handleImageUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = await uploadFromFile(file, `zona-${props.activeZona || 'fondo'}`)
  if (url) {
    emit('backgroundImageUploaded', url)
  }
  // Reset input so the same file can be re-selected
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

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
    class="z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-cream/95 p-4 shadow-sm backdrop-blur-sm"
  >
    <!-- Left: action buttons -->
    <div class="flex items-center gap-2">
      <!-- ============================================================ -->
      <!-- DISEÑO mode: shape selector, add, delete, save, draw, upload  -->
      <!-- ============================================================ -->
      <template v-if="mode === 'diseno'">
        <!-- Shape selector dropdown + add button -->
        <div class="flex items-center gap-1">
          <select
            v-model="selectedForma"
            class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-slate shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
            title="Forma de la mesa"
          >
            <option value="cuadrada">Cuadrada</option>
            <option value="redonda">Redonda</option>
            <option value="rectangular">Rectangular</option>
            <option value="ovalada">Ovalada</option>
          </select>
          <button
            class="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
            @click="emit('add', selectedForma)"
          >
            + Nueva Mesa
          </button>
        </div>

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

        <div class="flex items-center gap-1">
          <label class="text-xs text-gray-500">Texto</label>
          <select
            :value="fontSize"
            class="rounded border border-gray-300 px-1 py-1.5 text-xs"
            @change="emit('font-size-change', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="s in [10,11,12,13,14,16,18,20,22,24]" :key="s" :value="s">{{ s }}px</option>
          </select>
        </div>

        <button
          class="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/50 disabled:opacity-50"
          :disabled="saving"
          @click="emit('save')"
        >
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>

        <!-- Selected mesa info -->
        <span
          v-if="selectedMesa"
          class="ml-2 text-sm text-slate-500"
        >
          Mesa {{ selectedMesa.numero_mesa }}
        </span>

        <!-- Drawing mode button -->
        <button
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
          :class="
            isDrawing
              ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500/50'
              : 'bg-slate-100 text-slate hover:bg-slate-200 focus:ring-slate-500/50'
          "
          @click="emit('toggleDrawing')"
          title="Dibujar paredes y líneas"
        >
          Dibujar
        </button>

        <!-- Clear walls button (only if walls exist) -->
        <button
          v-if="wallLinesCount && wallLinesCount > 0"
          class="rounded-md bg-red-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          @click="emit('clearWalls')"
          title="Borrar todos los dibujos"
        >
          Borrar dibujo
        </button>

        <!-- Background image upload -->
        <div class="flex items-center gap-1">
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            class="hidden"
            @change="handleImageUpload"
          />
          <button
            :disabled="uploading || !activeZona"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-slate transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-terracotta/50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="fileInput?.click()"
            :title="activeZona ? `Subir imagen de fondo para ${activeZona}` : 'Selecciona una zona primero'"
          >
            {{ uploading ? 'Subiendo...' : 'Subir fondo' }}
          </button>
        </div>
      </template>

      <!-- ============================================================ -->
      <!-- OPERACIÓN mode: fuse, unfuse                                -->
      <!-- ============================================================ -->
      <template v-else>
        <button
          v-if="canFusionar"
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
          v-if="canFusionar"
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
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          :class="multiSelect ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-100'"
          @click="emit('toggle-multi-select')"
        >
          {{ multiSelect ? `Selec. (${multiSelectCount ?? 0})` : 'Selec.' }}
        </button>
      </template>
    </div>

    <!-- Center: Turn filter (operación mode only) -->
    <div
      v-if="mode === 'operacion'"
      class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5"
    >
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

    <!-- Right: Aforo (both modes) -->
    <div class="flex items-center gap-2">
      <AforoIndicator :aforo-info="aforoInfo" />
    </div>
  </div>
</template>
