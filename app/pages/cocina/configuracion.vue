<!--
  Configuracion Admin — System settings (CFG-001–CFG-003)
  Admin-only via permissions middleware.
  Loads/saves via server API (NOT direct Supabase) to protect smtp_password.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

import type { ConfigData, ConfigUpdatePayload } from '#shared/contracts/reservation.contract'

const defaultConfig: ConfigData = {
  cliente_elige_mesa: false,
  capacidad_total_local: 264,
  mostrar_recomendados: true,
  titulo_recomendados: 'NUESTRAS RECOMENDACIONES',
  modo_ocupacion: 'auto',
  ocupacion_manual: 0,
  max_ancho_imagen: 1200,
  calidad_imagen: 80,
  max_peso_imagen: 5,
  auto_comprimir_imagen: true,
  smtp_host: '',
  smtp_port: null,
  smtp_user: '',
  smtp_from_email: '',
  smtp_security: 'auto',
  texto_proteccion_datos: '',
  modo_reserva: 'automatica',
  horarios_config: { comida_inicio: '13:30', comida_fin: '15:30', cena_inicio: '21:00', cena_fin: '23:30', intervalo_minutos: 15 },
  zonas_config: [
    { id: 'principal', nombre: 'Comedor principal', capacidad: 70, enabled: true },
    { id: 'reservado', nombre: 'Comedor reservado', capacidad: 14, enabled: true },
    { id: 'zingaro', nombre: 'Comedor Zíngaro', capacidad: 60, enabled: true },
    { id: 'terraza', nombre: 'Comedor terraza', capacidad: 100, enabled: true },
    { id: 'bar', nombre: 'Bar', capacidad: 20, enabled: true },
  ],
  cliente_elige_zona: 'none',
  captcha_habilitado: false,
  sms_verificacion: false,
  notificacion_reserva: 'email',
  restaurant_nombre: '',
  restaurant_direccion: '',
  restaurant_telefono: '',
  restaurant_maps_url: '',
  restaurant_email: '',
  restaurant_instagram_url: '',
  restaurant_facebook_url: '',
  restaurant_poblacion: '',
}

const config = ref<ConfigData>({ ...defaultConfig })
const client = useSupabaseClient()

// Config form expects null-free strings for form fields
const formConfig = computed(() => {
  const c = config.value
  return {
    ...c,
    smtp_host: c.smtp_host ?? '',
    smtp_user: c.smtp_user ?? '',
    smtp_from_email: c.smtp_from_email ?? '',
    smtp_port: c.smtp_port ?? null,
    texto_proteccion_datos: c.texto_proteccion_datos ?? '',
    horarios_config: c.horarios_config ?? { comida_inicio: '13:30', comida_fin: '15:30', cena_inicio: '21:00', cena_fin: '23:30', intervalo_minutos: 15 },
    zonas_config: c.zonas_config ?? [],
    cliente_elige_zona: c.cliente_elige_zona ?? 'none',
  } as Record<string, unknown>
})

const saving = ref(false)
const smtpTesting = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3000)
}

async function loadConfig() {
  try {
    const data = await $fetch<ConfigData>('/api/config')
    if (data && Object.keys(data).length > 0) {
      config.value = data
    }
  } catch {
    // Silently fail — page shows defaults
  }
}

async function handleSubmit(formData: ConfigUpdatePayload) {
  saving.value = true
  console.log('[config] sending:', JSON.stringify({ diario: formData.precio_menu_diario, sabado: formData.precio_menu_sabado, domingo: (formData as any).precio_menu_domingo }))
  try {
    const result = await $fetch<ConfigData>('/api/config', {
      method: 'POST',
      body: formData,
    })
    config.value = result ?? { ...defaultConfig }
    showToast('Configuración guardada correctamente', 'success')
  } catch (err) {
    console.error('[config] save error:', err)
    showToast('Error al guardar la configuración', 'error')
  } finally {
    saving.value = false
  }
}

