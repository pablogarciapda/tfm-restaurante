<script setup lang="ts">
/**
 * Eventos page — Events listing from Supabase (EG-001)
 *
 * Data sourced from useEventos composable.
 * Only active, future events displayed. Sorted by fecha ASC.
 */

const { data: eventos, error, pending } = useEventos()
</script>

<template>
  <div class="min-h-screen">
    <PageHero title="Eventos" subtitle="Cenas temáticas y espectáculos en vivo" />

    <div class="mx-auto max-w-7xl px-4 py-12">
      <!-- Loading -->
      <div v-if="pending" class="py-20 text-center text-gray-500">
        <p class="text-lg">Cargando eventos...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-20 text-center text-gray-500">
        <p class="text-lg">Error al cargar los eventos</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!eventos || (eventos as unknown[]).length === 0" class="py-20 text-center text-gray-500">
        <p class="text-xl">No hay eventos programados</p>
        <p class="mt-2">Vuelve pronto para ver nuevas fechas</p>
      </div>

      <!-- Events grid -->
      <template v-else>
        <h2 class="mb-8 text-2xl font-bold text-slate">Próximos eventos</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <EventCard
            v-for="evento in (eventos as unknown[])"
            :key="(evento as { id: string }).id"
            :evento="evento"
          />
        </div>
      </template>
    </div>
  </div>
</template>
