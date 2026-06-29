<script setup lang="ts">
/**
 * Default layout — wraps every public page with AppHeader + AppFooter.
 *
 * AppHeader and AppFooter are auto-imported from app/components/
 * via Nuxt 4 file-based component resolution.
 */
</script>

<template>
  <div class="flex min-h-screen flex-col bg-cream">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
