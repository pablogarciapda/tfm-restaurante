<!--
  Cocina Admin Layout — Sidebar + top bar + main slot (PU-010)

  Wraps all /cocina/** pages. Terracotta/cream/slate palette.
  Top bar shows user email + logout. ClientOnly wraps user-dependent content.
-->
<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()

async function handleLogout() {
  await client.auth.signOut()
  await navigateTo('/cocina')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-cream">
    <!-- Sidebar (fixed left) -->
    <aside class="hidden w-60 flex-shrink-0 md:block">
      <AdminSidebar @logout="handleLogout" />
    </aside>

    <!-- Content area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top bar -->
      <header
        class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <!-- Mobile hamburger (placeholder — toggles mobile sidebar) -->
          <button
            class="rounded-md p-1 text-slate hover:bg-cream md:hidden"
            aria-label="Abrir menú"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span class="font-serif text-lg font-bold text-terracotta">La Zíngara</span>
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
            @click="handleLogout"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
