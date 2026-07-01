<!--
  Dashboard Page — /cocina/dashboard (DASH-001–DASH-005)

  Read-only metrics: total platos (disponible=true), today's reservations,
  and active future events. Uses MetricCard components.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role'],
})

const client = useSupabaseClient()

const totalPlatos = ref<number | null>(null)
const reservasHoy = ref<number | null>(null)
const eventosActivos = ref<number | null>(null)
const loadingPlatos = ref(true)
const loadingReservas = ref(true)
const loadingEventos = ref(true)
const errors = ref<string[]>([])

async function fetchMetrics() {
  // Today date range for reservations
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  try {
    // Total platos (disponible = true)
    const { count: platosCount, error: platosError } = await client
      .from('platos')
      .select('*', { count: 'exact', head: true })
      .eq('disponible', true)

    if (platosError) errors.value.push('Error al cargar platos')
    else totalPlatos.value = platosCount ?? 0
    loadingPlatos.value = false

    // Reservas hoy
    const { count: reservasCount, error: reservasError } = await client
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_hora', todayStart)
      .lt('fecha_hora', todayEnd)

    if (reservasError) errors.value.push('Error al cargar reservas')
    else reservasHoy.value = reservasCount ?? 0
    loadingReservas.value = false

    // Eventos activos (activo=true, fecha >= today)
    const { count: eventosCount, error: eventosError } = await client
      .from('eventos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gte('fecha', todayStart)

    if (eventosError) errors.value.push('Error al cargar eventos')
    else eventosActivos.value = eventosCount ?? 0
    loadingEventos.value = false
  } catch {
    errors.value.push('Error de conexión')
    loadingPlatos.value = false
    loadingReservas.value = false
    loadingEventos.value = false
  }
}

onMounted(() => {
  fetchMetrics()
})
</script>

<template>
  <div>
    <h1 class="mb-6 font-serif text-2xl font-bold text-slate">
      Panel de Control
    </h1>

    <!-- Error banner -->
    <div
      v-if="errors.length > 0"
      class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
    >
      <p v-for="(err, i) in errors" :key="i">{{ err }}</p>
    </div>

    <!-- Metric cards grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        label="Platos en carta"
        :value="totalPlatos ?? '--'"
        :loading="loadingPlatos"
        icon="🍽️"
      />
      <MetricCard
        label="Reservas hoy"
        :value="reservasHoy ?? '--'"
        :loading="loadingReservas"
        icon="📅"
      />
      <MetricCard
        label="Eventos activos"
        :value="eventosActivos ?? '--'"
        :loading="loadingEventos"
        icon="🎉"
      />
    </div>
  </div>
</template>
