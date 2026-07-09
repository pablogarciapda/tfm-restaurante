<script setup lang="ts">
// Root component — renders NuxtLayout + NuxtPage shell
const { nombre } = useRestaurantConfig()
useHead({
  title: computed(() => nombre.value || 'Restaurante'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