async function handleSmtpTest(toEmail: string) {
  smtpTesting.value = true
  try {
    await $fetch('/api/cocina/smtp/test', {
      method: 'POST',
      body: { to: toEmail },
    })
    showToast('Correo de prueba enviado', 'success')
  } catch {
    showToast('Error al enviar correo de prueba', 'error')
  } finally {
    smtpTesting.value = false
  }
}

// ── Días Bloqueados ──

interface DiaBloqueadoRow {
  id: string
  fecha: string
  recurrente: boolean
  fecha_fin: string | null
  motivo: string | null
  created_at?: string
}

const diasBloqueados = ref<DiaBloqueadoRow[]>([])

async function loadDiasBloqueados() {
  try {
    const data = await $fetch<DiaBloqueadoRow[]>('/api/dias-bloqueados')
    diasBloqueados.value = data || []
  } catch {
    diasBloqueados.value = []
  }
}

async function handleAddDiaBloqueado(dia: { fecha: string; recurrente: boolean; fecha_fin: string | null; motivo: string | null }) {
  try {
    await $fetch('/api/dias-bloqueados', {
      method: 'POST',
      body: dia,
    })
    await loadDiasBloqueados()
    showToast('Día bloqueado añadido', 'success')
  } catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Error al añadir día'
    showToast(msg, 'error')
  }
}

async function handleDeleteDiaBloqueado(id: string) {
  if (!confirm('¿Eliminar este día bloqueado?')) return
  try {
    await $fetch(`/api/dias-bloqueados/${id}`, { method: 'DELETE' })
    await loadDiasBloqueados()
    showToast('Día bloqueado eliminado', 'success')
  } catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Error al eliminar día'
    showToast(msg, 'error')
  }
}

// ── Drag-and-drop helpers ──

interface DragState {
  index: number | null
  overIndex: number | null
}

const drag = ref<DragState>({ index: null, overIndex: null })

function onDragStart(index: number) {
  drag.value = { index, overIndex: null }
}

