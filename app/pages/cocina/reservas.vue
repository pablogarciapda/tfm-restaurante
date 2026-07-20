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
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import TableCanvas from '../../features/mesas/components/TableCanvas.vue'
import TableToolbar from '../../features/mesas/components/TableToolbar.vue'
import FusionConfirmDialog from '../../features/mesas/components/FusionConfirmDialog.vue'
import StandbyBanner from '../../features/mesas/components/StandbyBanner.vue'
import { useCanvasStore } from '../../features/mesas/stores/canvas-store'
import { useMesas } from '../../features/mesas/composables/useMesas'
import { useMesasFusion } from '../../features/mesas/composables/useMesasFusion'
import { calculateFusedCapacity } from '#shared/utils/fusion-math'
import { capacidadFromZonas } from '#shared/utils/capacidad-from-zonas'
import { esReservaPasada } from '#shared/utils/reserva-fecha'
import { generarReferencia } from '#shared/utils/referencia'
import { generateSlots } from '#shared/utils/slots'
import type { AforoInfo, Mesa, CocinaRole } from '#shared/contracts/mesas.contract'
import type { HorarioConfig, ZonaConfig } from '#shared/contracts/reservation.contract'
import { useDisenoConfig } from '~/composables/useDisenoConfig'

// ── Canvas exposed API (rotateSelectedGroup90CW + getSelectedMesaIds) ──
const canvasRef = ref<InstanceType<typeof TableCanvas> | null>(null)

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()
const store = useCanvasStore()
// Default to first zone immediately (prevents flash of all mesas)
store.activeZona = 'Principal'
const { loadMesas } = useMesas()
const { updateMesa } = useMesas()
const {
  fuseMesas,
  unfuseMesas,
  cancelReservationsAndUnfuse,
  moveReservationsToStandby,
  getStandbyReservations,
  reassignStandbyReservation,
  checkAforoOverflow,
} = useMesasFusion()

// ── Fused group rotation toolbar (operación mode) ──

/**
 * The selected mesa is the fused parent that drives the rigid rotation button.
 *
 * After AD-04 fix, the parent has mesa_padre_id = null (root of the fusion
 * group). The old check `mesa_padre_id !== sel.id` was for the previous bug
 * where the parent had mesa_padre_id = self.id (now corrected).
 */
const selectedFusedParent = computed(() => {
  const sel = store.selectedMesa
  if (!sel) return null
  if (!sel.id_fusion) return null
  // Parent is the fusion root: mesa_padre_id IS null.
  // Children have mesa_padre_id pointing to the parent's id.
  if (sel.mesa_padre_id !== null) return null
  return sel
})

async function rotateSelectedGroup90() {
  canvasRef.value?.rotateSelectedGroup90CW()
}

async function saveSelectedFusedPositions() {
  const ids = canvasRef.value?.getSelectedMesaIds() ?? []
  if (ids.length === 0) return
  const positions = canvasRef.value?.getMesaPositions() ?? {}
  let ok = 0
  let failed = 0
  for (const id of ids) {
    const mesa = store.mesas.find((m) => m.id === id)
    if (!mesa) { failed++; continue }
    const live = positions[id]
    const payload = {
      posicion_x: live?.x ?? mesa.posicion_x,
      posicion_y: live?.y ?? mesa.posicion_y,
      rotacion: live?.rotation ?? mesa.rotacion,
      ancho: mesa.ancho,
      alto: mesa.alto,
    }
    try {
      await updateMesa(id, payload)
      ok++
    } catch {
      failed++
    }
  }
  if (failed === 0) {
    showToast(`Grupo rotado guardado (${ok} mesas)`, 'success')
  } else {
    showToast(`Guardado con fallos: ${ok} OK, ${failed} error`, 'error')
  }
}

// ── Guardar / Restaurar canvas ──
const guardarFecha = ref(new Date().toISOString().slice(0, 10))
const guardarTurno = ref<'comida' | 'cena'>('comida')
const savingCanvas = ref(false)
const restoringOriginal = ref(false)
const loadingAforo = ref(false)

/** Collect current mesa positions from Konva nodes for the active zone */
function collectLayoutPositions(positionsMap: Record<string, { x: number; y: number; rotation: number }>) {
  const mesasZona = store.mesas.filter((m) => m.zona === store.activeZona)
  return mesasZona.map((mesa) => {
    const pos = positionsMap[mesa.id]
    return {
      mesa_id: mesa.id,
      posicion_x: pos?.x ?? mesa.posicion_x,
      posicion_y: pos?.y ?? mesa.posicion_y,
      rotacion: pos?.rotation ?? mesa.rotacion,
    }
  })
}

/** Guarda el layout actual para la fecha + turno seleccionado en canvas_layouts */
async function handleGuardarCanvas() {
  const mesasZona = store.mesas.filter((m) => m.zona === store.activeZona)
  if (mesasZona.length === 0) {
    showToast('No hay mesas en la zona activa', 'error')
    return
  }
  savingCanvas.value = true
  try {
    const positionsMap = canvasRef.value?.getMesaPositions() ?? {}
    const positions = collectLayoutPositions(positionsMap)
    await $fetch('/api/canvas/save-layout', {
      method: 'POST',
      body: { fecha: guardarFecha.value, turno: guardarTurno.value, zona: store.activeZona, positions },
    })
    const turnoLabel = guardarTurno.value === 'comida' ? 'Comida' : 'Cena'
    showToast(`Layout guardado (${positions.length} mesas) — ${guardarFecha.value} ${turnoLabel}`, 'success')
  } catch (e: any) {
    showToast(e?.statusMessage || 'Error al guardar layout', 'error')
  } finally {
    savingCanvas.value = false
  }
}

