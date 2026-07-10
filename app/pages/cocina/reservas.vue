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
  const firstZone = mesas[0]!.zona
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
      modoOcupacion.value = (data.modo_ocupacion ?? 'auto') as 'auto' | 'manual'
      ocupacionManual.value = data.ocupacion_manual ?? 0
    }
  } catch {
    // Keep defaults on error
  }
}

// ── Admin Reasignar ──

interface ReservaRow {
  id: string
  nombre_cliente?: string
  cliente?: { nombre?: string } | null
  fecha_hora: string
  numero_comensales: number | null
  estado: string
  zona_id?: string | null
  mesa_id?: string | null
  created_at?: string
}

interface ZonaOption {
  id: string
  nombre: string
  capacidad: number
  enabled: boolean
}

const reservasList = ref<ReservaRow[]>([])
const zonasConfig = ref<ZonaOption[]>([])
const reasignarShow = ref(false)
const reasignarReserva = ref<ReservaRow | null>(null)
const reasignarZonaId = ref('')
const reasignarMesaId = ref('')
const reasignarMotivo = ref('')
const reasignarSaving = ref(false)
const reasignarError = ref('')
const toastReasignar = ref<{ message: string; type: 'success' | 'error' } | null>(null)

// ── Confirmar reserva pendiente ──
const confirmarShow = ref(false)
const confirmarReserva = ref<ReservaRow | null>(null)
const confirmarMesaId = ref('')
const confirmarMesaError = ref('')
const confirmarSaving = ref(false)
const confirmarResult = ref<{ notificacion: string; telefono: string | null; email: string | null } | null>(null)

const mesasDisponibles = computed(() => {
  return store.mesas
    .filter((m) => m.id_fusion === null && m.mesa_padre_id === null)
    .sort((a, b) => a.numero_mesa - b.numero_mesa)
})

const nombreZonaMesa = computed(() => {
  if (!confirmarMesaId.value) return ''
  const mesa = store.mesas.find((m) => m.id === confirmarMesaId.value)
  if (!mesa) return ''
  return `${mesa.zona} — Mesa ${mesa.numero_mesa} (${mesa.capacidad_actual} pax)`
})

function openConfirmar(reserva: ReservaRow) {
  confirmarReserva.value = reserva
  confirmarMesaId.value = ''
  confirmarMesaError.value = ''
  confirmarResult.value = null
  confirmarSaving.value = false
  confirmarShow.value = true
}

function closeConfirmar() {
  confirmarShow.value = false
  confirmarReserva.value = null
  confirmarResult.value = null
}

async function handleConfirmar(conMesa: boolean) {
  if (!confirmarReserva.value) return
  confirmarMesaError.value = ''
  confirmarSaving.value = true

  const mesaId = conMesa ? confirmarMesaId.value : null

  try {
    const result = await $fetch<{ success: boolean; notificacion: string; telefono: string | null; email: string | null }>(
      '/api/cocina/reservas/confirmar',
      {
        method: 'POST',
        body: {
          reserva_id: confirmarReserva.value.id,
          mesa_id: mesaId || undefined,
        },
      },
    )

    confirmarResult.value = {
      notificacion: result.notificacion,
      telefono: result.telefono,
      email: result.email,
    }
    toastReasignar.value = { message: 'Reserva confirmada correctamente', type: 'success' }
    setTimeout(() => { toastReasignar.value = null }, 3000)
    await loadReservas()
  } catch (err: any) {
    confirmarMesaError.value = err?.data?.message || err?.statusMessage || 'Error al confirmar'
  } finally {
    confirmarSaving.value = false
  }
}

async function loadReservas() {
  try {
    const { data, error } = await client
      .from('reservas')
      .select('id, fecha_hora, numero_comensales, estado, zona_id, mesa_id, created_at, cliente:cliente_id(nombre)')
      .order('fecha_hora', { ascending: true })
      .limit(200)

    if (error) throw error
    reservasList.value = (data || []) as unknown as ReservaRow[]
  } catch {
    reservasList.value = []
  }
}

// ── Date filter ──
const filterDesde = ref('')
const filterHasta = ref('')

function setToday() {
  const today = new Date().toISOString().slice(0, 10)
  filterDesde.value = today
  filterHasta.value = today
}

function clearDateFilter() {
  filterDesde.value = ''
  filterHasta.value = ''
}

const filteredReservas = computed(() => {
  let list = reservasList.value
  if (filterDesde.value) {
    list = list.filter((r) => r.fecha_hora >= filterDesde.value)
  }
  if (filterHasta.value) {
    // Include the full end day: fecha_hora <= filterHasta + 1 day
    const endDate = new Date(filterHasta.value)
    endDate.setDate(endDate.getDate() + 1)
    list = list.filter((r) => r.fecha_hora < endDate.toISOString().slice(0, 10))
  }
  return list
})

async function loadZonasConfig() {
  try {
    const { data } = await client
      .from('configuracion')
      .select('zonas_config')
      .single()
    if (data?.zonas_config) {
      zonasConfig.value = (data.zonas_config as ZonaOption[]).filter((z) => z.enabled)
    }
  } catch {
    zonasConfig.value = []
  }
}

