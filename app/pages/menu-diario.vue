<script setup lang="ts">
import { computed } from 'vue'

/**
 * Menu Diario page — 5-section daily menu from Supabase (MD-001, MD-004, MD-005)
 *
 * Data sourced from menu_diario_config + menu_diario_items via useMenuDiario().
 * Variable per-day pricing from DB. Inactive days show fallback.
 * Holiday check via eventos table (categoria='festivo').
 */

interface MenuDish {
  id: string
  plato_nombre: string
  descripcion?: string
  seccion: string
  puesto: number
}

const { config, items, precio, isHoliday } = useMenuDiario()

// Whether the menu is available today
const isAvailable = computed(() => config.value !== null && precio.value !== null)

// Day-of-week check
const dayOfWeek = new Date().getDay()
const isSunday = dayOfWeek === 0

// Combined: no menu on Sunday or holidays (regardless of DB config)
const noMenuToday = computed(() => isSunday || isHoliday.value || !isAvailable.value)

// Map section keys to display labels (Spanish)
const SECTION_LABELS: Record<string, string> = {
  primer: 'Primer Plato',
  segundo: 'Segundo Plato',
  postre: 'Postre',
  bebida: 'Bebida',
  pan: 'Pan y Cubiertos',
}

const sectionKeys = ['primer', 'segundo', 'postre', 'bebida', 'pan'] as const

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
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero title="Menú del Día" subtitle="Cocina casera de lunes a sábado" />

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
            Menú del día — {{ precio }}€
          </span>
        </div>

        <!-- 5 sections -->
        <div
          v-for="key in sectionKeys"
          :key="key"
          class="mb-8"
        >
          <h2 class="mb-4 text-xl font-bold text-terracotta">
            {{ SECTION_LABELS[key] }}
          </h2>

          <template v-if="items && ((items as Record<string, MenuDish[]>)[key]?.length ?? 0) > 0">
            <ul class="space-y-3">
              <li
                v-for="dish in (items as Record<string, MenuDish[]>)[key]"
                :key="dish.id"
                class="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm"
              >
                <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-terracotta" />
                <div>
                  <span class="font-medium text-slate">{{ dish.plato_nombre }}</span>
                  <p
                    v-if="dish.descripcion"
                    class="mt-0.5 text-sm text-gray-500"
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
