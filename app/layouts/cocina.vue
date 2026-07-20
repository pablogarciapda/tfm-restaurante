<!--
  Cocina Admin Layout — Sidebar + top bar + main slot (PU-010)

  Wraps all /cocina/** pages. Terracotta/cream/slate palette.
  Top bar shows user email + logout. ClientOnly wraps user-dependent content.
-->
<script setup lang="ts">
const user = useSupabaseUser()
const { signOut } = useAuth()
const showMobileMenu = ref(false)
const { nombre } = useRestaurantConfig()
import { computed } from 'vue'
const route = useRoute()

/** Hide the sidebar on full-screen canvas pages to maximize space */
const hideSidebar = computed(() => ['/cocina/reservas', '/cocina/diseno'].includes(route.path))

function closeMobileMenu() {
  showMobileMenu.value = false
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-cream">
    <!-- Overlay (mobile + reservas) -->
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 z-30 bg-black/30"
      :class="{ 'md:hidden': !hideSidebar }"
      @click="closeMobileMenu"
    />

    <!-- Sidebar (hidden on reservas, togglable via hamburger everywhere) -->
    <aside
      v-if="!hideSidebar || showMobileMenu"
      class="w-60 flex-shrink-0"
      :class="{
        'max-md:fixed max-md:left-0 max-md:top-0 max-md:z-30 max-md:h-full max-md:-translate-x-full max-md:transition-transform max-md:duration-200': !hideSidebar,
        'max-md:translate-x-0': showMobileMenu,
        'fixed left-0 top-0 z-30 h-full': hideSidebar && showMobileMenu,
      }"
    >
      <AdminSidebar @navigate="closeMobileMenu" />
    </aside>

    <!-- Content area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top bar -->
      <header
        class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <!-- Mobile hamburger (always visible when sidebar is hidden) -->
          <button
            class="rounded-md p-1 text-slate hover:bg-cream"
            :class="{ 'md:hidden': !hideSidebar }"
            aria-label="Abrir menú"
            @click="showMobileMenu = !showMobileMenu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span class="font-serif text-lg font-bold text-terracotta">{{ nombre || 'Restaurante' }}</span>
        </div>

        <div class="flex items-center gap-4">
          <ClientOnly>
            <span class="text-sm text-slate">{{ user?.email }}</span>
            <template #fallback>
              <span class="text-sm text-slate">—</span>
            </template>
          </ClientOnly>

          <button
            data-testid="logout-button"
            class="rounded-md px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-cream hover:text-terracotta"
            @click="signOut"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto px-6 pb-6">
        <slot />
      </main>
    </div>
  </div>
</template>