function openReasignar(reserva: ReservaRow) {
  reasignarReserva.value = reserva
  reasignarZonaId.value = ''
  reasignarMesaId.value = ''
  reasignarMotivo.value = ''
  reasignarError.value = ''
  reasignarShow.value = true
}

function closeReasignar() {
  reasignarShow.value = false
  reasignarReserva.value = null
}

async function handleReasignar() {
  if (!reasignarReserva.value) return
  reasignarError.value = ''
  reasignarSaving.value = true

  if (!reasignarMotivo.value.trim()) {
    reasignarError.value = 'El motivo es obligatorio'
    reasignarSaving.value = false
    return
  }

  try {
    const body: Record<string, unknown> = {
      reserva_id: reasignarReserva.value.id,
      motivo: reasignarMotivo.value.trim(),
    }
    if (reasignarZonaId.value) body.nueva_zona_id = reasignarZonaId.value
    if (reasignarMesaId.value) body.nueva_mesa_id = reasignarMesaId.value

    await $fetch('/api/admin/reasignar', {
      method: 'POST',
      body,
    })

    toastReasignar.value = { message: 'Reserva reasignada correctamente', type: 'success' }
    setTimeout(() => { toastReasignar.value = null }, 3000)
    closeReasignar()
    await loadReservas()
  } catch (err: any) {
    reasignarError.value = err?.data?.message || err?.statusMessage || 'Error al reasignar'
  } finally {
    reasignarSaving.value = false
  }
}