/** Restaura el diseño original para la fecha + turno seleccionados.
 *  Guarda las posiciones originales en canvas_layouts y actualiza las mesas. */
async function handleRestoreOriginal() {
  const turnoLabel = guardarTurno.value === 'comida' ? 'Comida' : 'Cena'
  if (!confirm(`¿Restaurar diseño original para ${guardarFecha.value} (${turnoLabel})?\nSe guardará en layouts y se actualizarán las mesas.`)) return
  restoringOriginal.value = true
  try {
    // 1. Get original design positions for this zone
    const original = await $fetch('/api/canvas/original', { params: { zona: store.activeZona } })
    if (!original.exists || !Array.isArray(original.positions)) {
      showToast('No hay diseño original guardado', 'error')
      return
    }
    // 2. Save them as a layout for the selected date+turno
    await $fetch('/api/canvas/save-layout', {
      method: 'POST',
      body: { fecha: guardarFecha.value, turno: guardarTurno.value, zona: store.activeZona, positions: original.positions },
    })
    // 3. Update mesas to match original positions
    for (const pos of original.positions) {
      await updateMesa(pos.mesa_id, { posicion_x: pos.posicion_x, posicion_y: pos.posicion_y, rotacion: pos.rotacion })
    }
    await loadMesas(store.activeZona)
    showToast(`Diseño original restaurado para ${guardarFecha.value} (${turnoLabel}) — ${original.positions.length} mesas`, 'success')
  } catch (e: any) {
    showToast(e?.statusMessage || 'Error al restaurar diseño original', 'error')
  } finally {
    restoringOriginal.value = false
  }
}

// ── Auto-load layout and refresh aforo when date or turno changes ──
watch([guardarFecha, guardarTurno], async ([fecha, turno]) => {
  if (!fecha || !turno) return
  loadingAforo.value = true
  await loadReservas()
  try {
    const data: any = await $fetch('/api/canvas/load-layout', {
      params: { fecha, turno, zona: store.activeZona },
    })
    if (data?.positions?.length) {
      for (const pos of data.positions) {
        await updateMesa(pos.mesa_id, {
          posicion_x: pos.posicion_x,
          posicion_y: pos.posicion_y,
          rotacion: pos.rotacion,
        })
      }
      await loadMesas(store.activeZona)
      const turnoLabel = turno === 'comida' ? 'Comida' : 'Cena'
      showToast(`Layout cargado: ${fecha} (${turnoLabel}) — ${data.positions.length} mesas`, 'success')
    }
  } catch {
    // no layout for this date/turno — silently skip
  } finally {
    loadingAforo.value = false
  }
})

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
// Restaurant email used as fallback when an admin-created reservation has no
// customer email (the POST /api/reservas handler rejects empty email). Loaded
// from the same configuracion row as the rest of the page config.
const restaurantEmail = ref('')

// ── Diseño config (canvas reference dimensions) ──
const { config: disenoConfig, load: loadDisenoConfig } = useDisenoConfig()

