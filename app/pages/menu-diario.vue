<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** Normalize any text to sentence case: first letter uppercase, rest lowercase */
function sentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatFechaSpan(desde: string, hasta: string): string {
  const d = new Date(desde + 'T12:00:00')
  const h = new Date(hasta + 'T12:00:00')
  if (desde === hasta) {
    return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
  }
  if (d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear()) {
    return `Del ${d.getDate()} al ${h.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
  }
  return `Del ${d.getDate()} de ${MONTHS[d.getMonth()]} al ${h.getDate()} de ${MONTHS[h.getMonth()]} de ${d.getFullYear()}`
}

/**
 * Menu Diario page — 5-section daily menu from Supabase (MD-001, MD-004, MD-005)
 *
 * Data sourced from menu_diario_config + menu_diario_items via useMenuDiario().
 * Variable per-day pricing from DB. Inactive days show fallback.
 * Holiday check via eventos table (categoria='festivo').
 * Section visibility and titles configurable from admin panel.
 *
 * Realtime subscription updates the dish list when admin changes items (e.g. agotado toggle).
 */

interface MenuDish {
  id: string
  plato_nombre: string
  descripcion?: string
  seccion: string
  puesto: number
  agotado: boolean
}

interface SeccionConfig {
  activo: boolean
  titulo: string
}

const client = useSupabaseClient()
const { config, items, precio, isHoliday, dayLabel, blockedDay } = useMenuDiario()
const liveItems = ref<Record<string, MenuDish[]> | null>(null)
const livePrecio = ref<string | null>(null)
const channelRef = ref<RealtimeChannel | null>(null)

// Use Realtime-updated items when available, fall back to SSR data
const displayItems = computed(() => liveItems.value ?? items.value)
const displayPrecio = computed(() => livePrecio.value ?? precio.value)

// Whether the menu is available today
const isAvailable = computed(() => config.value !== null && precio.value !== null)

// Day-of-week check
const dayOfWeek = new Date().getDay()
const isSunday = dayOfWeek === 0

// Restaurant is closed (blocked day) — takes priority over everything
const isClosed = computed(() => blockedDay.value !== null)

// Combined: no menu on blocked days, Sunday, holidays, or inactive config
const noMenuToday = computed(() => isClosed.value || isSunday || isHoliday.value || !isAvailable.value)

// Default section labels (fallback when secciones_config is not set)
const DEFAULT_SECCIONES: Record<string, SeccionConfig> = {
  primer: { activo: true, titulo: 'Primer Plato' },
  segundo: { activo: true, titulo: 'Segundo Plato' },
  postre: { activo: true, titulo: 'Postre' },
  bebida: { activo: true, titulo: 'Bebida' },
  pan: { activo: true, titulo: 'Pan y Cubiertos' },
}

// Section config from DB, merged with defaults
const seccionesConfig = computed<Record<string, SeccionConfig>>(() => {
  const raw = (config.value as Record<string, unknown> | null)?.secciones_config as Record<string, SeccionConfig> | null
  const merged: Record<string, SeccionConfig> = {}
  for (const [key, def] of Object.entries(DEFAULT_SECCIONES)) {
    merged[key] = raw?.[key] ?? def
  }
  return merged
})

// Only show sections that are active
const sectionKeys = computed(() =>
  (['primer', 'segundo', 'postre', 'bebida', 'pan'] as const).filter(
    (key) => seccionesConfig.value[key]?.activo !== false,
  ),
)

function getSectionTitle(section: string): string {
  return sentenceCase(seccionesConfig.value[section]?.titulo ?? section)
}

// Spanish date formatting
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const today = new Date()
const formattedDate = computed(() => {
  const d = today
  const dayName = DAY_NAMES[d.getDay()]
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${dayName} ${day}/${month}/${year}`
})