function onDragEnter(dropIndex: number) {
  const d = drag.value
  if (d.index === null || d.index === dropIndex) return
  d.overIndex = dropIndex
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

function onDragLeave() {
  if (drag.value.overIndex !== null) drag.value.overIndex = null
}

function onDrop<T extends { id?: string; nombre: string; puesto: number; _deleted?: boolean }>(
  event: DragEvent,
  dropIdx: number,
  arr: T[],
) {
  event.preventDefault()
  const d = drag.value
  if (d.index === null || d.index === dropIdx) { resetDrag(); return }
  const [moved] = arr.splice(d.index, 1)
  if (moved === undefined) return
  arr.splice(dropIdx, 0, moved)
  resetDrag()
}

function onDragEnd() { resetDrag() }

function resetDrag() { drag.value = { index: null, overIndex: null } }

function dragClasses(index: number): string {
  const d = drag.value
  if (d.index === index) return 'opacity-40'
  if (d.overIndex === index) return 'border-t-2 border-terracotta'
  return ''
}

// ── Category management (platos) ──

interface CategoryRow { id?: string; nombre: string; puesto: number; _deleted?: boolean }
const categorias = ref<CategoryRow[]>([])
const categoryError = ref('')
const categorySaving = ref(false)

async function loadCategories() {
  const { data } = await client.from('categorias').select('*').order('puesto')
  if (data) categorias.value = data.map((c) => ({ ...c, nombre: c.nombre.toUpperCase(), _deleted: false }))
}

function addCategory() {
  categorias.value.push({ nombre: '', puesto: (categorias.value.length + 1) * 10 })
}

function removeCategory(index: number) {
  const cat = categorias.value[index]
  if (!cat || cat._deleted) return
  if (confirm('¿Eliminar esta categoría?')) {
    if (cat.id) cat._deleted = true
    else categorias.value.splice(index, 1)
  }
}

async function saveCategories() {
  categorySaving.value = true; categoryError.value = ''
  try {
    const toDelete = categorias.value.filter((c) => c._deleted && c.id)
    const toUpsert = categorias.value.filter((c) => !c._deleted).map((c, i) => ({ ...c, puesto: (i + 1) * 10 }))
    for (const cat of toUpsert) { if (!cat.nombre.trim()) { categoryError.value = 'Todas las categorías deben tener nombre'; categorySaving.value = false; return } }
    for (const cat of toDelete) await client.from('categorias').delete().eq('id', cat.id!)
    for (const cat of toUpsert) {
      const payload = { nombre: cat.nombre.trim().toUpperCase(), puesto: cat.puesto }
      if (cat.id) await client.from('categorias').update(payload).eq('id', cat.id)
      else await client.from('categorias').insert(payload)
    }
    await loadCategories()
  } catch { categoryError.value = 'Error al guardar categorías' }
  finally { categorySaving.value = false }
}

// ── Event category management ──

interface EventCategoryRow { id?: string; nombre: string; puesto: number; _deleted?: boolean }
const eventCategorias = ref<EventCategoryRow[]>([])
const eventCatError = ref('')
const eventCatSaving = ref(false)

async function loadEventCategorias() {
  const { data } = await client.from('categorias_eventos').select('*').order('puesto')
  if (data) eventCategorias.value = data.map((c) => ({ ...c, _deleted: false }))
}

function addEventCategory() {
  eventCategorias.value.push({ nombre: '', puesto: (eventCategorias.value.length + 1) * 10 })
}

function removeEventCategory(index: number) {
  const cat = eventCategorias.value[index]
  if (!cat || cat._deleted) return
  if (confirm('¿Eliminar esta categoría? Los eventos asignados se quedarán sin categoría.')) {
    if (cat.id) cat._deleted = true
    else eventCategorias.value.splice(index, 1)
  }
}

async function saveEventCategories() {
  eventCatSaving.value = true; eventCatError.value = ''
  try {
    const toDelete = eventCategorias.value.filter((c) => c._deleted && c.id)
    const toUpsert = eventCategorias.value.filter((c) => !c._deleted).map((c, i) => ({ ...c, puesto: (i + 1) * 10 }))
    for (const cat of toUpsert) { if (!cat.nombre.trim()) { eventCatError.value = 'Todas las categorías deben tener nombre'; eventCatSaving.value = false; return } }
    for (const cat of toDelete) { await client.from('eventos').update({ categoria_id: null }).eq('categoria_id', cat.id!); await client.from('categorias_eventos').delete().eq('id', cat.id!) }
    for (const cat of toUpsert) {
      const payload = { nombre: cat.nombre.trim(), puesto: cat.puesto }
      if (cat.id) await client.from('categorias_eventos').update(payload).eq('id', cat.id)
      else await client.from('categorias_eventos').insert(payload)
    }
    await loadEventCategorias()
  } catch { eventCatError.value = 'Error al guardar categorías de eventos' }
  finally { eventCatSaving.value = false }
}

// ── Subcategory (familia) management ──

interface FamiliaRow { id?: string; nombre: string; categoria_id: string; puesto: number; _deleted?: boolean; _key?: number }
const familias = ref<(FamiliaRow)[]>([])
const selectedCategoriaId = ref('')
const familiaError = ref('')
const familiaSaving = ref(false)
let familiaKeyCounter = 0

const familiasParaCategoria = computed(() => {
  if (!selectedCategoriaId.value) return []
  return familias.value.filter(f => f.categoria_id === selectedCategoriaId.value && !f._deleted)
})

async function loadFamilias() {
  const { data } = await client.from('familias').select('*').order('puesto')
  if (data) familias.value = data.map((f) => ({ ...f, _deleted: false }))
}

function addFamilia() {
  if (!selectedCategoriaId.value) {
    familiaError.value = 'Selecciona una categoría primero'
    return
  }
  familiaError.value = ''
  const current = familiasParaCategoria.value
  const maxPuesto = current.reduce((max, f) => Math.max(max, f.puesto || 0), 0)
  familias.value.push({
    nombre: '',
    categoria_id: selectedCategoriaId.value,
    puesto: maxPuesto + 10,
    _deleted: false,
    _key: ++familiaKeyCounter,
  })
}

function removeFamilia(displayIdx: number) {
  const displayed = familiasParaCategoria.value
  const fam = displayed[displayIdx]
  if (!fam) return
  if (confirm('¿Eliminar esta subcategoría?')) {
    if (fam.id) {
      const real = familias.value.find(f => f.id === fam.id)
      if (real) real._deleted = true
    } else {
      const realIdx = familias.value.findIndex(f => f._key === fam._key)
      if (realIdx !== -1) familias.value.splice(realIdx, 1)
    }
  }
}

function onFamiliaDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault()
  const d = drag.value
  if (d.index === null || d.index === dropIndex) { resetDrag(); return }

  const displayed = familiasParaCategoria.value
  const fromItem = displayed[d.index]
  const toItem = displayed[dropIndex]
  if (!fromItem || !toItem) { resetDrag(); return }

  const getActualIdx = (item: FamiliaRow): number =>
    familias.value.findIndex(f => (f.id || f._key) === (item.id || item._key))

  const fromActual = getActualIdx(fromItem)
  let toActual = getActualIdx(toItem)
  if (fromActual === -1 || toActual === -1) { resetDrag(); return }

  const [moved] = familias.value.splice(fromActual, 1)
  if (fromActual < toActual) toActual--
  familias.value.splice(toActual, 0, moved)

  // Recalculate puestos for all items in the selected category
  const catId = selectedCategoriaId.value
  const catItems = familias.value.filter(f => f.categoria_id === catId && !f._deleted)
  catItems.forEach((item, i) => { item.puesto = (i + 1) * 10 })

  resetDrag()
}

