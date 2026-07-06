<!--
  MenuDiarioEditor — Day selector + 5-section dish manager (CMD-001–CMD-005)
  Each day config has its own date (displayed above the menu on the public page).
  Price comes from Configuración (precio_menu_diario / precio_menu_sabado).
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { Database } from '~/types/database.types'

const client = useSupabaseClient<Database>()

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const SECTIONS = ['primer', 'segundo', 'postre', 'bebida', 'pan'] as const
const SECTION_LABELS: Record<string, string> = {
  primer: 'Primer Plato', segundo: 'Segundo Plato', postre: 'Postre',
  bebida: 'Bebida', pan: 'Pan y Cubiertos',
}

interface Config {
  id: string
  day_of_week: number
  precio: string
  activo: boolean
  fecha: string | null
}

interface MenuItem {
  id: string
  config_id: string
  seccion: string
  plato_nombre: string
  descripcion?: string
  puesto: number
}

interface ConfigPrice {
  precio_menu_diario: number | null
  precio_menu_sabado: number | null
}

const selectedDay = ref(0)
const configs = ref<Config[]>([])
const items = ref<MenuItem[]>([])
const configPrice = ref<ConfigPrice | null>(null)

// ── Drag state (per-section reorder) ──
const draggedItemId = ref<string | null>(null)
const dragOverItemId = ref<string | null>(null)
const dragEnterCount = ref<Record<string, number>>({}) // counter per dish ID to avoid child-element flicker
const localSectionOrder = ref<Record<string, string[]>>({})

// Ordered items per section, respecting local drag reorder
const orderedItems = computed(() => {
  const map = new Map<string, MenuItem[]>()
  for (const section of SECTIONS) {
    let sectionItems = items.value
      .filter((i) => i.seccion === section)
      .sort((a, b) => a.puesto - b.puesto)

    // Apply local reorder if any
    const customOrder = localSectionOrder.value[section]
    if (customOrder && customOrder.length > 0) {
      const itemMap = new Map(sectionItems.map((i) => [i.id, i]))
      sectionItems = customOrder
        .map((id) => itemMap.get(id))
        .filter(Boolean) as MenuItem[]
    }

    map.set(section, sectionItems)
  }
  return map
})

const newDish = reactive({ plato_nombre: '', descripcion: '', seccion: 'primer' })

// ── Helpers ──

/** Get this week's date for a given day_of_week (0=Sun..6=Sat) */
function getDateForDay(dayOfWeek: number): string {
  const today = new Date()
  const diff = dayOfWeek - today.getDay()
  const target = new Date(today)
  target.setDate(today.getDate() + diff)
  return target.toISOString().slice(0, 10)
}

// ── Loaders ──

async function loadConfigPrice() {
  const { data } = await client
    .from('configuracion')
    .select('precio_menu_diario, precio_menu_sabado')
    .single()
  if (data) configPrice.value = data as ConfigPrice
}

async function loadConfigs() {
  const { data } = await client.from('menu_diario_config').select('*').order('day_of_week')
  if (data) configs.value = data as Config[]
}

async function loadItems(configId: string) {
  const { data } = await client.from('menu_diario_items').select('*').eq('config_id', configId).order('puesto')
  if (data) items.value = data as MenuItem[]
}

// ── Actions ──

function selectDay(day: number) {
  selectedDay.value = day
  const cfg = configs.value.find((c) => c.day_of_week === day)
  if (cfg) {
    loadItems(cfg.id)
  } else {
    items.value = []
  }
}

async function toggleActivo(configId: string, activo: boolean) {
  await client.from('menu_diario_config').update({ activo }).eq('id', configId)
  await loadConfigs()
}

async function createConfig(dayOfWeek: number) {
  const defaultPrecio = dayOfWeek === 6
    ? String(configPrice.value?.precio_menu_sabado ?? '')
    : String(configPrice.value?.precio_menu_diario ?? '')

  const { data } = await client.from('menu_diario_config').insert({
    day_of_week: dayOfWeek,
    precio: defaultPrecio || '0',
    activo: true,
    fecha: getDateForDay(dayOfWeek),
  }).select('*').single()

  if (data) {
    await loadConfigs()
    selectDay(dayOfWeek)
  }
}

