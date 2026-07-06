<script setup lang="ts">
/**
 * Eventos page — Events listing from Supabase (EG-001)
 *
 * Data sourced from useEventos composable.
 * Only active, future events displayed. Sorted by fecha ASC.
 */

import { ref, watch } from 'vue'

interface EventoItem {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  categoria: string
  imagen_url?: string | null
  crop_focus_x: number
  crop_focus_y: number
}

const supabase = useSupabaseClient()

const { data: eventos, error, pending } = useEventos()

// Build events with resolved category names
const eventosConCategoria = ref<EventoItem[]>([])

watch(eventos, async (newEventos) => {
  if (!newEventos || (newEventos as unknown[]).length === 0) return

  const raw = newEventos as unknown as Array<{
    id: string
    titulo: string
    descripcion: string | null
    fecha: string
    categoria_id: string | null
    imagen_url?: string | null
    crop_focus_x: number
    crop_focus_y: number
  }>

  const ids = [...new Set(raw.map((e) => e.categoria_id).filter(Boolean))] as string[]

  const catMap: Record<string, string> = {}

  if (ids.length > 0) {
    const { data: cats } = await supabase
      .from('categorias_eventos')
      .select('id, nombre')
      .in('id', ids)

    if (cats) {
      for (const c of cats) {
        catMap[c.id] = c.nombre
      }
    }
  }

  eventosConCategoria.value = raw.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descripcion: e.descripcion,
    fecha: e.fecha,
    categoria: e.categoria_id ? (catMap[e.categoria_id] ?? e.categoria_id) : 'General',
    imagen_url: e.imagen_url,
    crop_focus_x: e.crop_focus_x,
    crop_focus_y: e.crop_focus_y,
  }))
}, { immediate: true })
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
            v-for="evento in eventosConCategoria"
            :key="evento.id"
            :evento="{ ...evento, descripcion: evento.descripcion ?? '', imagen_url: evento.imagen_url ?? undefined }"
          />
        </div>
      </template>
    </div>
  </div>
</template>
