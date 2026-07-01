<script setup lang="ts">
import { computed } from 'vue'

/**
 * Menu Diario page — 5-section daily menu from Supabase (MD-001, MD-004, MD-005)
 *
 * Data sourced from menu_diario_config + menu_diario_items via useMenuDiario().
 * Variable per-day pricing from DB. Inactive days show fallback.
 */

interface MenuDish {
  id: string
  plato_nombre: string
  descripcion?: string
  seccion: string
  puesto: number
}

const { config, items, precio } = useMenuDiario()

// Whether the menu is available today
const isAvailable = computed(() => config.value !== null && precio.value !== null)

// Map section keys to display labels (Spanish)
const SECTION_LABELS: Record<string, string> = {
  primer: 'Primer Plato',
  segundo: 'Segundo Plato',
  postre: 'Postre',
  bebida: 'Bebida',
  pan: 'Pan y Cubiertos',
}

const sectionKeys = ['primer', 'segundo', 'postre', 'bebida', 'pan'] as const
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero title="Menú del Día" subtitle="Cocina casera de lunes a domingo" />

    <div class="mx-auto max-w-3xl px-4 py-12">
      <!-- Not available fallback -->
      <div
        v-if="!isAvailable"
        class="py-20 text-center text-gray-500"
      >
        <p class="text-xl">Menú no disponible hoy</p>
        <p class="mt-2">Consulte por teléfono</p>
      </div>

      <template v-else>
        <!-- Price display -->
        <div class="mb-10 text-center">
          <span class="inline-block rounded-full bg-terracotta px-6 py-2 text-2xl font-bold text-white">
            Menú del día — {{ precio }}€
          </span>
          <p class="mt-2 text-sm text-gray-500">IVA incluido</p>
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

          <template v-if="items && (items as Record<string, MenuDish[]>)[key]?.length > 0">
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