async function addDish() {
  const cfg = configs.value.find((c) => c.day_of_week === selectedDay.value)
  if (!cfg || !newDish.plato_nombre.trim()) return

  await client.from('menu_diario_items').insert({
    config_id: cfg.id,
    seccion: newDish.seccion as typeof SECTIONS[number],
    plato_nombre: newDish.plato_nombre.trim(),
    descripcion: newDish.descripcion.trim() || null,
    puesto: items.value.filter((i) => i.seccion === newDish.seccion).length + 1,
  })

  newDish.plato_nombre = ''
  newDish.descripcion = ''
  await loadItems(cfg.id)
}

async function removeDish(id: string) {
  await client.from('menu_diario_items').delete().eq('id', id)
  const cfg = configs.value.find((c) => c.day_of_week === selectedDay.value)
  if (cfg) await loadItems(cfg.id)
}

function getItemsForSection(section: string): MenuItem[] {
  return items.value.filter((i) => i.seccion === section)
}

// ── Drag & Drop handlers ──

function onDishDragStart(event: DragEvent, dish: MenuItem) {
  draggedItemId.value = dish.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', dish.id)
  }
}

function onDishDragEnter(event: DragEvent, dish: MenuItem) {
  event.preventDefault()
  if (draggedItemId.value === null || draggedItemId.value === dish.id) return
  // Increment counter to handle child-element flicker
  dragEnterCount.value = { ...dragEnterCount.value, [dish.id]: (dragEnterCount.value[dish.id] ?? 0) + 1 }
  dragOverItemId.value = dish.id
}

