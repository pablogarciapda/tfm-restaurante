<script setup lang="ts">
/**
 * EventCard — Event display card (EG-002, EG-004)
 *
 * Date formatted "DD de Mes" (Spanish), title, description (line-clamp-3),
 * placeholder image (loading="lazy"), "Reservar" BaseButton → /reservas,
 * soldOut badge (red), past-event badge (gray, disabled CTA).
 */

defineProps<{
  evento: {
    id: string
    fecha: string
    titulo: string
    descripcion: string
    imagen_url?: string
    categoria: 'festivo' | 'espectaculo'
    soldOut?: boolean
  }
}>()

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatFecha(fecha: string): string {
  const d = new Date(fecha)
  const dia = d.getDate()
  const mes = MESES[d.getMonth()]
  return `${dia} de ${mes}`
}

function isPast(fecha: string): boolean {
  const d = new Date(fecha)
  const now = new Date()
  // Subtract 1 day to give events on "today" the benefit of the doubt
  d.setHours(23, 59, 59, 999)
  return d < now
}

function categoryLabel(cat: string): string {
  return cat === 'festivo' ? 'Festivo' : 'Espectáculo'
}
</script>

<template>
  <article class="overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg">
    <!-- Image -->
    <div class="relative h-48 overflow-hidden bg-gray-200">
      <img
        v-if="evento.imagen_url"
        :src="evento.imagen_url"
        :alt="evento.titulo"
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <div
        v-else
        class="flex h-full items-center justify-center bg-gradient-to-br from-terracotta/20 to-cream"
      >
        <span class="text-4xl">🎉</span>
      </div>

      <!-- Badges -->
      <div class="absolute left-3 top-3 flex gap-2">
        <span class="rounded-full bg-terracotta px-3 py-1 text-xs font-medium text-white">
          {{ categoryLabel(evento.categoria) }}
        </span>
        <span
          v-if="evento.soldOut"
          class="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white"
        >
          Agotado
        </span>
        <span
          v-if="!evento.soldOut && isPast(evento.fecha)"
          class="rounded-full bg-gray-500 px-3 py-1 text-xs font-medium text-white"
        >
          Evento pasado
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Date -->
      <span class="text-sm font-semibold text-terracotta">
        {{ formatFecha(evento.fecha) }}
      </span>

      <!-- Title -->
      <h3 class="mt-1 text-lg font-bold text-slate">
        {{ evento.titulo }}
      </h3>

      <!-- Description (line-clamp-3) -->
      <p class="mt-2 line-clamp-3 text-sm text-gray-600">
        {{ evento.descripcion }}
      </p>

      <!-- CTA -->
      <div class="mt-4">
        <NuxtLink v-if="!evento.soldOut && !isPast(evento.fecha)" to="/reservas">
          <BaseButton variant="primary" size="sm">
            Reservar
          </BaseButton>
        </NuxtLink>
        <BaseButton
          v-else
          variant="ghost"
          size="sm"
          disabled
        >
          {{ evento.soldOut ? 'Agotado' : 'Evento pasado' }}
        </BaseButton>
      </div>
    </div>
  </article>
</template>
