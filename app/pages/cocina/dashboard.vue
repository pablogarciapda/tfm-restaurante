<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role'],
})

interface DashboardStats {
  totalPlatos: number
  reservasHoy: number
  eventosActivos: number
  reservasUltimos30: { fecha: string; total: number }[]
  topClientes: { nombre: string; telefono: string; total: number }[]
  reservasPorDiaSemana: { dia: number; total: number }[]
  reservasPorEstado: { estado: string; total: number }[]
  aforoActual: { ocupadas: number; capacidad: number }
  mediaComensales: number
  totalClientes: number
  totalReservas: number
}

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref('')

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const loadingStats = computed(() => loading.value)
const aforoPct = computed(() => {
  if (!stats.value?.aforoActual.capacidad) return 0
  return Math.round((stats.value.aforoActual.ocupadas / stats.value.aforoActual.capacidad) * 100)
})

async function fetchStats() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await $fetch<DashboardStats>('/api/dashboard/stats')
  } catch {
    error.value = 'Error al cargar las estadísticas'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div>
    <h1 class="mb-6 font-serif text-2xl font-bold text-slate">
      Panel de Control
    </h1>

    <div v-if="error" class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="loadingStats" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div v-for="i in 3" :key="'chart-'+i" class="h-72 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>

    <!-- Dashboard content -->
    <template v-if="stats && !loadingStats">
      <!-- Top metric cards -->
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Platos en carta" :value="stats.totalPlatos" :loading="false" icon="🍽️" />
        <MetricCard label="Reservas hoy" :value="stats.reservasHoy" :loading="false" icon="📅" />
        <MetricCard label="Eventos activos" :value="stats.eventosActivos" :loading="false" icon="🎉" />
        <MetricCard label="Total clientes" :value="stats.totalClientes" :loading="false" icon="👥" />
      </div>

      <!-- Second row: aforo + media -->
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Aforo actual -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <p class="mb-2 text-sm font-medium text-slate/60">Aforo actual</p>
          <p class="font-serif text-3xl font-bold text-terracotta">
            {{ stats.aforoActual.ocupadas }} / {{ stats.aforoActual.capacidad }}
          </p>
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="aforoPct > 80 ? 'bg-red-500' : aforoPct > 50 ? 'bg-amber-500' : 'bg-green-500'"
              :style="{ width: aforoPct + '%' }"
            />
          </div>
          <p class="mt-1 text-xs text-slate/50">{{ aforoPct }}% de ocupación</p>
        </div>

        <!-- Media comensales -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <p class="mb-2 text-sm font-medium text-slate/60">Media comensales</p>
          <p class="font-serif text-3xl font-bold text-terracotta">
            {{ stats.mediaComensales }}
          </p>
          <p class="mt-1 text-xs text-slate/50">por reserva</p>
        </div>

        <!-- Total reservas histórico -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <p class="mb-2 text-sm font-medium text-slate/60">Total reservas</p>
          <p class="font-serif text-3xl font-bold text-terracotta">
            {{ stats.totalReservas }}
          </p>
          <p class="mt-1 text-xs text-slate/50">histórico</p>
        </div>
      </div>

      <!-- Charts grid -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Top 5 clientes -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <ChartBarHorizontal
            :labels="stats.topClientes.map(c => c.nombre)"
            :values="stats.topClientes.map(c => c.total)"
            title="Top 5 clientes"
          />
          <div v-if="stats.topClientes.length === 0" class="flex h-48 items-center justify-center text-sm text-slate/40">
            Sin datos de clientes
          </div>
        </div>

        <!-- Reservas por día de la semana -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <ChartBar
            :labels="NOMBRES_DIA"
            :values="stats.reservasPorDiaSemana.map(d => d.total)"
            title="Reservas por día"
          />
        </div>

        <!-- Reservas últimos 30 días -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <ChartLine
            :labels="stats.reservasUltimos30.map(r => r.fecha.slice(5))"
            :values="stats.reservasUltimos30.map(r => r.total)"
            title="Reservas últimos 30 días"
          />
        </div>

        <!-- Reservas por estado -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <ChartDoughnut
            :labels="stats.reservasPorEstado.map(e => e.estado)"
            :values="stats.reservasPorEstado.map(e => e.total)"
            title="Reservas por estado"
          />
        </div>
      </div>
    </template>
  </div>
</template>