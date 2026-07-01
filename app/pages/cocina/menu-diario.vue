<!--
  Menu Diario Admin — Day config + dish management (CMD-001–CMD-005)
-->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-slate">Menú Diario</h1>
    <MenuDiarioEditor />
  </div>
</template>