async function saveFamilias() {
  familiaSaving.value = true; familiaError.value = ''
  try {
    const toDelete = familias.value.filter(f => f._deleted && f.id)
    const categoryFams = familias.value.filter(f => !f._deleted && f.categoria_id === selectedCategoriaId.value)
    const toUpsert = categoryFams.map((f, i) => ({ ...f, puesto: (i + 1) * 10 }))

    for (const f of toUpsert) {
      if (!f.nombre.trim()) {
        familiaError.value = 'Todas las subcategorías deben tener nombre'
        familiaSaving.value = false; return
      }
    }

    for (const f of toDelete) await client.from('familias').delete().eq('id', f.id!)
    for (const f of toUpsert) {
      const payload = { nombre: f.nombre.trim().toUpperCase(), categoria_id: f.categoria_id, puesto: f.puesto }
      if (f.id) await client.from('familias').update(payload).eq('id', f.id)
      else await client.from('familias').insert(payload)
    }
    await loadFamilias()
    showToast('Subcategorías guardadas correctamente', 'success')
  } catch {
    familiaError.value = 'Error al guardar subcategorías'
  } finally { familiaSaving.value = false }
}

onMounted(() => {
  loadConfig()
  loadCategories()
  loadEventCategorias()
  loadDiasBloqueados()
  loadFamilias()
})
</script>

