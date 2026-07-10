<!--
  /cocina/diseno — Full-screen table layout designer (MCA-003, MCA-008)

  Admin-only page for designing table layouts. No sidebar (same hideSidebar
  pattern as /cocina/reservas). Zone tabs show only enabled zones — no "Todas".
  Canvas fills full available area after tabs.

  Wires: TableCanvas (designMode=true), TableToolbar (mode='diseno'),
         drawing mode, background upload, shape selector.
  No reservation functionality — pure layout editing.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import TableCanvas from '../../features/mesas/components/TableCanvas.vue'
import TableToolbar from '../../features/mesas/components/TableToolbar.vue'
import { useCanvasStore } from '../../features/mesas/stores/canvas-store'
import { useMesas } from '../../features/mesas/composables/useMesas'
import { getAforoDisponible } from '#shared/utils/fusion-math'
import type { AforoInfo, Mesa } from '#shared/contracts/mesas.contract'
import type { FormaMesa } from '#shared/contracts/mesas.contract'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()
const store = useCanvasStore()
const { loadMesas, createMesa, deleteMesa, subscribeRealtime, unsubscribeRealtime } = useMesas()

// ── Admin guard ──
const role = useState<string>('cocina-role')

// ── Zone config ──
interface ZonaOption {
  id: string
  nombre: string
  capacidad: number
  enabled: boolean
  imagen_url?: string | null
}

const zonasConfig = ref<ZonaOption[]>([])

async function loadZonasConfig() {
  try {
    const { data } = await client
      .from('configuracion')
      .select('zonas_config')
      .single()
    if (data?.zonas_config) {
      zonasConfig.value = (data.zonas_config as unknown as ZonaOption[]).filter((z) => z.enabled)
    }
  } catch {
    zonasConfig.value = []
  }
}

// ── Aforo ──
const capacidadTotal = ref(80)
const modoOcupacion = ref<'auto' | 'manual'>('auto')
const ocupacionManual = ref(0)

async function loadConfiguracion() {
  try {
    const { data, error } = await client
      .from('configuracion')
      .select('capacidad_total_local, modo_ocupacion, ocupacion_manual')
      .single()
    if (error) throw error
    if (data) {
      capacidadTotal.value = data.capacidad_total_local ?? 80
      modoOcupacion.value = (data.modo_ocupacion ?? 'auto') as 'auto' | 'manual'
      ocupacionManual.value = data.ocupacion_manual ?? 0
    }
  } catch {
    // Keep defaults on error
  }
}

const aforoInfo = computed<AforoInfo>(() => {
  const disponible = getAforoDisponible(
    store.mesas,
    capacidadTotal.value,
    modoOcupacion.value,
    ocupacionManual.value,
  )
  const ocupacionAuto =
    store.mesas
      .filter((m) => m.mesa_padre_id === null)
      .reduce((sum, m) => sum + m.capacidad_actual, 0)
  return {
    modo: modoOcupacion.value,
    capacidad_total: capacidadTotal.value,
    ocupacion_auto: ocupacionAuto,
    ocupacion_manual: ocupacionManual.value,
    disponible,
  }
})

// ── Handlers ──

// Editable properties for selected mesa
const editNumero = ref<number | null>(null)
const editCapacidad = ref<number | null>(null)
const editError = ref('')

function startEditMesa() {
  const mesa = store.selectedMesa
  if (!mesa) return
  editNumero.value = mesa.numero_mesa
  editCapacidad.value = mesa.capacidad_base
  editError.value = ''
}

async function saveEditMesa() {
  const mesa = store.selectedMesa
  if (!mesa || editNumero.value == null || editCapacidad.value == null) return
  if (editNumero.value < 1 || editCapacidad.value < 1) {
    editError.value = 'Número y capacidad deben ser >= 1'
    return
  }
  await updateMesa(mesa.id, {
    numero_mesa: editNumero.value,
    capacidad_base: editCapacidad.value,
    capacidad_actual: editCapacidad.value,
  } as unknown as Partial<Mesa>)
  showToast('Mesa actualizada', 'success')
}

async function handleAddMesa(forma: string) {
  const activeZone = store.activeZona || zonasConfig.value[0]?.nombre || 'Principal'
  const nextNumero = store.mesas.length > 0
    ? Math.max(...store.mesas.map((m) => m.numero_mesa)) + 1
    : 1

  await createMesa({
    numero_mesa: nextNumero,
    capacidad_base: 4,
    posicion_x: 50,
    posicion_y: 50,
    ancho: 100,
    alto: 100,
    rotacion: 0,
    zona: activeZone,
    forma: forma as FormaMesa,
  })
}

async function handleDeleteMesa() {
  if (!store.selectedMesaId) return
  await deleteMesa(store.selectedMesaId)
}

