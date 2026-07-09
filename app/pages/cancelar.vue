<script setup lang="ts">
/**
 * /cancelar — Cancelar reserva por token (tocken-based cancellation)
 *
 * Read-only query param: ?token=<uuid>
 * Confirmation before POST /api/reservas/cancelar
 */
import { ref, onMounted } from 'vue'
import { generarReferencia } from '#shared/utils/referencia'
import PageHero from '../components/PageHero.vue'

const route = useRoute()
const token = ref<string>('')
const loading = ref(true)
const cancelling = ref(false)
const done = ref(false)
const error = ref('')
const info = ref<{
  fecha_hora: string
  numero_comensales: number | null
  estado: string
  referencia?: string
} | null>(null)

onMounted(async () => {
  const t = route.query?.token as string
  if (!t) {
    error.value = 'Enlace de cancelación no válido. Revisa tu email.'
    loading.value = false
    return
  }

  token.value = t

  try {
    const data = await $fetch<{
      fecha_hora: string
      numero_comensales: number | null
      estado: string
      referencia?: string
    }>('/api/reservas/cancelar-info', {
      params: { token: t },
    })
    info.value = data
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Error al cargar los datos de la reserva'
    error.value = msg
  } finally {
    loading.value = false
  }
})

async function handleCancel() {
  if (!token.value) return
  cancelling.value = true
  error.value = ''

  try {
    await $fetch('/api/reservas/cancelar', {
      method: 'POST',
      body: { token: token.value },
    })
    done.value = true
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Error al cancelar la reserva. Inténtalo de nuevo.'
    error.value = msg
  } finally {
    cancelling.value = false
  }
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <PageHero title="Cancelar reserva" subtitle="Gestiona tu reserva en La Zíngara" />

    <section class="mx-auto max-w-lg px-4 py-12">
      <!-- Loading -->
      <div v-if="loading" class="text-center">
        <p class="text-slate">Cargando datos de la reserva...</p>
      </div>

      <!-- Error (no token / invalid / expired / already cancelled) -->
      <div v-else-if="error && !info" class="rounded-lg bg-red-50 p-8 text-center">
        <h2 class="text-xl font-semibold text-red-800">No se puede cancelar la reserva</h2>
        <p class="mt-2 text-red-700">{{ error }}</p>
        <p class="mt-4 text-sm text-slate">
          Si crees que esto es un error, llámanos al
          <a href="tel:987350350" class="text-terracotta underline">987 350 350</a>.
        </p>
      </div>

      <!-- Success -->
      <div v-else-if="done" class="rounded-lg bg-green-50 p-8 text-center">
        <h2 class="text-2xl font-semibold text-green-800">Reserva cancelada</h2>
        <p class="mt-2 text-green-700">
          Tu reserva ha sido cancelada. Recibirás un email de confirmación.
        </p>
      </div>

      <!-- Info + Confirm -->
      <div v-else-if="info" class="rounded-lg border border-gray-200 bg-white p-8">
        <!-- Reservation details (prominent, first thing you see) -->
        <div class="mb-2 rounded-lg bg-cream p-5 text-center">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Detalles de la reserva</p>
          <div class="mt-3 space-y-1.5">
            <p class="text-lg font-semibold text-slate">
              {{ formatFecha(info.fecha_hora) }}
            </p>
            <p class="text-3xl font-bold text-slate">
              {{ formatHora(info.fecha_hora) }}
            </p>
            <p v-if="info.numero_comensales" class="text-base text-slate">
              {{ info.numero_comensales }} {{ info.numero_comensales === 1 ? 'comensal' : 'comensales' }}
            </p>
            <p v-if="info.referencia" class="text-sm text-terracotta">
              Ref: {{ info.referencia }}
            </p>
          </div>
        </div>

        <!-- Separator -->
        <div class="my-6 flex items-center gap-3">
          <div class="flex-1 border-t border-gray-200" />
          <span class="text-xs text-gray-300">···</span>
          <div class="flex-1 border-t border-gray-200" />
        </div>

        <!-- Question -->
        <h2 class="mb-2 text-center text-lg font-semibold text-slate">
          ¿Quieres cancelar esta reserva?
        </h2>
        <p class="mb-6 text-center text-sm text-gray-500">
          Esta acción no se puede deshacer. Recibirás un email de confirmación.
        </p>

        <!-- Error on submit -->
        <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
          {{ error }}
        </div>

        <!-- Action -->
        <button
          type="button"
          :disabled="cancelling"
          class="w-full rounded-lg bg-red-600 px-5 py-3 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleCancel"
        >
          {{ cancelling ? 'Cancelando...' : 'Cancelar mi reserva' }}
        </button>
      </div>
    </section>
  </div>
</template>