// ── Realtime subscription for menu_diario_items + config changes ──
onMounted(() => {
  channelRef.value = client.channel('menu-diario-items-realtime')
  channelRef.value
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'menu_diario_items' },
      async () => {
        // Refetch items from the current config
        const cfg = config.value as Record<string, unknown> | null
        if (!cfg?.id) return
        const { data } = await client
          .from('menu_diario_items')
          .select('*')
          .eq('config_id', cfg.id as string)
          .order('puesto')
        if (!data) return
        const grouped: Record<string, MenuDish[]> = {
          primer: [],
          segundo: [],
          postre: [],
          bebida: [],
          pan: [],
        }
        for (const item of data as MenuDish[]) {
          const section = item.seccion as keyof typeof grouped
          if (section in grouped) {
            grouped[section].push(item)
          }
        }
        liveItems.value = grouped
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'configuracion' },
      async () => {
        // Refetch prices directly from configuracion
        const { data: sysConfig } = await client
          .from('configuracion')
          .select('precio_menu_diario, precio_menu_sabado, precio_menu_domingo')
          .single()
        if (!sysConfig) return
        const dow = new Date().getDay()
        let p: number | null = null
        if (dow === 6) p = (sysConfig as any).precio_menu_sabado
        else if (dow === 0) p = (sysConfig as any).precio_menu_domingo
        else p = (sysConfig as any).precio_menu_diario
        if (p != null) {
          livePrecio.value = String(p)
        }
      },
    )
    .subscribe()
  })

onUnmounted(() => {
  if (channelRef.value) {
    client.removeChannel(channelRef.value)
    channelRef.value = null
  }
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero title="Menú del Día" :subtitle="dayLabel || 'Cocina casera'" />

    <div class="mx-auto max-w-3xl px-4 py-12">
      <!-- Cerrado por vacaciones / blocked day -->
      <div
        v-if="isClosed && blockedDay"
        class="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-8 py-12 text-center shadow-sm"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg class="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h2 class="mb-2 text-2xl font-bold text-amber-900">Cerrado</h2>
        <p class="mb-4 text-lg text-amber-800">{{ sentenceCase(blockedDay.motivo) }}</p>
        <p class="text-sm text-amber-600">
          {{ formatFechaSpan(blockedDay.desde, blockedDay.hasta) }}
        </p>
        <p class="mt-6 text-sm text-amber-500">Vuelva pronto</p>
      </div>

      <!-- No menu today: Sunday, holiday, or no active config -->
      <div
        v-else-if="noMenuToday"
        class="py-20 text-center text-gray-500"
      >
        <p class="text-xl">Hoy no disponemos de menú</p>
        <p class="mt-2">Consulte por teléfono</p>
      </div>

      <template v-else>
        <!-- Date display -->
        <p class="mb-4 text-center text-sm font-medium text-gray-500">
          {{ formattedDate }}
        </p>

        <!-- Price display -->
        <div class="mb-10 text-center">
          <span class="inline-block rounded-full bg-terracotta px-6 py-2 text-2xl font-bold text-white">
            Menú del día — {{ displayPrecio }}€
          </span>
        </div>

        <!-- Sections (only active ones) -->
        <div
          v-for="key in sectionKeys"
          :key="key"
          class="mb-8"
        >
          <h2 class="mb-4 text-xl font-bold text-terracotta">
            {{ getSectionTitle(key) }}
          </h2>

          <template v-if="displayItems && (displayItems[key]?.length ?? 0) > 0">
            <ul class="space-y-3">
              <li
                v-for="dish in displayItems[key]"
                :key="dish.id"
                class="flex items-start gap-3 rounded-lg p-3 shadow-sm"
                :class="dish.agotado ? 'bg-red-50/50' : 'bg-white'"
              >
                <span
                  class="mt-1 h-2 w-2 shrink-0 rounded-full"
                  :class="dish.agotado ? 'bg-red-300' : 'bg-terracotta'"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-medium"
                      :class="dish.agotado ? 'text-red-400 line-through' : 'text-slate'"
                    >
                      {{ sentenceCase(dish.plato_nombre) }}
                    </span>
                    <span
                      v-if="dish.agotado"
                      class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600"
                    >
                      Agotado
                    </span>
                  </div>
                  <p
                    v-if="dish.descripcion"
                    class="mt-0.5 text-sm"
                    :class="dish.agotado ? 'text-red-300' : 'text-gray-500'"
                  >
                    {{ dish.descripcion }}
                  </p>
                </div>
              </li>
            </ul>
          </template>
          <p v-else class="text-sm text-gray-400">Consultar</p>
        </div>
      </template>
    </div>
  </div>
</template>