<template>
  <div class="space-y-6">
    <ConfiguracionForm
      :current-config="formConfig"
      :saving="saving"
      :smtp-testing="smtpTesting"
      :existing-dias-bloqueados="diasBloqueados"
      @submit="handleSubmit"
      @smtp-test="handleSmtpTest"
      @add-dia-bloqueado="handleAddDiaBloqueado"
      @delete-dia-bloqueado="handleDeleteDiaBloqueado"
    />

    <!-- Category Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Gestión de Categorías</h2>
      <p class="mb-4 text-xs text-gray-400">
        Arrastra las categorías para reordenarlas. Los nombres se guardan automáticamente en MAYÚSCULAS.
      </p>
      <div class="space-y-1">
        <div
          v-for="(cat, index) in categorias" :key="index"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', dragClasses(index)]"
          draggable="true"
          @dragstart="onDragStart(index)" @dragenter="onDragEnter(index)" @dragover="onDragOver" @dragleave="onDragLeave"
          @drop="onDrop($event, index, categorias)" @dragend="onDragEnd"
        >
          <template v-if="!cat._deleted">
            <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>
            <input
              :value="cat.nombre"
              @input="cat.nombre = ($event.target as HTMLInputElement).value.toUpperCase()"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Nombre de categoría"
            />
            <button type="button" class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600" @click="removeCategory(index)">Eliminar</button>
          </template>
        </div>
      </div>
      <p v-if="categoryError" class="mt-2 text-sm text-red-600">{{ categoryError }}</p>
      <button type="button" class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta" @click="addCategory">+ Añadir categoría</button>
      <div class="mt-6">
        <button type="button" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50" :disabled="categorySaving" @click="saveCategories">{{ categorySaving ? 'Guardando...' : 'Guardar categorías' }}</button>
      </div>
    </div>

    <!-- Subcategory (Familia) Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Subcategorías (Familias)</h2>
      <p class="mb-4 text-xs text-gray-400">
        Gestiona las subcategorías para cada categoría de platos. Arrastra para reordenar.
      </p>

      <!-- Category selector -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-slate">Categoría</label>
        <select
          v-model="selectedCategoriaId"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecciona una categoría</option>
          <option v-for="cat in categorias.filter(c => !c._deleted)" :key="cat.id || ''" :value="cat.id">
            {{ cat.nombre }}
          </option>
        </select>
      </div>

      <!-- Familias list -->
      <div v-if="selectedCategoriaId" class="space-y-1">
        <div
          v-for="(fam, index) in familiasParaCategoria" :key="fam.id || fam._key"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', dragClasses(index)]"
          draggable="true"
          @dragstart="onDragStart(index)" @dragenter="onDragEnter(index)" @dragover="onDragOver" @dragleave="onDragLeave"
          @drop="onFamiliaDrop($event, index)" @dragend="onDragEnd"
        >
          <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>
          <input
            :value="fam.nombre"
            @input="fam.nombre = ($event.target as HTMLInputElement).value.toUpperCase()"
            type="text"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
            placeholder="Nombre de subcategoría"
          />
          <button type="button" class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600" @click="removeFamilia(index)">Eliminar</button>
        </div>
      </div>
      <p v-else class="py-4 text-center text-sm text-gray-400">Selecciona una categoría para gestionar sus subcategorías</p>

      <p v-if="familiaError" class="mt-2 text-sm text-red-600">{{ familiaError }}</p>
      <button type="button" class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta" @click="addFamilia">+ Añadir subcategoría</button>
      <div class="mt-6">
        <button type="button" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50" :disabled="familiaSaving" @click="saveFamilias">{{ familiaSaving ? 'Guardando...' : 'Guardar subcategorías' }}</button>
      </div>
    </div>

    <!-- Event Category Management Card -->
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-bold text-slate">Categorías de Eventos</h2>
      <p class="mb-4 text-xs text-gray-400">Arrastra las categorías para reordenarlas.</p>
      <div class="space-y-1">
        <div
          v-for="(cat, index) in eventCategorias" :key="index"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', dragClasses(index)]"
          draggable="true"
          @dragstart="onDragStart(index)" @dragenter="onDragEnter(index)" @dragover="onDragOver" @dragleave="onDragLeave"
          @drop="onDrop($event, index, eventCategorias)" @dragend="onDragEnd"
        >
          <template v-if="!cat._deleted">
            <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>
            <input :value="cat.nombre" @input="cat.nombre = ($event.target as HTMLInputElement).value" type="text" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Nombre de categoría" />
            <button type="button" class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600" @click="removeEventCategory(index)">Eliminar</button>
          </template>
        </div>
      </div>
      <p v-if="eventCatError" class="mt-2 text-sm text-red-600">{{ eventCatError }}</p>
      <button type="button" class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta" @click="addEventCategory">+ Añadir categoría</button>
      <div class="mt-6">
        <button type="button" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50" :disabled="eventCatSaving" @click="saveEventCategories">{{ eventCatSaving ? 'Guardando...' : 'Guardar categorías de eventos' }}</button>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <Teleport to="body">
    <div
      v-if="toast"
      class="fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all"
      :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>
