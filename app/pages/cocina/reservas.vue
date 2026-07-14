<!--
  /cocina/reservas — Interactive table manager with reservation operations (MCA-008, Slice 4: fusion)

  Permission-controlled SPA-only page (ssr:false via routeRules).
  Operación mode only: zone tabs with "Todas", table viewing, click-to-reserve,
  fusion/desfusion, hover tooltip, standby banner, reservation list.
  No design/editing functionality — use /cocina/diseno for layout editing.

  Wires: TableCanvas, TableToolbar (mode='operacion'), FusionConfirmDialog, StandbyBanner.
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
import type { AforoInfo, Mesa } from '#shared/contracts/mesas.contract'
import type { HorarioConfig } from '#shared/contracts/reservation.contract'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()
const store = useCanvasStore()
// Default to first zone immediately (prevents flash of all mesas)
store.activeZona = 'Principal'
const { loadMesas, subscribeRealtime, unsubscribeRealtime } = useMesas()
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

// ── Multi-select toggle ──
const multiSelectMode = ref(false)

function toggleMultiSelect() {
  multiSelectMode.value = !multiSelectMode.value
  if (!multiSelectMode.value) {
    selectedIds.value = []
  }
}

function handleTableClickWithMode(mesa: Mesa) {
  if (multiSelectMode.value) {
    toggleSelection(mesa.id)
  } else {
    openReservaModal(mesa)
  }
}
function toggleSelection(mesaId: string) {
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
  if (store.selectedMesa && store.selectedMesa.id_fusion) return true
  const mesas = selectedMesas()
  if (mesas.length < 2) return false
  const fusionIds = new Set(mesas.filter((m) => m.id_fusion).map((m) => m.id_fusion))
  return fusionIds.size === 1
})

// ── Aforo computation (MCA-006) ──

const capacidadTotal = ref(80)
const modoOcupacion = ref<'auto' | 'manual'>('auto')
const ocupacionManual = ref(0)
const horariosConfig = ref<HorarioConfig | null>(null)

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

// ── Permissions ──

const role = useState<string>('cocina-role')
const permissions = useState<Record<string, boolean>>('cocina-permissions')

const canFusionar = computed(() => {
  if (role.value === 'admin') return true
  return permissions.value?.fusionar === true
})

// ── Reservation modal state ──

const reservaModalShow = ref(false)
const reservaModalMesa = ref<Mesa | null>(null)
const reservaForm = ref({
  nombre: '',
  telefono: '',
  email: '',
  comensales: 4,
})
const reservaSaving = ref(false)
const reservaError = ref('')
const reservaSuccess = ref(false)

function openReservaModal(mesa: Mesa) {
  reservaModalMesa.value = mesa
  reservaForm.value = {
    nombre: '',
    telefono: '',
    email: '',
    comensales: mesa.capacidad_actual, // Use capacidad_actual (fused capacity for fused tables)
  }
  reservaError.value = ''
  reservaSuccess.value = false
  reservaSaving.value = false
  reservaModalShow.value = true
}

function closeReservaModal() {
  reservaModalShow.value = false
  reservaModalMesa.value = null
}