function onDishDragOver(event: DragEvent, dish: MenuItem) {
  event.preventDefault()
  if (draggedItemId.value === null || draggedItemId.value === dish.id) return
  dragOverItemId.value = dish.id
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDishDragLeave(event: DragEvent, dish: MenuItem) {
  event.preventDefault()
  const count = dragEnterCount.value[dish.id] ?? 0
  if (count <= 1) {
    const updated = { ...dragEnterCount.value }
    delete updated[dish.id]
    dragEnterCount.value = updated
    dragOverItemId.value = null
  } else {
    dragEnterCount.value = { ...dragEnterCount.value, [dish.id]: count - 1 }
  }
}

function onDishDrop(event: DragEvent, targetDish: MenuItem, section: string) {
  event.preventDefault()
  const draggedId = draggedItemId.value
  if (!draggedId || draggedId === targetDish.id) {
    resetDishDrag()
    return
  }

  // Reorder within section
  const currentItems = orderedItems.value.get(section) ?? []
  const ids = currentItems.map((i) => i.id)
  const fromIdx = ids.indexOf(draggedId)
  const toIdx = ids.indexOf(targetDish.id)

  if (fromIdx === -1 || toIdx === -1) {
    resetDishDrag()
    return
  }

  const newIds = [...ids]
  newIds.splice(fromIdx, 1)
  newIds.splice(toIdx, 0, draggedId)
  localSectionOrder.value = { ...localSectionOrder.value, [section]: newIds }

  // Save to DB
  handleSectionReorder(section, newIds)
  resetDishDrag()
}

function onDishDragEnd() {
  resetDishDrag()
}

function resetDishDrag() {
  draggedItemId.value = null
  dragOverItemId.value = null
  dragEnterCount.value = {}
}

async function handleSectionReorder(section: string, platoIds: string[]) {
  const updates = platoIds.map((id, index) =>
    client
      .from('menu_diario_items')
      .update({ puesto: index + 1 })
      .eq('id', id),
  )
  await Promise.all(updates)

  // Reload from DB to sync
  const cfg = configs.value.find((c) => c.day_of_week === selectedDay.value)
  if (cfg) await loadItems(cfg.id)

  // Clear local order (DB now has the correct order)
  const updated = { ...localSectionOrder.value }
  delete updated[section]
  localSectionOrder.value = updated
}

const currentConfig = computed(() =>
  configs.value.find((c) => c.day_of_week === selectedDay.value) ?? null,
)

const currentDayPrice = computed(() => {
  if (!configPrice.value) return null
  return selectedDay.value === 6
    ? configPrice.value.precio_menu_sabado
    : configPrice.value.precio_menu_diario
})

onMounted(async () => {
  await Promise.all([loadConfigs(), loadConfigPrice()])
  const firstActive = configs.value.find((c) => c.activo)
  if (firstActive) selectDay(firstActive.day_of_week)
  else if (configs.value.length > 0) selectDay(configs.value[0].day_of_week)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Day selector -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(dayName, idx) in DAYS"
        :key="idx"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="selectedDay === idx ? 'bg-terracotta text-white' : 'bg-cream text-slate hover:bg-terracotta/20'"
        @click="selectDay(idx)"
      >
        {{ dayName }}
      </button>
    </div>

    <!-- Day config (activo toggle + date + price) -->
    <div v-if="currentConfig" class="rounded-lg bg-white p-4 shadow">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="currentConfig.activo"
            class="h-4 w-4 rounded"
            @change="toggleActivo(currentConfig.id, ($event.target as HTMLInputElement).checked)"
          />
          <label class="text-sm font-medium text-slate">Activo</label>
        </div>

        <!-- Date display (read-only — managed by day_of_week + activo) -->
        <div class="text-sm text-gray-600">
          Fecha:
          <span class="font-medium text-slate">{{ currentConfig.fecha ?? getDateForDay(selectedDay) }}</span>
        </div>

        <!-- Price from Configuración -->
        <div class="text-sm text-gray-600">
          Precio:
          <span class="font-bold text-terracotta">
            {{ currentDayPrice != null ? `${currentDayPrice.toFixed(2).replace('.', ',')}€` : '—' }}
          </span>
          <span class="ml-1 text-xs text-gray-400">(desde Configuración)</span>
        </div>
      </div>
    </div>

    <!-- No config for this day → create -->
    <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center">
      <p class="mb-3 text-sm text-gray-500">
        No hay configuración para {{ DAYS[selectedDay] }}
      </p>
      <button
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
        @click="createConfig(selectedDay)"
      >
        Crear menú para {{ DAYS[selectedDay] }}
      </button>
    </div>

    <!-- 5-section dish manager -->
    <div class="space-y-4">
      <div v-for="section in SECTIONS" :key="section" class="rounded-lg bg-white p-4 shadow">
        <h3 class="mb-3 text-lg font-bold text-terracotta">{{ SECTION_LABELS[section] }}</h3>

        <!-- Existing dishes (draggable reorder) -->
        <ul v-if="(orderedItems.get(section)?.length ?? 0) > 0" class="mb-3 space-y-2">
          <li
            v-for="dish in orderedItems.get(section)"
            :key="dish.id"
            :draggable="true"
            class="flex items-center justify-between rounded px-3 py-2 transition-colors"
            :class="{
              'bg-cream': draggedItemId !== dish.id,
              'bg-amber-50 opacity-50': draggedItemId === dish.id,
              'border-t-2 border-terracotta': dragOverItemId === dish.id,
            }"
            @dragstart="onDishDragStart($event, dish)"
            @dragenter="onDishDragEnter($event, dish)"
            @dragover="onDishDragOver($event, dish)"
            @dragleave="onDishDragLeave($event, dish)"
            @drop="onDishDrop($event, dish, section)"
            @dragend="onDishDragEnd"
          >
            <div class="flex items-center gap-2">
              <span class="cursor-grab active:cursor-grabbing text-gray-400 select-none">⠿</span>
              <span class="font-medium text-slate">{{ dish.plato_nombre }}</span>
            </div>
            <button
              class="text-xs text-red-600 hover:text-red-800"
              @click="removeDish(dish.id)"
            >
              Quitar
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-400">Sin platos asignados</p>
      </div>
    </div>

    <!-- Add dish form -->
    <div v-if="currentConfig" class="rounded-lg border border-dashed border-gray-300 p-4">
      <h4 class="mb-3 font-medium text-slate">Añadir plato</h4>
      <div class="flex flex-wrap gap-3">
        <input
          v-model="newDish.plato_nombre"
          type="text"
          placeholder="Nombre del plato"
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @keyup.enter="addDish"
        />
        <select v-model="newDish.seccion" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option v-for="s in SECTIONS" :key="s" :value="s">{{ SECTION_LABELS[s] }}</option>
        </select>
        <button
          class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
          @click="addDish"
        >
          Añadir
        </button>
      </div>
    </div>
  </div>
</template>
