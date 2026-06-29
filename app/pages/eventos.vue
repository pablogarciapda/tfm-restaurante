<script setup lang="ts">
import { computed } from 'vue'
import { mockEventos } from '../../shared/fixtures/eventos-mock'

/**
 * Eventos page — Events listing sorted by date (EG-001, EG-003)
 *
 * Upcoming events first, past at end. Responsive grid 1/2/3 cols.
 * "No hay eventos próximos" empty state when all past.
 */

// Sort: future first (ascending), past at end (descending)
const sortedEventos = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const future = mockEventos
    .filter((e) => new Date(e.fecha) >= now)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  const past = mockEventos
    .filter((e) => new Date(e.fecha) < now)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return { future, past }
})
</script>

<template>
  <div class="min-h-screen">
    <PageHero title="Eventos" subtitle="Cenas temáticas y espectáculos en vivo" />

    <div class="mx-auto max-w-7xl px-4 py-12">
      <!-- Upcoming events -->
      <section class="mb-16">
        <h2 class="mb-8 text-2xl font-bold text-slate">Próximos eventos</h2>

        <div v-if="sortedEventos.future.length === 0" class="py-12 text-center text-gray-500">
          <p class="text-xl">No hay eventos programados</p>
          <p class="mt-2">Vuelve pronto para ver nuevas fechas</p>
        </div>

        <div
          v-else
          class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          <EventCard
            v-for="evento in sortedEventos.future"
            :key="evento.id"
            :evento="evento"
          />
        </div>
      </section>

      <!-- Past events -->
      <section v-if="sortedEventos.past.length > 0">
        <h2 class="mb-8 text-xl font-bold text-gray-400">Eventos pasados</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <EventCard
            v-for="evento in sortedEventos.past"
            :key="evento.id"
            :evento="evento"
          />
        </div>
      </section>
    </div>
  </div>
</template>