async function handleReservaSubmit() {
  if (!reservaModalMesa.value) return
  reservaError.value = ''
  reservaSaving.value = true

  try {
    const fecha_hora = new Date().toISOString()

    const result = await $fetch<{ success: boolean; reserva_id?: string; error?: string }>(
      '/api/reservas',
      {
        method: 'POST',
        body: {
          nombre: reservaForm.value.nombre,
          telefono: reservaForm.value.telefono,
          email: reservaForm.value.email || `mesa-${reservaModalMesa.value.numero_mesa}@lazingara.es`,
          fecha_hora,
          numero_comensales: reservaForm.value.comensales,
          gdpr_aceptado: true,
        },
      },
    )

    if (!result.success) {
      reservaError.value = result.error || 'Error al crear la reserva'
      return
    }

    if (result.reserva_id) {
      const client = useSupabaseClient()
      await client.from('reservas').update({ mesa_id: reservaModalMesa.value.id }).eq('id', result.reserva_id)
    }

    reservaSuccess.value = true
    await loadReservas()
  } catch (err: any) {
    reservaError.value = err?.data?.error || err?.statusMessage || 'Error al crear la reserva'
  } finally {
    reservaSaving.value = false
  }
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
      .select('capacidad_total_local, modo_ocupacion, ocupacion_manual, horarios_config, zonas_config')
      .single()

    if (error) throw error

    if (data) {
      capacidadTotal.value = data.capacidad_total_local ?? 80
      modoOcupacion.value = (data.modo_ocupacion ?? 'auto') as 'auto' | 'manual'
      ocupacionManual.value = data.ocupacion_manual ?? 0
      horariosConfig.value = (data.horarios_config as HorarioConfig) ?? null
      zonasConfig.value = (data.zonas_config as ZonaOption[]) ?? []
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

function showToast(msg: string, type: 'success' | 'error') {
  toastReasignar.value = { message: msg, type }
  setTimeout(() => { toastReasignar.value = null }, 3000)
}

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

async function cancelarReserva(reserva: ReservaRow) {
  if (!confirm('¿Cancelar esta reserva?')) return
  try {
    await client.from('reservas').update({ estado: 'cancelada' }).eq('id', reserva.id)
    await loadReservas()
    showToast('Reserva cancelada', 'success')
  } catch {
    showToast('Error al cancelar', 'error')
  }
}

// ── Editar reserva ──
const editarShow = ref(false)
const editarReserva = ref<ReservaRow | null>(null)
const editarNombre = ref('')
const editarTelefono = ref('')
const editarComensales = ref<number | null>(null)
const editarSaving = ref(false)

function openEditarReserva(reserva: ReservaRow) {
  editarReserva.value = reserva
  editarNombre.value = (reserva.cliente as any)?.nombre || ''
  editarTelefono.value = (reserva.cliente as any)?.telefono || ''
  editarComensales.value = reserva.numero_comensales
  editarShow.value = true
}

function closeEditarReserva() {
  editarShow.value = false
  editarReserva.value = null
}

async function handleEditarReserva() {
  if (!editarReserva.value) return
  editarSaving.value = true
  try {
    await client.from('reservas').update({
      numero_comensales: editarComensales.value,
    }).eq('id', editarReserva.value.id)
    await loadReservas()
    showToast('Reserva actualizada', 'success')
    closeEditarReserva()
  } catch {
    showToast('Error al actualizar', 'error')
  } finally {
    editarSaving.value = false
  }
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

// ── Text overlay data for TableCanvas ──

/** Reservas formatted for TableCanvas turn coloring (mesa_id, estado, fecha_hora) */
const reservasForCanvas = computed(() => {
  return reservasList.value.map((r) => ({
    mesa_id: r.mesa_id ?? null,
    estado: r.estado,
    fecha_hora: r.fecha_hora,
  }))
})

/** Map mesa_id → client name for today's reserved tables */
const reservasMap = computed(() => {
  const map: Record<string, string> = {}
  const todayStr = new Date().toISOString().split('T')[0]

  for (const r of reservasList.value) {
    if (!r.mesa_id) continue
    const nombre = (r.cliente as any)?.nombre
    if (!nombre) continue
    const fecha = r.fecha_hora?.split('T')[0]
    if (fecha === todayStr) {
      map[r.mesa_id] = nombre
    }
  }
  return map
})

/** Map mesa_id → full reservation details for tooltip (MCA-009) */
const reservasDetailMap = computed(() => {
  const map: Record<string, { nombre_cliente: string; fecha_hora: string; numero_comensales: number }> = {}
  const todayStr = new Date().toISOString().split('T')[0]

  for (const r of reservasList.value) {
    if (!r.mesa_id) continue
    const nombre = (r.cliente as any)?.nombre
    if (!nombre) continue
    const fecha = r.fecha_hora?.split('T')[0]
    if (fecha === todayStr) {
      map[r.mesa_id] = {
        nombre_cliente: nombre,
        fecha_hora: r.fecha_hora,
        numero_comensales: r.numero_comensales ?? 0,
      }
    }
  }
  return map
})

/** Map mesa_id → combined label (e.g. "1/2") for fused tables */
const fusionLabels = computed(() => {
  const labels: Record<string, string> = {}
  const groups = new Map<string, typeof store.mesas>()

  for (const m of store.mesas) {
    if (!m.id_fusion) continue
    const group = groups.get(m.id_fusion) ?? []
    group.push(m)
    groups.set(m.id_fusion, group)
  }

  for (const [, mesas] of groups) {
    const nums = mesas.map((m: typeof store.mesas[number]) => m.numero_mesa).sort((a: number, b: number) => a - b)
    const label = nums.join('/')
    for (const m of mesas) {
      labels[m.id] = label
    }
  }

  return labels
})

onMounted(async () => {
  await loadConfiguracion()
  await loadMesas()
  subscribeRealtime()
  await refreshStandbyReservations()
  await loadReservas()
  await loadZonasConfig()
  // Update to actual first enabled zone
  if (zonasConfig.value.length > 0) {
    store.activeZona = zonasConfig.value[0]!.nombre
  }
})

onUnmounted(() => {
  unsubscribeRealtime()
})
</script>

<template>
  <div class="flex flex-col -mt-6">
    <!-- Standby Banner (Slice 4) -->
    <StandbyBanner
      :reservations="standbyReservations"
      @assign="handleReassignStandby"
    />

    <!-- Sticky header: toolbar + zone tabs -->
    <div class="sticky top-0 z-20 -mx-6 bg-cream/95 px-6 pb-2 backdrop-blur-sm">
    <!-- Toolbar in operación mode -->
    <TableToolbar
      mode="operacion"
      :selected-mesa="store.selectedMesa"
      :aforo-info="aforoInfo"
      :can-fuse="canFuse"
      :can-unfuse="canUnfuse"
      :can-fusionar="canFusionar"
      :active-turno="store.activeTurno"
      :multi-select="multiSelectMode"
      :multi-select-count="selectedIds.length"
      @update:active-turno="(v: any) => store.activeTurno = v"
      @fuse="handleFuse"
      @unfuse="handleUnfuse"
      @toggle-multi-select="toggleMultiSelect"
    />

    <!-- Zone tabs — no "Todas", one per enabled zone -->
    <nav class="flex flex-wrap gap-2" aria-label="Zonas del local">
      <button
        v-for="zona in zonasConfig"
        :key="zona.nombre"
        class="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors"
        :class="store.activeZona === zona.nombre ? 'bg-terracotta text-white' : 'text-slate hover:bg-terracotta/10 hover:text-terracotta'"
        @click="store.activeZona = zona.nombre"
      >
        {{ zona.nombre }}
      </button>
    </nav>
    </div> <!-- end sticky header -->

    <!-- Konva canvas — designMode always false (no Transformer) -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <TableCanvas
        :reservas="reservasForCanvas"
        :reservas-map="reservasMap"
        :reservas-detail-map="reservasDetailMap"
        :fusion-labels="fusionLabels"
        :horarios-config="horariosConfig"
        :zonas-config="zonasConfig"
        :design-mode="false"
        :selected-ids="selectedIds"
        @table-click-reservation="handleTableClickWithMode"
      />
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
                     class="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                     @click="openEditarReserva(reserva)"
                   >
                     Editar
                   </button>
                   <button
                     v-if="reserva.estado === 'pendiente' || reserva.estado === 'confirmada'"
                     type="button"
                     class="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                     @click="cancelarReserva(reserva)"
                   >
                     Cancelar
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

          <!-- Mesa dropdown -->
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

    <!-- Reservation modal (operación mode) -->
    <Teleport to="body">
      <div
        v-if="reservaModalShow"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeReservaModal"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-bold text-slate">
            {{ reservaSuccess ? 'Reserva creada' : 'Nueva reserva' }}
          </h3>

          <div v-if="reservaModalMesa && !reservaSuccess" class="space-y-4">
            <!-- Mesa info -->
            <div class="rounded-lg bg-gray-50 p-3 text-sm text-slate">
              <p><strong>Mesa:</strong> {{ reservaModalMesa.numero_mesa }} ({{ reservaModalMesa.zona }})</p>
              <p><strong>Capacidad:</strong> {{ reservaModalMesa.capacidad_actual }} personas</p>
            </div>

            <!-- Form fields -->
            <div>
              <label class="mb-1 block text-sm font-medium text-slate" for="reserva-nombre">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                id="reserva-nombre"
                v-model="reservaForm.nombre"
                type="text"
                required
                placeholder="Nombre del cliente"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate" for="reserva-telefono">
                Teléfono <span class="text-red-500">*</span>
              </label>
              <input
                id="reserva-telefono"
                v-model="reservaForm.telefono"
                type="tel"
                required
                placeholder="Ej: 600123456"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate" for="reserva-email">
                Email
              </label>
              <input
                id="reserva-email"
                v-model="reservaForm.email"
                type="email"
                placeholder="opcional"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate" for="reserva-comensales">
                Comensales <span class="text-red-500">*</span>
              </label>
              <input
                id="reserva-comensales"
                v-model.number="reservaForm.comensales"
                type="number"
                min="1"
                max="20"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>

            <p v-if="reservaError" class="text-sm text-red-600">{{ reservaError }}</p>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                @click="closeReservaModal"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="reservaSaving || !reservaForm.nombre || !reservaForm.telefono"
                class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                @click="handleReservaSubmit"
              >
                {{ reservaSaving ? 'Creando...' : 'Crear reserva' }}
              </button>
            </div>
          </div>

          <!-- Success state -->
          <div v-else-if="reservaSuccess" class="space-y-4">
            <div class="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <p class="font-medium">✅ Reserva creada correctamente</p>
              <p class="mt-1 text-green-700">
                Mesa {{ reservaModalMesa?.numero_mesa }} — {{ reservaForm.comensales }} comensales
              </p>
            </div>
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
                @click="closeReservaModal"
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

    <!-- Edit Reserva Modal -->
    <div
      v-if="editarShow"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeEditarReserva"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate">Editar Reserva</h3>
        <p class="mb-4 text-sm text-gray-500">
          {{ editarReserva ? new Date(editarReserva.fecha_hora).toLocaleString('es-ES') : '' }}
        </p>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs text-gray-500">Nombre</label>
            <input v-model="editarNombre" type="text" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-gray-500">Teléfono</label>
            <input v-model="editarTelefono" type="text" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-gray-500">Comensales</label>
            <input v-model.number="editarComensales" type="number" min="1" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm" @click="closeEditarReserva">Cancelar</button>
          <button type="button" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50" :disabled="editarSaving" @click="handleEditarReserva">
            {{ editarSaving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
