<!--
  /cocina/reservas — Placeholder for Phase 3 (table manager)

  Permission-controlled via middleware (auth, role, permissions: 'reservas').
  Shows "Próximamente" message about the interactive floor plan.
-->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-20 text-center">
    <!-- Icon -->
    <div class="mb-6 rounded-full bg-cream p-6">
      <svg
        class="h-16 w-16 text-terracotta"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0v12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25"
        />
      </svg>
    </div>

    <h1 class="font-serif text-3xl font-bold text-slate">Gestor de Reservas</h1>

    <p class="mt-4 max-w-md text-lg text-gray-500">Próximamente</p>

    <p class="mt-2 max-w-md text-sm text-gray-400">
      El gestor de mesas con plano interactivo estará disponible en una próxima fase.
    </p>
  </div>
</template>