onMounted(async () => {
  await loadConfiguracion()
  await loadMesas()
  subscribeRealtime()
  await refreshStandbyReservations()
  await loadReservas()
  await loadZonasConfig()
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

    <!-- Reservas List (Admin Reasignar) -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-100 px-4 py-3">
        <h2 class="text-lg font-bold text-slate">Listado de Reservas</h2>
        <!-- Date filter -->
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <label class="text-xs text-gray-500">Desde</label>
          <input
            v-model="filterDesde"
            type="date"
            class="rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <label class="text-xs text-gray-500">Hasta</label>
          <input
            v-model="filterHasta"
            type="date"
            class="rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            class="rounded bg-terracotta px-2 py-1 text-xs text-white hover:bg-terracotta/90"
            @click="setToday"
          >
            Hoy
          </button>
          <button
            v-if="filterDesde || filterHasta"
            type="button"
            class="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300"
            @click="clearDateFilter"
          >
            ✕ Limpiar
          </button>
          <span class="text-xs text-gray-400">{{ filteredReservas.length }} de {{ reservasList.length }}</span>
        </div>
      </div>

      <div v-if="filteredReservas.length === 0" class="p-6 text-center text-sm text-gray-400">
        No hay reservas{{ filterDesde || filterHasta ? ' en este periodo' : ' registradas' }}.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-100 bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Cliente</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Comensales</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Zona</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Estado</th>
              <th class="px-4 py-2 text-right font-medium text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="reserva in filteredReservas"
              :key="reserva.id"
              class="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td class="px-4 py-2">
                {{ (reserva.cliente as any)?.nombre || '—' }}
              </td>
              <td class="px-4 py-2 text-gray-600">
                {{ new Date(reserva.fecha_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) }}
              </td>
              <td class="px-4 py-2">{{ reserva.numero_comensales ?? '—' }}</td>
              <td class="px-4 py-2">{{ reserva.zona_id || '—' }}</td>
              <td class="px-4 py-2">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800': reserva.estado === 'confirmada',
                    'bg-yellow-100 text-yellow-800': reserva.estado === 'pendiente',
                    'bg-red-100 text-red-800': reserva.estado === 'cancelada',
                    'bg-blue-100 text-blue-800': reserva.estado === 'completada',
                    'bg-gray-100 text-gray-600': !['confirmada', 'pendiente', 'cancelada', 'completada'].includes(reserva.estado),
                  }"
                >
                  {{ reserva.estado }}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="reserva.estado === 'pendiente'"
                    type="button"
                    class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800"
                    @click="openConfirmar(reserva)"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    data-testid="reasignar-btn"
                    class="rounded border border-terracotta px-3 py-1 text-xs font-medium text-terracotta hover:bg-terracotta/10"
                    @click="openReasignar(reserva)"
                  >
                    Reasignar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reasignar Modal -->
    <Teleport to="body">
      <div
        v-if="reasignarShow"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeReasignar"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-bold text-slate">Reasignar reserva</h3>

          <div v-if="reasignarReserva" class="mb-4 space-y-1 text-sm text-slate">
            <p><strong>Cliente:</strong> {{ (reasignarReserva.cliente as any)?.nombre || '—' }}</p>
            <p><strong>Fecha:</strong> {{ new Date(reasignarReserva.fecha_hora).toLocaleString('es-ES') }}</p>
            <p><strong>Zona actual:</strong> {{ reasignarReserva.zona_id || '—' }}</p>
          </div>

          <!-- Zone dropdown -->
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-slate" for="reasignar-zona">
              Nueva zona
            </label>
            <select
              id="reasignar-zona"
              v-model="reasignarZonaId"
              data-testid="reasignar-zona"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Sin cambio —</option>
              <option
                v-for="zona in zonasConfig"
                :key="zona.id"
                :value="zona.id"
              >
                {{ zona.nombre }}
              </option>
            </select>
          </div>

          <!-- Mesa dropdown (simplified: no mesas list loaded, just a text hint) -->
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-slate" for="reasignar-mesa">
              Nueva mesa (opcional)
            </label>
            <input
              id="reasignar-mesa"
              v-model="reasignarMesaId"
              type="text"
              placeholder="ID de mesa (opcional)"
              data-testid="reasignar-mesa"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <!-- Motivo -->
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium text-slate" for="reasignar-motivo">
              Motivo *
            </label>
            <textarea
              id="reasignar-motivo"
              v-model="reasignarMotivo"
              rows="3"
              data-testid="reasignar-motivo"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ej: El cliente prefiere terraza..."
            />
          </div>

          <p v-if="reasignarError" class="mb-3 text-sm text-red-600">{{ reasignarError }}</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              @click="closeReasignar"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="reasignarSaving"
              data-testid="reasignar-save"
              class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
              @click="handleReasignar"
            >
              {{ reasignarSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar reserva modal -->
    <Teleport to="body">
      <div
        v-if="confirmarShow"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeConfirmar"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-bold text-slate">
            {{ confirmarResult ? 'Reserva confirmada' : 'Confirmar reserva' }}
          </h3>

          <div v-if="!confirmarResult">
            <div v-if="confirmarReserva" class="mb-4 space-y-1 text-sm text-slate">
              <p><strong>Cliente:</strong> {{ (confirmarReserva.cliente as any)?.nombre || '—' }}</p>
              <p><strong>Fecha:</strong> {{ new Date(confirmarReserva.fecha_hora).toLocaleString('es-ES') }}</p>
              <p><strong>Comensales:</strong> {{ confirmarReserva.numero_comensales ?? '—' }}</p>
              <p><strong>Zona:</strong> {{ confirmarReserva.zona_id || '—' }}</p>
            </div>

            <!-- Mesa selector -->
            <div class="mb-4">
              <label class="mb-1 block text-sm font-medium text-slate" for="confirmar-mesa">
                Asignar mesa (opcional)
              </label>
              <select
                id="confirmar-mesa"
                v-model="confirmarMesaId"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— Sin mesa —</option>
                <option
                  v-for="mesa in mesasDisponibles"
                  :key="mesa.id"
                  :value="mesa.id"
                >
                  {{ mesa.zona }} — Mesa {{ mesa.numero_mesa }} ({{ mesa.capacidad_actual }} pax)
                </option>
              </select>
              <p v-if="confirmarMesaId && nombreZonaMesa" class="mt-1 text-xs text-green-600">
                ✓ {{ nombreZonaMesa }}
              </p>
              <p v-if="confirmarMesaId" class="mt-1 text-xs text-gray-400">
                La capacidad se restará automáticamente del aforo disponible.
              </p>
            </div>

            <p v-if="confirmarMesaError" class="mb-3 text-sm text-red-600">{{ confirmarMesaError }}</p>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                @click="closeConfirmar"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="confirmarSaving"
                class="rounded-lg border border-gray-400 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                @click="handleConfirmar(false)"
              >
                {{ confirmarSaving ? 'Confirmando...' : 'Confirmar sin mesa' }}
              </button>
              <button
                v-if="confirmarMesaId"
                type="button"
                :disabled="confirmarSaving"
                class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                @click="handleConfirmar(true)"
              >
                {{ confirmarSaving ? 'Confirmando...' : 'Confirmar con mesa' }}
              </button>
            </div>
          </div>

          <!-- Success result -->
          <div v-else class="space-y-4">
            <div class="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <p class="font-medium">✅ Reserva confirmada</p>
              <p class="mt-1 text-green-700">
                Se enviará notificación por
                <strong>{{
                  confirmarResult.notificacion === 'email' ? 'email' :
                  confirmarResult.notificacion === 'sms' ? 'SMS' :
                  'email y SMS'
                }}</strong>
                <template v-if="confirmarResult.notificacion === 'ambos'">
                  a {{ confirmarResult.email || '—' }} y {{ confirmarResult.telefono || '—' }}
                </template>
                <template v-else-if="confirmarResult.notificacion === 'email'">
                  a {{ confirmarResult.email || '—' }}
                </template>
                <template v-else>
                  al {{ confirmarResult.telefono || '—' }}
                </template>
              </p>
            </div>
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
                @click="closeConfirmar"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reasignar toast -->
    <Teleport to="body">
      <div
        v-if="toastReasignar"
        class="fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
        :class="toastReasignar.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ toastReasignar.message }}
      </div>
    </Teleport>
  </div>
</template>
