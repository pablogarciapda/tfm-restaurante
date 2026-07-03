<!--
  /cocina/reservas — Interactive table manager (MCA-008, Slice 4: fusion)

  Permission-controlled SPA-only page (ssr:false via routeRules).
  Wires: TableCanvas, TableToolbar, FusionConfirmDialog, StandbyBanner.
  Realtime sync from useMesas composable.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import TableCanvas from '../../features/mesas/components/TableCanvas.vue'
import TableToolbar from '../../features/mesas/components/TableToolbar.vue'
import FusionConfirmDialog from '../../features/mesas/components/FusionConfirmDialog.vue'
import StandbyBanner from '../../features/mesas/components/StandbyBanner.vue'
import { useCanvasStore } from '../../features/mesas/stores/canvas-store'
import { useMesas } from '../../features/mesas/composables/useMesas'
import { useMesasFusion } from '../../features/mesas/composables/useMesasFusion'
import { getAforoDisponible } from '#shared/utils/fusion-math'
import type { AforoInfo } from '#shared/contracts/mesas.contract'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()
const store = useCanvasStore()
const { loadMesas, createMesa, deleteMesa, subscribeRealtime, unsubscribeRealtime } = useMesas()
const {
  fuseMesas,
  unfuseMesas,
  cancelReservationsAndUnfuse,
  moveReservationsToStandby,
  getStandbyReservations,
  reassignStandbyReservation,
} = useMesasFusion()

// ── Fusion state ──
const selectedIds = ref<string[]>([])
const fusionDialogShow = ref(false)
const fusionDialogReservations = ref<Array<{
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}>>([])
const fusionDialogFusionId = ref('')
const standbyReservations = ref<Array<{
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}>>([])

// ── Multi-select helpers (Slice 4) ──
// Note: _toggleSelection is used by TableCanvas via callback/event
// for multi-select with shift+click on canvas tables.
function _toggleSelection(mesaId: string) {
  const idx = selectedIds.value.indexOf(mesaId)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(mesaId)
  }
}

function selectedMesas() {
  return store.mesas.filter((m) => selectedIds.value.includes(m.id))
}

const canFuse = computed(() => {
  if (selectedIds.value.length < 2) return false
  const mesas = selectedMesas()
  if (mesas.length < 2) return false
  const firstZone = mesas[0].zona
  return mesas.every((m) => m.zona === firstZone && m.id_fusion === null)
})

const canUnfuse = computed(() => {
  // Can unfuse if selected mesa has id_fusion
  if (store.selectedMesa && store.selectedMesa.id_fusion) return true
  // or if multi-selected mesas all share same fusion
  const mesas = selectedMesas()
  if (mesas.length < 2) return false
  const fusionIds = new Set(mesas.filter((m) => m.id_fusion).map((m) => m.id_fusion))
  return fusionIds.size === 1
})

// ── Aforo computation (MCA-006) ──

const capacidadTotal = ref(80)
const modoOcupacion = ref<'auto' | 'manual'>('auto')
const ocupacionManual = ref(0)

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

// ── Toolbar event handlers ──

async function handleAddMesa() {
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
    zona: 'Principal',
  })
}

async function handleDeleteMesa() {
  if (!store.selectedMesaId) return
  await deleteMesa(store.selectedMesaId)
}

function handleSaveMesa() {
  // No-op: auto-save on dragend/transformend
}

// ── Fusion event handlers (Slice 4) ──

async function handleFuse() {
  const result = await fuseMesas(selectedIds.value)
  if (!result.success && result.error) {
    console.warn(result.error)
  }
  selectedIds.value = []
}

async function handleUnfuse() {
  const fusionId = store.selectedMesa?.id_fusion
    ?? selectedMesas().find((m) => m.id_fusion)?.id_fusion
  if (!fusionId) return

  const result = await unfuseMesas(fusionId)

  if (result.hasReservations && result.reservations) {
    // Show confirmation dialog
    fusionDialogReservations.value = result.reservations
    fusionDialogFusionId.value = fusionId
    fusionDialogShow.value = true
  }
  selectedIds.value = []
}

async function handleFusionCancel() {
  await cancelReservationsAndUnfuse(fusionDialogFusionId.value)
  fusionDialogShow.value = false
  await refreshStandbyReservations()
}

async function handleFusionStandby() {
  await moveReservationsToStandby(fusionDialogFusionId.value)
  fusionDialogShow.value = false
  await refreshStandbyReservations()
}

function handleFusionClose() {
  fusionDialogShow.value = false
}

async function refreshStandbyReservations() {
  try {
    standbyReservations.value = await getStandbyReservations()
  } catch {
    standbyReservations.value = []
  }
}

async function handleReassignStandby(reservaId: string) {
  // Pick the first available mesa (Libre) for reassignment
  // In a real UI, this would open a mesa selector
  const libreMesa = store.mesas.find((m) => m.id_fusion === null && m.mesa_padre_id === null)
  if (libreMesa) {
    await reassignStandbyReservation(reservaId, libreMesa.id)
    await refreshStandbyReservations()
  }
}

// ── Lifecycle ──

async function loadConfiguracion() {
  try {
    const { data, error } = await client
      .from('configuracion')
      .select('capacidad_total_local, modo_ocupacion, ocupacion_manual')
      .single()

    if (error) throw error

    if (data) {
      capacidadTotal.value = data.capacidad_total_local ?? 80
      modoOcupacion.value = data.modo_ocupacion ?? 'auto'
      ocupacionManual.value = data.ocupacion_manual ?? 0
    }
  } catch {
    // Keep defaults on error
  }
}

onMounted(async () => {
  await loadConfiguracion()
  await loadMesas()
  subscribeRealtime()
  await refreshStandbyReservations()
})

onUnmounted(() => {
  unsubscribeRealtime()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Page title -->
    <h1 class="font-serif text-2xl font-bold text-slate">Gestor de Mesas</h1>

    <!-- Standby Banner (Slice 4) -->
    <StandbyBanner
      :reservations="standbyReservations"
      @assign="handleReassignStandby"
    />

    <!-- Toolbar with aforo indicator + fusion buttons -->
    <TableToolbar
      :selected-mesa="store.selectedMesa"
      :aforo-info="aforoInfo"
      :can-fuse="canFuse"
      :can-unfuse="canUnfuse"
      @add="handleAddMesa"
      @delete="handleDeleteMesa"
      @save="handleSaveMesa"
      @fuse="handleFuse"
      @unfuse="handleUnfuse"
    />

    <!-- Konva canvas -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <TableCanvas />
    </div>

    <!-- Fusion confirm dialog (Slice 4) -->
    <FusionConfirmDialog
      :show="fusionDialogShow"
      :reservations="fusionDialogReservations"
      :fusion-id="fusionDialogFusionId"
      @cancel="handleFusionCancel"
      @standby="handleFusionStandby"
      @close="handleFusionClose"
    />
  </div>
</template>