// Generate time slots from horarios_config for the reservation modal
const timeSlots = computed(() => {
  const h = horariosConfig.value
  if (!h) return []
  const slots: string[] = []
  const interval = h.intervalo_minutos || 15
    // Comida
    const [cIniH, cIniM] = (h.comida_inicio || '13:30').split(':').map(Number)
    const [cFinH, cFinM] = (h.comida_fin || '15:30').split(':').map(Number)
    const comidaStart = cIniH! * 60 + cIniM!
    const comidaEnd = cFinH! * 60 + cFinM!
    for (let m = comidaStart; m <= comidaEnd; m += interval) {
      const hh = Math.floor(m / 60).toString().padStart(2, '0')
      const mm = (m % 60).toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
    // Cena
    const [dIniH, dIniM] = (h.cena_inicio || '21:00').split(':').map(Number)
    const [dFinH, dFinM] = (h.cena_fin || '23:30').split(':').map(Number)
    const cenaStart = dIniH! * 60 + dIniM!
    const cenaEnd = dFinH! * 60 + dFinM!
    for (let m = cenaStart; m <= cenaEnd; m += interval) {
      const hh = Math.floor(m / 60).toString().padStart(2, '0')
      const mm = (m % 60).toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
    return slots
})

const aforoInfo = computed<AforoInfo>(() => {
  // Ocupación real: suma de comensales de reservas del día+turno seleccionado
  let ocupacionReal = 0
  const h = horariosConfig.value
  if (h && reservasList.value.length > 0) {
    const turnoInicio = guardarTurno.value === 'comida' ? h.comida_inicio : h.cena_inicio
    const turnoFin = guardarTurno.value === 'comida' ? h.comida_fin : h.cena_fin
    const fecha = guardarFecha.value
    const zona = store.activeZona

    ocupacionReal = reservasList.value
      .filter((r) => {
        if (r.estado !== 'pendiente' && r.estado !== 'confirmada') return false
        // Convert to local time for date/time comparison
        const d = new Date(r.fecha_hora)
        if (isNaN(d.getTime())) return false
        const localDate = d.toISOString().slice(0, 10)
        if (localDate !== fecha) return false
        const localMin = d.getHours() * 60 + d.getMinutes()
        const [tIniH, tIniM] = turnoInicio.split(':').map(Number)
        const [tFinH, tFinM] = turnoFin.split(':').map(Number)
        const inicioMin = tIniH! * 60 + tIniM!
        const finMin = tFinH! * 60 + tFinM!
        if (localMin < inicioMin || localMin > finMin) return false
        if (zona && r.zona_id && r.zona_id !== zona) return false
        return true
      })
      .reduce((sum, r) => sum + (r.numero_comensales ?? 0), 0)
  }

  const ocupacion = modoOcupacion.value === 'manual'
    ? ocupacionManual.value
    : ocupacionReal
  const disponible = capacidadTotal.value - ocupacion

  return {
    modo: modoOcupacion.value,
    capacidad_total: capacidadTotal.value,
    ocupacion_auto: ocupacion,
    ocupacion_manual: ocupacionManual.value,
    disponible,
    overflow: aforoOverflowFlag.value || ocupacion > capacidadTotal.value,
  }
})

// ── MFU-007 / MFU-008: aforo overflow role-gated enforcement ──

/** Set to true when an admin forces an operation past capacity — drives the red bar */
const aforoOverflowFlag = ref(false)
const aforoOverflowDialogShow = ref(false)
const aforoOverflowProjected = ref(0)
const aforoOverflowConfirmCb = ref<(() => Promise<void>) | null>(null)
const aforoOverflowToast = ref<string | null>(null)

function showAforoToast(msg: string) {
  aforoOverflowToast.value = msg
  setTimeout(() => { aforoOverflowToast.value = null }, 3000)
}

/**
 * guardAforo — role-gated gate before any operation that adds aforo.
 * Editor + overflow → toast + block.
 * Admin + overflow → "Forzar / Cancelar" confirm dialog.
 * No overflow → proceeds directly.
 */
async function guardAforo(addedCapacity: number, onProceed: () => Promise<void>) {
  const role = (useState<string>('cocina-role').value ?? 'editor') as CocinaRole
  const check = checkAforoOverflow(addedCapacity, capacidadTotal.value, role)

  if (!check.overflow) {
    await onProceed()
    return
  }

  if (check.blocked) {
    showAforoToast('Aforo completo. Libere mesas primero.')
    return
  }

  // Admin override path (MFU-008)
  aforoOverflowProjected.value = check.projected
  aforoOverflowConfirmCb.value = onProceed
  aforoOverflowDialogShow.value = true
}

async function handleAforoForce() {
  aforoOverflowDialogShow.value = false
  const cb = aforoOverflowConfirmCb.value
  aforoOverflowConfirmCb.value = null
  if (cb) {
    await cb()
    aforoOverflowFlag.value = true
  }
}

function handleAforoCancel() {
  aforoOverflowDialogShow.value = false
  aforoOverflowConfirmCb.value = null
}

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
const reservaModalStep = ref<'datetime' | 'form' | 'success'>('datetime')
const reservaFecha = ref(new Date().toISOString().split('T')[0] ?? '')
const reservaHora = ref('')
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
  reservaModalStep.value = 'datetime'
  reservaFecha.value = new Date().toISOString().split('T')[0]!
  reservaHora.value = ''
  reservaError.value = ''
  reservaForm.value = {
    nombre: '',
    telefono: '',
    email: '',
    comensales: mesa.capacidad_actual,
  }
  reservaError.value = ''
  reservaSuccess.value = false
  reservaSaving.value = false
  reservaModalShow.value = true
}

function closeReservaModal() {
  reservaModalShow.value = false
  reservaModalMesa.value = null
  reservaModalStep.value = 'datetime'
  reservaSuccess.value = false
  reservaError.value = ''
}

async function checkDisponibilidad() {
  if (!reservaModalMesa.value || !reservaFecha.value || !reservaHora.value) return
  reservaError.value = ''

  const fecha_hora = `${reservaFecha.value}T${reservaHora.value}:00`
  const client = useSupabaseClient()
  const { data, error } = await client
    .from('reservas')
    .select('id')
    .eq('mesa_id', reservaModalMesa.value.id)
    .eq('fecha_hora', fecha_hora)
    .in('estado', ['pendiente', 'confirmada'])

  if (error) {
    reservaError.value = 'Error al verificar disponibilidad'
    return
  }

  if (data && data.length > 0) {
    reservaError.value = `Mesa ocupada el ${reservaFecha.value} a las ${reservaHora.value}`
  } else {
    reservaModalStep.value = 'form'
  }
}

function volverDatetime() {
  reservaModalStep.value = 'datetime'
  reservaError.value = ''
}

async function handleReservaSubmit() {
  if (!reservaModalMesa.value) return
  reservaError.value = ''
  reservaSaving.value = true

  try {
    // Include timezone offset so the server interprets the time correctly
    const tzOffset = -new Date().getTimezoneOffset()
    const tzSign = tzOffset >= 0 ? '+' : '-'
    const tzPad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
    const tz = `${tzSign}${tzPad(tzOffset / 60)}:${tzPad(tzOffset % 60)}`
    const fecha_hora = `${reservaFecha.value}T${reservaHora.value}:00${tz}`

    const result = await $fetch<{ success: boolean; reserva_id?: string; error?: string }>(
      '/api/reservas',
      {
        method: 'POST',
        body: {
          nombre: reservaForm.value.nombre,
          telefono: reservaForm.value.telefono,
          email: reservaForm.value.email || restaurantEmail.value || 'reservas@lazingara.es',
          fecha_hora,
          numero_comensales: reservaForm.value.comensales,
          gdpr_aceptado: true,
          admin_created: true,
        },
      },
    )

    if (!result.success) {
      reservaError.value = typeof result.error === 'string' ? result.error : 'Error al crear la reserva'
      return
    }

    if (result.reserva_id) {
      const client = useSupabaseClient()
      await client.from('reservas').update({
        mesa_id: reservaModalMesa.value.id,
        zona_id: reservaModalMesa.value.zona_nombre || reservaModalMesa.value.zona,
      }).eq('id', result.reserva_id)
    }

    reservaSuccess.value = true
    showToast('Reserva creada correctamente', 'success')
    await loadReservas()
    // Auto-close after 3 seconds
    setTimeout(() => closeReservaModal(), 3000)
  } catch (err: any) {
    const data = err?.data
    if (data?.errors && Array.isArray(data.errors)) {
      reservaError.value = data.errors.filter((e: unknown) => typeof e === 'string').join(', ') || 'Error al crear la reserva'
    } else if (data?.error && typeof data.error === 'string') {
      reservaError.value = data.error
    } else if (data?.statusMessage && typeof data.statusMessage === 'string') {
      reservaError.value = data.statusMessage
    } else if (data?.message && typeof data.message === 'string') {
      reservaError.value = data.message
    } else if (err?.message && typeof err.message === 'string') {
      reservaError.value = err.message
    } else {
      reservaError.value = 'Error al crear la reserva'
    }
  } finally {
    reservaSaving.value = false
  }
}

// ── Fusion event handlers (Slice 4) ──

async function handleFuse() {
  const ids = [...selectedIds.value]
  const selected = selectedMesas()
  // Net capacity change for aforo gate: fusedCapacity - sum of individual bases.
  // Fusion always reduces total root capacity (fused < sum bases), so net ≤ 0.
  // The old code passed the ABSOLUTE fused value, which wrongly treated fusion
  // as if it consumed new capacity instead of reducing it.
  const fusedCapacity = calculateFusedCapacity(selected)
  const sumBase = selected.reduce((s, m) => s + m.capacidad_base, 0)
  const netChange = selected.length >= 2
    ? fusedCapacity - sumBase
    : 0

  await guardAforo(netChange, async () => {
    const result = await fuseMesas(ids)
    if (!result.success && result.error) {
      console.warn(result.error)
    }
  })
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

// ── Standby reassign modal ──
const standbyAssignShow = ref(false)
const standbyAssignReservaId = ref('')
const standbyAssignMesaId = ref('')


function openStandbyAssign(reservaId: string) {
  standbyAssignReservaId.value = reservaId
  standbyAssignMesaId.value = mesasDisponibles.value[0]?.id || ''
  standbyAssignShow.value = true
}

function closeStandbyAssign() {
  standbyAssignShow.value = false
}

async function handleStandbyAssign() {
  if (!standbyAssignReservaId.value || !standbyAssignMesaId.value) return
  await reassignStandbyReservation(standbyAssignReservaId.value, standbyAssignMesaId.value)
  await refreshStandbyReservations()
  closeStandbyAssign()
}

async function handleReassignStandby(reservaId: string) {
  openStandbyAssign(reservaId)
}

// ── Lifecycle ──

async function loadConfiguracion() {
  try {
    const { data, error } = await client
      .from('configuracion')
      .select('modo_ocupacion, ocupacion_manual, horarios_config, zonas_config, restaurant_email')
      .single()

    if (error) throw error

    if (data) {
      // MFU-007/008: capacity ceiling MUST come from zonas_config (enabled zones sum),
      // NOT the deprecated configuracion.capacidad_total_local column (AGENTS.md §4).
      const zonasTotal = capacidadFromZonas(data.zonas_config as ZonaConfig[] | null)
      capacidadTotal.value = zonasTotal > 0 ? zonasTotal : 80
      modoOcupacion.value = (data.modo_ocupacion ?? 'auto') as 'auto' | 'manual'
      ocupacionManual.value = data.ocupacion_manual ?? 0
      horariosConfig.value = (data.horarios_config as HorarioConfig) ?? null
      zonasConfig.value = (data.zonas_config as ZonaOption[]) ?? []
      restaurantEmail.value = (data.restaurant_email as string) ?? ''
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

/** Mesas disponible for reasignar — exclude occupied ones */
const reasignarMesasDisponibles = computed(() => {
  // Get occupied mesa IDs (reservas activas: confirmada o pendiente)
  const ocupadas = new Set<string>()
  for (const r of reservasList.value) {
    if (r.mesa_id && (r.estado === 'confirmada' || r.estado === 'pendiente')) {
      ocupadas.add(r.mesa_id)
    }
  }

  // Filter: parent mesas (no children of fused groups), not occupied, optionally by zone
  const zonaNombre = reasignarZonaId.value
    ? zonasConfig.value.find((z) => z.id === reasignarZonaId.value)?.nombre ?? null
    : null

  const comensales = reasignarReserva.value?.numero_comensales ?? 0

  return store.parentMesas.filter(
    (m) =>
      !ocupadas.has(m.id) &&
      m.capacidad_actual >= comensales &&
      (!zonaNombre || m.zona === zonaNombre),
  )
})

function showToast(msg: string, type: 'success' | 'error') {
  toastReasignar.value = { message: msg, type }
  setTimeout(() => { toastReasignar.value = null }, 3000)
}

function getMesaNumero(mesaId: string | null): string {
  if (!mesaId) return '—'
  const mesa = store.mesas.find((m) => m.id === mesaId)
  return mesa ? `Mesa ${mesa.numero_mesa}` : '—'
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
    // Load reservations ±15 days from selected date for aforo + table
    const center = new Date(guardarFecha.value || new Date().toISOString().slice(0, 10))
    const from = new Date(center)
    from.setDate(from.getDate() - 15)
    const to = new Date(center)
    to.setDate(to.getDate() + 15)

    const { data, error } = await client
      .from('reservas')
      .select('id, fecha_hora, numero_comensales, estado, zona_id, mesa_id, created_at, cliente:cliente_id(nombre)')
      .gte('fecha_hora', from.toISOString().slice(0, 10))
      .lte('fecha_hora', to.toISOString().slice(0, 10) + 'T23:59:59')
      .order('fecha_hora', { ascending: true })
      .limit(500)

    if (error) throw error
    reservasList.value = (data || []) as unknown as ReservaRow[]
  } catch {
    reservasList.value = []
  }
}

// ── Date filter ──
const filterDesde = ref(new Date().toISOString().slice(0, 10))
const filterHasta = ref('')

function setToday() {
  const today = new Date().toISOString().slice(0, 10)
  filterDesde.value = today
  filterHasta.value = today
}

function clearDateFilter() {
  filterDesde.value = new Date().toISOString().slice(0, 10)
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

async function completarReserva(reserva: ReservaRow) {
  if (!confirm(`¿Marcar como completada la reserva de ${(reserva.cliente as any)?.nombre || '—'}? La mesa quedará libre.`)) return
  try {
    await client.from('reservas').update({ estado: 'completada' }).eq('id', reserva.id)
    await loadReservas()
    showToast('Reserva completada — mesa liberada', 'success')
  } catch {
    showToast('Error al completar', 'error')
  }
}

// ── Editar reserva ──
const editarShow = ref(false)
const editarReserva = ref<ReservaRow | null>(null)
const editarNombre = ref('')
const editarApellidos = ref('')
const editarTelefono = ref('')
const editarEmail = ref('')
const editarComensales = ref<number | null>(null)
const editarFecha = ref('')
const editarSlot = ref('')
const editarReenviar = ref(false)
const editarSaving = ref(false)

// Slot generation for edit modal (uses same horariosConfig as reservation modal)
const editarSlots = computed(() => {
  const h = horariosConfig.value
  if (!h) return []
  try { return generateSlots(h) } catch { return [] }
})
const editarTurnos = computed(() => {
  const comida: typeof editarSlots.value = []
  const cena: typeof editarSlots.value = []
  for (const slot of editarSlots.value) {
    const horaNum = parseInt(slot.hora.replace(':', ''), 10)
    if (horaNum >= 1200 && horaNum < 1700) comida.push(slot)
    else cena.push(slot)
  }
  return { comida, cena }
})
function isEditarSlotPast(slotHora: string): boolean {
  if (!editarFecha.value) return false
  const now = new Date()
  const slotDate = new Date(editarFecha.value + 'T' + slotHora + ':00')
  return slotDate <= now
}

function openEditarReserva(reserva: ReservaRow) {
  editarReserva.value = reserva
  editarNombre.value = (reserva.cliente as any)?.nombre || ''
  editarApellidos.value = (reserva.cliente as any)?.apellidos || ''
  editarTelefono.value = (reserva.cliente as any)?.telefono || ''
  editarEmail.value = (reserva.cliente as any)?.email || ''
  editarComensales.value = reserva.numero_comensales
  // Parse fecha_hora into date (YYYY-MM-DD) and find closest slot
  const d = new Date(reserva.fecha_hora)
  editarFecha.value = d.toISOString().slice(0, 10)
  const currentHH = d.toTimeString().slice(0, 5)
  // Find closest slot from available slots
  const match = editarSlots.value.find(s => s.hora === currentHH)
  editarSlot.value = match ? match.hora : currentHH
  editarReenviar.value = false
  editarShow.value = true
}

function closeEditarReserva() {
  editarShow.value = false
  editarReserva.value = null
}

async function handleEditarReserva() {
  if (!editarReserva.value || !editarFecha.value || !editarSlot.value) return
  editarSaving.value = true
  try {
    const fecha_hora = `${editarFecha.value}T${editarSlot.value}:00`
    const result: any = await $fetch('/api/cocina/reservas/editar', {
      method: 'POST',
      body: {
        reserva_id: editarReserva.value.id,
        fecha_hora,
        numero_comensales: editarComensales.value,
        cliente_nombre: editarNombre.value,
        cliente_apellidos: editarApellidos.value,
        cliente_telefono: editarTelefono.value,
        cliente_email: editarEmail.value,
        reenviar_notificacion: editarReenviar.value,
      },
    })
    const ref = generarReferencia(result.reserva.id, result.reserva.fecha_hora)
    await loadReservas()
    showToast(editarReenviar.value ? `Reserva ${ref} actualizada y notificación enviada` : `Reserva ${ref} actualizada`, 'success')
    closeEditarReserva()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Error al actualizar', 'error')
  } finally {
    editarSaving.value = false
  }
}

async function handleReasignar() {
  if (!reasignarReserva.value) return
  reasignarError.value = ''
  reasignarSaving.value = true

  if (!reasignarMesaId.value) {
    reasignarError.value = 'Debe seleccionar una mesa'
    reasignarSaving.value = false
    return
  }

  // Validate capacity
  const mesaSeleccionada = store.mesas.find((m) => m.id === reasignarMesaId.value)
  const comensales = reasignarReserva.value.numero_comensales ?? 0
  if (mesaSeleccionada && mesaSeleccionada.capacidad_actual < comensales) {
    reasignarError.value = `La mesa ${mesaSeleccionada.numero_mesa} tiene capacidad para ${mesaSeleccionada.capacidad_actual} comensales, pero la reserva es de ${comensales}`
    reasignarSaving.value = false
    return
  }

  try {
    const body: Record<string, unknown> = {
      reserva_id: reasignarReserva.value.id,
      nueva_mesa_id: reasignarMesaId.value,
    }
    if (reasignarZonaId.value) body.nueva_zona_id = reasignarZonaId.value
    if (reasignarMotivo.value.trim()) body.motivo = reasignarMotivo.value.trim()

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

/** Map mesa_id → reservation reference (e.g. "240718-A4C9") for today's reserved tables */
const reservasMap = computed(() => {
  const map: Record<string, string> = {}
  const todayStr = new Date().toISOString().slice(0, 10)

  for (const r of reservasList.value) {
    if (!r.mesa_id) continue
    if (r.estado !== 'pendiente' && r.estado !== 'confirmada') continue
    // Local-time date comparison (same as mesaTurnoStatus)
    const d = new Date(r.fecha_hora)
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (localDate !== todayStr) continue
    map[r.mesa_id] = generarReferencia(r.id, r.fecha_hora)
  }
  return map
})

/** Estados that should NOT appear in the tooltip (same as mesa-estado EXCLUDED_ESTADOS) */
const TOOLTIP_EXCLUDED_ESTADOS = new Set(['cancelada', 'standby', 'completada'])

/** Map mesa_id → detailed reservation info for TODAY only (multiple per mesa) for tooltip */
const reservasDetailMap = computed(() => {
  const map: Record<string, { nombre_cliente: string; fecha_hora: string; numero_comensales: number; referencia: string }[]> = {}
  const todayStr = new Date().toISOString().slice(0, 10)

  for (const r of reservasList.value) {
    if (!r.mesa_id) continue
    if (TOOLTIP_EXCLUDED_ESTADOS.has(r.estado)) continue
    const nombre = (r.cliente as any)?.nombre
    if (!nombre) continue
    // Local-time date comparison (same logic as mesaTurnoStatus in TableCanvas)
    const d = new Date(r.fecha_hora)
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (localDate !== todayStr) continue
    if (!map[r.mesa_id]) map[r.mesa_id] = []
    map[r.mesa_id].push({
      nombre_cliente: nombre,
      fecha_hora: r.fecha_hora,
      numero_comensales: r.numero_comensales ?? 0,
      referencia: generarReferencia(r.id, r.fecha_hora),
    })
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
  await loadDisenoConfig()
  await loadMesas()
  await refreshStandbyReservations()
  await loadReservas()
  await loadZonasConfig()
  // Update to actual first enabled zone
  if (zonasConfig.value.length > 0) {
    store.activeZona = zonasConfig.value[0]!.nombre
  }
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
      :multi-select="multiSelectMode"
      :multi-select-count="selectedIds.length"
      @fuse="handleFuse"
      @unfuse="handleUnfuse"
      @toggle-multi-select="toggleMultiSelect"
    >
      <template #controls>
        <div class="flex items-center gap-2">
          <input
            v-model="guardarFecha"
            type="date"
            :min="new Date().toISOString().slice(0, 10)"
            class="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
          />
          <select
            v-model="guardarTurno"
            class="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50"
          >
            <option value="comida">Comida</option>
            <option value="cena">Cena</option>
          </select>
          <button
            type="button"
            class="rounded-md bg-terracotta px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus:ring-2 focus:ring-terracotta/50 disabled:opacity-50"
            :disabled="savingCanvas"
            @click="handleGuardarCanvas"
          >
            {{ savingCanvas ? 'Guardando...' : '💾 Guardar layout' }}
          </button>
          <button
            type="button"
            class="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
            title="Aplica el diseño original a la fecha y turno seleccionados"
            :disabled="restoringOriginal"
            @click="handleRestoreOriginal"
          >
            {{ restoringOriginal ? 'Restaurando...' : '🔄 Restaurar original' }}
          </button>
        </div>
      </template>
    </TableToolbar>

    <!-- Rotar 90° / Guardar — only when a fused group parent is selected. -->
    <div
      v-if="selectedFusedParent"
      class="mb-2 flex items-center gap-2 rounded-lg border border-terracotta/30 bg-cream/95 p-2"
      data-testid="fused-group-rotate-toolbar"
    >
      <span class="text-xs font-medium text-slate">
        Grupo fusionado: {{ selectedFusedParent.numero_mesa }}
      </span>
      <button
        type="button"
        data-testid="rotate-90-btn"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        title="Rota TODO el grupo fusionado 90° en sentido horario como un bloque rígido (ni mesa se separa). Pulsa varias veces para girar más; pulsa Guardar para guardar las nuevas posiciones."
        @click="rotateSelectedGroup90"
      >
        Rotar 90°
      </button>
      <button
        type="button"
        data-testid="save-rotated-fused-btn"
        class="rounded-md bg-terracotta px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus:ring-2 focus:ring-terracotta/50 disabled:cursor-not-allowed disabled:opacity-50"
        title="Guarda en la base de datos las nuevas posiciones/rotaciones de cada mesa del grupo fusionado."
        @click="saveSelectedFusedPositions"
      >
        Guardar
      </button>
    </div>

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
    <div class="mb-6 max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm"
      style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <TableCanvas
        ref="canvasRef"
        :reservas="reservasForCanvas"
        :reservas-map="reservasMap"
        :reservas-detail-map="reservasDetailMap"
        :fusion-labels="fusionLabels"
        :horarios-config="horariosConfig"
        :zonas-config="zonasConfig"
        :design-mode="false"
        :selected-ids="selectedIds"
        :canvas-ancho-base="disenoConfig.canvas_ancho_base"
        :canvas-alto-base="disenoConfig.canvas_alto_base"
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
              <th class="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Pax</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Zona</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Mesa</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Estado</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
              <th class="px-4 py-2 text-left font-medium text-gray-500">Ref</th>
              <th class="px-4 py-2 text-right font-medium text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="reserva in filteredReservas"
              :key="reserva.id"
              class="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td class="px-4 py-2 text-gray-600">
                {{ new Date(reserva.fecha_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) }}
              </td>
              <td class="px-4 py-2">{{ reserva.numero_comensales ?? '—' }}</td>
              <td class="px-4 py-2">{{ reserva.zona_id || '—' }}</td>
              <td class="px-4 py-2">{{ getMesaNumero(reserva.mesa_id) }}</td>
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
              <td class="px-4 py-2">
                {{ (reserva.cliente as any)?.nombre || '—' }}
              </td>
              <td class="px-4 py-2 font-mono text-xs text-gray-500">
                {{ generarReferencia(reserva.id, reserva.fecha_hora) }}
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
                      v-if="reserva.estado === 'confirmada' && !esReservaPasada(reserva.fecha_hora)"
                      type="button"
                      class="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      @click="completarReserva(reserva)"
                    >
                      Liberar
                    </button>
                    <button
                      v-if="reserva.estado !== 'cancelada' && reserva.estado !== 'completada' && !esReservaPasada(reserva.fecha_hora)"
                      type="button"
                      class="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      @click="openEditarReserva(reserva)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="(reserva.estado === 'pendiente' || reserva.estado === 'confirmada') && !esReservaPasada(reserva.fecha_hora)"
                      type="button"
                      class="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                      @click="cancelarReserva(reserva)"
                    >
                      Cancelar
                    </button>
                    <button
                      v-if="reserva.estado !== 'cancelada' && reserva.estado !== 'completada' && !esReservaPasada(reserva.fecha_hora)"
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

          <!-- Mesa dropdown (obligatorio) -->
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-slate" for="reasignar-mesa">
              Nueva mesa <span class="text-red-500">*</span>
            </label>
            <select
              id="reasignar-mesa"
              v-model="reasignarMesaId"
              data-testid="reasignar-mesa"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar mesa —</option>
              <option
                v-for="mesa in reasignarMesasDisponibles"
                :key="mesa.id"
                :value="mesa.id"
              >
                Mesa {{ mesa.numero_mesa }} ({{ mesa.capacidad_actual }} pax — {{ mesa.zona }})
              </option>
            </select>
            <p v-if="reasignarMesasDisponibles.length === 0" class="mt-1 text-xs text-amber-600">
              No hay mesas disponibles en la zona seleccionada
            </p>
          </div>

          <!-- Motivo (opcional) -->
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium text-slate" for="reasignar-motivo">
              Motivo
            </label>
            <textarea
              id="reasignar-motivo"
              v-model="reasignarMotivo"
              rows="3"
              data-testid="reasignar-motivo"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Opcional — razón del cambio"
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

           <!-- Mesa info -->
           <div v-if="reservaModalMesa && !reservaSuccess" class="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-slate">
             <p><strong>Mesa:</strong> {{ reservaModalMesa.numero_mesa }} ({{ reservaModalMesa.zona }})</p>
             <p><strong>Capacidad:</strong> {{ reservaModalMesa.capacidad_actual }} personas</p>
           </div>

           <!-- Step 1: Date/Time -->
           <div v-if="reservaModalStep === 'datetime' && !reservaSuccess" class="space-y-4">
             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Fecha</label>
               <input
                 v-model="reservaFecha"
                 type="date"
                 :min="new Date().toISOString().split('T')[0]"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
               />
             </div>
             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Hora</label>
               <select
                 v-model="reservaHora"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
               >
                 <option value="">Selecciona hora</option>
                 <option v-for="slot in timeSlots" :key="slot" :value="slot">{{ slot }}</option>
               </select>
             </div>

             <p v-if="reservaError" class="text-sm text-red-600">{{ reservaError }}</p>
             <p v-else-if="!reservaFecha || !reservaHora" class="text-sm text-gray-400">Selecciona fecha y hora para verificar disponibilidad</p>

             <div class="flex justify-end gap-3">
               <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm" @click="closeReservaModal">Cancelar</button>
               <button
                 type="button"
                 :disabled="!reservaFecha || !reservaHora"
                 class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
                 @click="checkDisponibilidad"
               >
                 Verificar disponibilidad
               </button>
             </div>
           </div>

           <!-- Step 2: Form -->
           <div v-else-if="reservaModalStep === 'form' && !reservaSuccess" class="space-y-4">
             <p class="text-sm text-green-700">✅ Disponible — {{ reservaFecha }} {{ reservaHora }}</p>

             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Nombre <span class="text-red-500">*</span></label>
               <input v-model="reservaForm.nombre" type="text" required placeholder="Nombre del cliente"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
             </div>
             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Teléfono <span class="text-red-500">*</span></label>
               <input v-model="reservaForm.telefono" type="tel" required placeholder="Ej: 600123456"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
             </div>
             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Email</label>
               <input v-model="reservaForm.email" type="email" placeholder="opcional"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
             </div>
             <div>
               <label class="mb-1 block text-sm font-medium text-slate">Comensales</label>
               <input v-model.number="reservaForm.comensales" type="number" min="1" :max="reservaModalMesa?.capacidad_actual || 20"
                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
             </div>

             <p v-if="reservaError" class="text-sm text-red-600">{{ reservaError }}</p>

             <div class="flex justify-end gap-3">
               <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm" @click="volverDatetime">← Volver</button>
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

    <!-- Standby Assign Modal -->
    <div
      v-if="standbyAssignShow"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeStandbyAssign"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate">Asignar reserva a mesa</h3>
        <div>
          <label class="mb-1 block text-sm text-gray-500">Mesa</label>
          <select v-model="standbyAssignMesaId" class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
            <option v-for="m in mesasDisponibles" :key="m.id" :value="m.id">
              Mesa {{ m.numero_mesa }} — {{ m.capacidad_actual }}p ({{ m.zona }})
            </option>
          </select>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm" @click="closeStandbyAssign">Cancelar</button>
          <button type="button" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90" @click="handleStandbyAssign">Asignar</button>
        </div>
      </div>
    </div>

    <!-- Edit Reserva Modal -->
    <div
      v-if="editarShow"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeEditarReserva"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate">Editar Reserva</h3>

        <div class="space-y-3">
          <!-- Fecha -->
          <div>
            <label class="mb-1 block text-xs text-gray-500">Fecha</label>
            <input v-model="editarFecha" type="date" :min="new Date().toISOString().slice(0,10)" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <!-- Slots por turno -->
          <div v-if="editarTurnos.comida.length > 0 || editarTurnos.cena.length > 0">
            <label class="mb-1 block text-xs text-gray-500">Horario</label>
            <div v-if="editarTurnos.comida.length > 0" class="mb-2">
              <p class="mb-1 text-xs text-gray-400">Comida</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="slot in editarTurnos.comida"
                  :key="slot.hora"
                  type="button"
                  :disabled="isEditarSlotPast(slot.hora)"
                  class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
                  :class="editarSlot === slot.hora
                    ? 'bg-terracotta text-white'
                    : isEditarSlotPast(slot.hora)
                      ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-terracotta/10 hover:text-terracotta'"
                  @click="editarSlot = slot.hora"
                >
                  {{ slot.hora }}
                </button>
              </div>
            </div>
            <div v-if="editarTurnos.cena.length > 0">
              <p class="mb-1 text-xs text-gray-400">Cena</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="slot in editarTurnos.cena"
                  :key="slot.hora"
                  type="button"
                  :disabled="isEditarSlotPast(slot.hora)"
                  class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
                  :class="editarSlot === slot.hora
                    ? 'bg-terracotta text-white'
                    : isEditarSlotPast(slot.hora)
                      ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-terracotta/10 hover:text-terracotta'"
                  @click="editarSlot = slot.hora"
                >
                  {{ slot.hora }}
                </button>
              </div>
            </div>
          </div>
          <div v-else>
            <label class="mb-1 block text-xs text-gray-500">Hora</label>
            <input v-model="editarSlot" type="time" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <!-- Comensales stepper -->
          <div>
            <label class="mb-1 block text-xs text-gray-500">Pax</label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="(editarComensales ?? 1) <= 1"
                @click="editarComensales = Math.max(1, (editarComensales ?? 1) - 1)"
              >−</button>
              <span class="w-8 text-center text-sm font-semibold">{{ editarComensales ?? '—' }}</span>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="(editarComensales ?? 0) >= 20"
                @click="editarComensales = Math.min(20, (editarComensales ?? 0) + 1)"
              >+</button>
            </div>
          </div>

          <!-- Datos cliente -->
          <div class="border-t border-gray-100 pt-3">
            <p class="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Datos del cliente</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-gray-500">Nombre</label>
                <input v-model="editarNombre" type="text" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500">Apellidos</label>
                <input v-model="editarApellidos" type="text" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-gray-500">Teléfono</label>
                <input v-model="editarTelefono" type="text" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500">Email</label>
                <input v-model="editarEmail" type="email" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <!-- Reenviar notificación -->
          <div class="border-t border-gray-100 pt-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="editarReenviar" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-terracotta focus:ring-terracotta" />
              <span class="text-sm text-gray-700">Reenviar confirmación (email/SMS según configuración)</span>
            </label>
            <p v-if="editarReenviar" class="mt-1 text-xs text-amber-600">
              Se generará un nuevo enlace de cancelación. El enlace anterior quedará anulado.
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm" @click="closeEditarReserva">Cancelar</button>
          <button
            type="button"
            class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
            :disabled="editarSaving || !editarFecha || !editarSlot"
            @click="handleEditarReserva"
          >
            {{ editarSaving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MFU-008: Aforo overflow admin override dialog -->
    <div
      v-if="aforoOverflowDialogShow"
      data-testid="aforo-overflow-dialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="handleAforoCancel"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 class="mb-2 text-lg font-bold text-red-700">Aforo excedido</h3>
        <p class="mb-4 text-sm text-slate">
          Aforo excedido. La capacidad del local está superada.
        </p>
        <p class="mb-4 text-xs text-gray-500">
          Ocupación proyectada: {{ aforoOverflowProjected }} plazas
        </p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            data-testid="aforo-overflow-cancel"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            @click="handleAforoCancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="aforo-overflow-force"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            @click="handleAforoForce"
          >
            Forzar
          </button>
        </div>
      </div>
    </div>

    <!-- MFU-007: editor-blocked toast -->
    <div
      v-if="aforoOverflowToast"
      data-testid="aforo-overflow-toast"
      class="fixed right-4 top-4 z-50 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      {{ aforoOverflowToast }}
    </div>
    <!-- Loading overlay: full-page spinner while computing aforo + loading layout -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="loadingAforo"
          class="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm"
        >
          <div class="flex flex-col items-center gap-3 rounded-xl bg-white px-8 py-6 shadow-lg">
            <div class="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-terracotta" />
            <span class="text-sm font-medium text-slate">Cargando layout y ocupación...</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
