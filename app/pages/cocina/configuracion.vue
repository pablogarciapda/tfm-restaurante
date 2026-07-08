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
  restaurant_nombre: 'La Zíngara',
  restaurant_direccion: 'Plaza Mayor, 1, 24250 Santa María del Páramo, León',
  restaurant_telefono: '987 123 456',
  restaurant_maps_url: 'https://maps.google.com/?q=La+Zíngara+Santa+María+del+Páramo',
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
  try {
    const result = await $fetch<ConfigData>('/api/config', {
      method: 'POST',
      body: formData,
    })
    config.value = result ?? { ...defaultConfig }
    showToast('Configuración guardada correctamente', 'success')
  } catch {
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

onMounted(() => {
  loadConfig()
  loadCategories()
  loadEventCategorias()
  loadDiasBloqueados()
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
