<script setup lang="ts">
/**
 * Home page — Public landing with hero and navigation cards (PU-007)
 *
 * Navigation: 5 BaseCards linking to /carta, /menu-diario, /reservas, /eventos, /contacto
 * via NuxtLink. Each card has a title, short description, and "Ver más" BaseButton.
 *
 * Eventos card: shows image from the closest upcoming event in DB.
 */

import { computed } from 'vue'
import { toProxyUrl } from '~/utils/image-url'

const supabase = useSupabaseClient()

const { data: proximoEvento } = useAsyncData('home-proximo-evento', async () => {
  const { data } = await supabase
    .from('eventos')
    .select('titulo, imagen_url')
    .eq('activo', true)
    .gte('fecha', new Date().toISOString())
    .order('fecha', { ascending: true })
    .limit(1)

  return data?.[0] ?? null
})

const eventoImage = computed(() => {
  if (proximoEvento.value?.imagen_url) {
    return toProxyUrl(proximoEvento.value.imagen_url)
  }
  return null
})

const eventoAlt = computed(() => {
  return proximoEvento.value?.titulo ?? 'Espectáculo de flamenco'
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <PageHero
      title="Restaurante La Zíngara"
      subtitle="Santa María del Páramo, León"
    />

    <!-- Navigation cards grid -->
    <section class="mx-auto max-w-7xl px-4 py-12">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Carta -->
        <NuxtLink to="/carta" class="group h-full">
          <BaseCard
            image="https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800"
            image-alt="Plato de zamburiñas a la plancha"
          >
            <h2 class="text-xl font-bold text-slate">Carta</h2>
            <p class="mt-2 text-sm text-gray-600">
              Descubre nuestra selección de platos tradicionales leoneses y
              especialidades de la casa. Productos frescos de temporada.
            </p>
            <div class="mt-auto pt-4">
              <BaseButton variant="primary" size="sm">Ver más</BaseButton>
            </div>
          </BaseCard>
        </NuxtLink>

        <!-- Menú del Día -->
        <NuxtLink to="/menu-diario" class="group h-full">
          <BaseCard
            image="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"
            image-alt="Menú del día"
          >
            <h2 class="text-xl font-bold text-slate">Menú del Día</h2>
            <p class="mt-2 text-sm text-gray-600">
              Menú diario con primer y segundo plato, postre, bebida y pan.
              Opciones que cambian cada día de la semana.
            </p>
            <div class="mt-auto pt-4">
              <BaseButton variant="primary" size="sm">Ver más</BaseButton>
            </div>
          </BaseCard>
        </NuxtLink>

        <!-- Reservas -->
        <NuxtLink to="/reservas" class="group h-full">
          <BaseCard
            image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
            image-alt="Interior del restaurante"
          >
            <h2 class="text-xl font-bold text-slate">Reservas</h2>
            <p class="mt-2 text-sm text-gray-600">
              Reserva tu mesa de forma sencilla. Elige fecha, hora y número de
              comensales. Te confirmamos al instante.
            </p>
            <div class="mt-auto pt-4">
              <BaseButton variant="primary" size="sm">Ver más</BaseButton>
            </div>
          </BaseCard>
        </NuxtLink>

        <!-- Eventos -->
        <NuxtLink to="/eventos" class="group h-full">
          <BaseCard
            :image="eventoImage ?? 'https://images.unsplash.com/photo-1516306580123-e6e52b5b5b2c?w=800'"
            :image-alt="eventoAlt"
          >
            <h2 class="text-xl font-bold text-slate">Eventos</h2>
            <p class="mt-2 text-sm text-gray-600">
              Espectáculos en vivo, cenas temáticas y celebraciones especiales.
              Flamenco, comedia, magia y más.
            </p>
            <div class="mt-auto pt-4">
              <BaseButton variant="primary" size="sm">Ver más</BaseButton>
            </div>
          </BaseCard>
        </NuxtLink>

        <!-- Contacto -->
        <NuxtLink to="/contacto" class="group h-full">
          <BaseCard
            image="https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800"
            image-alt="Mapa de Santa María del Páramo"
          >
            <h2 class="text-xl font-bold text-slate">Contacto</h2>
            <p class="mt-2 text-sm text-gray-600">
              Encuéntranos en Santa María del Páramo. Consulta nuestro horario,
              teléfono y ubicación en el mapa.
            </p>
            <div class="mt-auto pt-4">
              <BaseButton variant="primary" size="sm">Ver más</BaseButton>
            </div>
          </BaseCard>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
