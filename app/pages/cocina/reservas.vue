<!--
  /cocina/reservas — Interactive table manager (MCA-008)

  Permission-controlled SPA-only page (ssr:false via routeRules).
  Middleware: auth, role, permissions (reservas). Layout: cocina.

  Loads mesas on mount via useMesas composable.
  Subscribes to Supabase Realtime for cross-session sync.
  Slice 3: TableToolbar + AforoIndicator + aforoInfo computation.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import TableCanvas from '../../features/mesas/components/TableCanvas.vue'
import TableToolbar from '../../features/mesas/components/TableToolbar.vue'
import { useCanvasStore } from '../../features/mesas/stores/canvas-store'
import { useMesas } from '../../features/mesas/composables/useMesas'
import { getAforoDisponible } from '../../../shared/utils/fusion-math'
import type { AforoInfo } from '../../../shared/contracts/mesas.contract'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const store = useCanvasStore()
const { loadMesas, createMesa, deleteMesa, subscribeRealtime, unsubscribeRealtime } = useMesas()

// ── Aforo computation (MCA-006) ──

const capacidadTotal = computed(() => 80) // TODO: fetch from configuracion
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
  // No-op: auto-save happens on dragend/transformend
}

// ── Lifecycle ──

onMounted(async () => {
  await loadMesas()
  subscribeRealtime()
})

onUnmounted(() => {
  unsubscribeRealtime()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Page title -->
    <h1 class="font-serif text-2xl font-bold text-slate">Gestor de Mesas</h1>

    <!-- Toolbar with aforo indicator -->
    <TableToolbar
      :selected-mesa="store.selectedMesa"
      :aforo-info="aforoInfo"
      @add="handleAddMesa"
      @delete="handleDeleteMesa"
      @save="handleSaveMesa"
    />

    <!-- Konva canvas with 3-layer table manager -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <TableCanvas />
    </div>
  </div>
</template>
