<script setup lang="ts">
import { computed } from 'vue'
import { mockMenuDiario } from '../../shared/fixtures/menu-diario-mock'

/**
 * Menu Diario page — 5-section daily menu (MD-001, MD-002, MD-003)
 *
 * Day rotation: new Date().getDay() selects today's menu.
 * Fallback to day 0 (Sunday) if today not found.
 * Price from mock data, displayed prominently.
 */

// Select today's menu based on day of week
const today = new Date().getDay()
const menuDelDia = computed(() => {
  const found = mockMenuDiario.find((d) => d.dia === today)
  return found || mockMenuDiario.find((d) => d.dia === 0) || null
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero title="Menú del Día" subtitle="Cocina casera de lunes a domingo" />

    <div class="mx-auto max-w-3xl px-4 py-12">
      <!-- Price display -->
      <div
        v-if="menuDelDia"
        class="mb-10 text-center"
      >
        <span class="inline-block rounded-full bg-terracotta px-6 py-2 text-2xl font-bold text-white">
          Menú del día — {{ menuDelDia.precio }}€
        </span>
        <p class="mt-2 text-sm text-gray-500">IVA incluido</p>
      </div>

      <!-- Not available fallback -->
      <div
        v-if="!menuDelDia"
        class="py-20 text-center text-gray-500"
      >
        <p class="text-xl">Menú no disponible hoy</p>
        <p class="mt-2">Consulte por teléfono</p>
      </div>

      <!-- 5 sections -->
      <template v-if="menuDelDia">
        <div
          v-for="seccion in menuDelDia.secciones"
          :key="seccion.nombre"
          class="mb-8"
        >
          <h2 class="mb-4 text-xl font-bold text-terracotta">
            {{ seccion.nombre }}
          </h2>

          <ul class="space-y-3">
            <li
              v-for="plato in seccion.platos"
              :key="plato.nombre"
              class="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm"
            >
              <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-terracotta" />
              <div>
                <span class="font-medium text-slate">{{ plato.nombre }}</span>
                <p
                  v-if="plato.descripcion"
                  class="mt-0.5 text-sm text-gray-500"
                >
                  {{ plato.descripcion }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>
