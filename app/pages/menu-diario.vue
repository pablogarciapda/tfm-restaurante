<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** Normalize any text to sentence case: first letter uppercase, rest lowercase */
function sentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
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
const { config, items, precio, isHoliday, dayLabel } = useMenuDiario()
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

// Combined: no menu on Sunday or holidays (regardless of DB config)
const noMenuToday = computed(() => isSunday || isHoliday.value || !isAvailable.value)

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
      <!-- No menu today: Sunday, holiday, or no active config -->
      <div
        v-if="noMenuToday"
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