const canvasRef = ref<any>(null)
const saving = ref(false)
async function handleSaveMesa() {
  saving.value = true
  try {
    const positions: Record<string, { x: number; y: number }> = canvasRef.value?.getMesaPositions?.() || {}
    for (const mesa of store.filteredMesas) {
      const pos = positions[mesa.id]
      await updateMesa(mesa.id, {
        posicion_x: pos?.x ?? mesa.posicion_x,
        posicion_y: pos?.y ?? mesa.posicion_y,
        ancho: mesa.ancho,
        alto: mesa.alto,
        rotacion: mesa.rotacion,
      } as unknown as Partial<Mesa>)
    }
    showToast('Posiciones guardadas', 'success')
  } catch {
    showToast('Error al guardar', 'error')
  } finally {
    saving.value = false
  }
}
let toastMessage = ref('')
let toastType = ref<'success' | 'error'>('success')
const toast = computed(() => toastMessage.value ? { message: toastMessage.value, type: toastType.value } : null)
function showToast(msg: string, type: 'success' | 'error') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

async function handleBackgroundImageUpload(url: string) {
  if (!url || !store.activeZona) return

  const zonas = zonasConfig.value.map((z) => {
    if (z.nombre === store.activeZona) {
      return { ...z, imagen_url: url }
    }
    return z
  })

  try {
    await $fetch('/api/config', {
      method: 'POST',
      body: { zonas_config: zonas },
    })
    zonasConfig.value = zonas as unknown as ZonaOption[]
  } catch (err) {
    console.error('Failed to save zone background image:', err)
  }
}

// ── Flash fix: set active zone immediately in setup ──
// Prevents "all zones visible" flash while data loads
store.activeZona = 'Principal'

// ── Lifecycle ──

onMounted(async () => {
  await loadConfiguracion()
  await loadZonasConfig()
  await loadMesas()
  subscribeRealtime()

  // Override with actual first enabled zone once config loads
  if (zonasConfig.value.length > 0) {
    store.activeZona = zonasConfig.value[0]!.nombre
  }
})

onUnmounted(() => {
  unsubscribeRealtime()
})
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Sticky header: zone tabs + toolbar + edit panel + drawing controls -->
    <div class="flex-shrink-0 space-y-3 bg-cream pb-2">
    <!-- Zone tabs — only enabled zones, no "Todas" -->
    <nav class="flex flex-wrap gap-2" aria-label="Zonas del local">
      <button
        v-for="zona in zonasConfig"
        :key="zona.id"
        class="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors"
        :class="store.activeZona === zona.nombre ? 'bg-terracotta text-white' : 'text-slate hover:bg-terracotta/10 hover:text-terracotta'"
        @click="store.activeZona = zona.nombre"
      >
        {{ zona.nombre }}
      </button>
    </nav>

    <!-- Toolbar in diseño mode -->
    <TableToolbar
      mode="diseno"
      :selected-mesa="store.selectedMesa"
      :aforo-info="aforoInfo"
      :is-drawing="store.isDrawing"
      :wall-lines-count="store.wallLines.length"
      :active-zona="store.activeZona || zonasConfig[0]?.nombre || ''"
      :saving="saving"
      @add="(forma: string) => handleAddMesa(forma)"
      @delete="handleDeleteMesa"
      @save="handleSaveMesa"
      @toggle-drawing="store.toggleDrawing()"
      @clear-walls="store.clearWallLines()"
      @background-image-uploaded="handleBackgroundImageUpload"
    />

    <!-- Edit panel for selected mesa -->
    <div
      v-if="store.selectedMesa"
      class="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-2 text-sm"
    >
      <span class="text-xs font-medium text-amber-800">Mesa {{ store.selectedMesa.numero_mesa }}</span>
      <label class="text-xs text-amber-700">
        Nº <input
          v-model.number="editNumero"
          type="number" min="1" max="99"
          class="ml-1 w-14 rounded border border-amber-300 px-1 py-0.5 text-xs"
          @focus="startEditMesa"
        />
      </label>
      <label class="text-xs text-amber-700">
        Cap. <input
          v-model.number="editCapacidad"
          type="number" min="1" max="20"
          class="ml-1 w-12 rounded border border-amber-300 px-1 py-0.5 text-xs"
          @focus="startEditMesa"
        />
      </label>
      <button
        class="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700"
        @click="saveEditMesa"
      >
        Actualizar
      </button>
      <span v-if="editError" class="text-xs text-red-600">{{ editError }}</span>
    </div>

    <!-- Drawing mode toggle (only visible when drawing is active) -->
    <div v-if="store.isDrawing" class="flex items-center gap-2">
      <button
        class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="store.straightLine ? 'bg-terracotta text-white' : 'bg-slate-100 text-slate hover:bg-slate-200'"
        @click="store.straightLine = true"
        title="Dibujar líneas rectas — clic para empezar, clic para terminar"
      >
        Línea recta
      </button>
      <button
        class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="!store.straightLine ? 'bg-terracotta text-white' : 'bg-slate-100 text-slate hover:bg-slate-200'"
        @click="store.straightLine = false"
        title="Dibujo libre a mano alzada"
      >
        Dibujo libre
      </button>
    </div>
    </div> <!-- end sticky header -->

    <!-- Scrollable canvas -->
    <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <TableCanvas
        ref="canvasRef"
        :zonas-config="zonasConfig"
        :design-mode="true"
        :single-zone="true"
      />
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="toast"
        class="fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
        :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>
