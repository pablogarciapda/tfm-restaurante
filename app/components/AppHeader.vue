<script setup lang="ts">
import { ref } from 'vue'

/**
 * AppHeader — Main navigation header (PU-003)
 *
 * 6 nav links via NuxtLink, hamburger toggle for mobile (<768px),
 * sticky top-0. Spanish labels per project language policy.
 */

const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Carta', to: '/carta' },
  { label: 'Menú', to: '/menu-diario' },
  { label: 'Reservas', to: '/reservas' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Contacto', to: '/contacto' },
]

const isMenuOpen = ref(false)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
    <nav
      class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"
      role="navigation"
      aria-label="Navegación principal"
    >
      <!-- Restaurant logo -->
      <NuxtLink to="/" class="flex items-center">
        <img
          src="/images/logo.png"
          alt="La Zíngara"
          class="h-10 w-auto"
          width="397"
          height="174"
        >
      </NuxtLink>

      <!-- Desktop nav links (hidden on mobile) -->
      <div
        data-testid="nav-links"
        class="hidden items-center gap-6 md:flex"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-sm font-medium text-slate transition-colors hover:text-terracotta"
          active-class="text-terracotta"
        >
          {{ link.label }}
        </NuxtLink>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="inline-flex items-center justify-center rounded-md p-2 text-slate hover:bg-cream md:hidden"
        :aria-expanded="isMenuOpen"
        aria-label="Abrir menú de navegación"
        @click="toggleMenu"
      >
        <!-- Hamburger icon (three lines) -->
        <svg
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            v-if="!isMenuOpen"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </nav>

    <!-- Mobile dropdown menu -->
    <div
      v-if="isMenuOpen"
      class="border-t border-gray-100 bg-white px-4 pb-4 md:hidden"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="block rounded-md px-3 py-2 text-base font-medium text-slate hover:bg-cream hover:text-terracotta"
        @click="isMenuOpen = false"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </header>
</template>
