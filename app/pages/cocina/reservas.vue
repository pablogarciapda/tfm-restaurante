<!--
  /cocina/reservas — Interactive table manager (MCA-008)

  Permission-controlled SPA-only page (ssr:false via routeRules).
  Middleware: auth, role, permissions (reservas). Layout: cocina.

  Loads mesas on mount via useMesas composable.
  Subscribes to Supabase Realtime for cross-session sync.
-->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import TableCanvas from '../../features/mesas/components/TableCanvas.vue'
import { useMesas } from '../../features/mesas/composables/useMesas'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const { loadMesas, subscribeRealtime, unsubscribeRealtime } = useMesas()

onMounted(async () => {
  await loadMesas()
  subscribeRealtime()
})

onUnmounted(() => {
  unsubscribeRealtime()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Page title — toolbar placeholder for Slice 3 -->
    <div class="flex items-center justify-between">
      <h1 class="font-serif text-2xl font-bold text-slate">Gestor de Mesas</h1>
    </div>

    <!-- Konva canvas with 3-layer table manager -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <TableCanvas />
    </div>
  </div>
</template>
