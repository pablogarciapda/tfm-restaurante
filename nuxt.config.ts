import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Nuxt 4.4.8 strict SSR shell
  ssr: true,
  compatibilityDate: '2026-06-28',

  // ESLint flat config (v1.x) + font loading
  modules: ['@nuxt/eslint', '@nuxt/fonts'],

  // @nuxt/fonts — Playfair Display (serif headings) + Inter (sans body)
  fonts: {
    families: [
      { name: 'Playfair Display', provider: 'google' },
      { name: 'Inter', provider: 'google' },
    ],
  },

  // Devtools only in development
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  // SPA admin (Phase 2 placeholder)
  routeRules: {
    '/cocina/**': { ssr: false },
  },

  // Auto-import dirs
  imports: {
    dirs: ['app/stores', 'shared/types', 'shared/contracts', 'shared/utils'],
  },

  // Tailwind v4 CSS-first
  css: ['@/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // Runtime config — server-only secrets + public vars
  runtimeConfig: {
    // SMS provider selection: 'mock' | 'labsmobile' (SM-004)
    smsProvider: 'mock',

    // LabsMobile credentials (server-only, NEVER exposed to client) (SM-006)
    labsMobileUsername: '',
    labsMobileToken: '',
    labsMobileSender: 'LaZingara',
    labsMobileTest: '1',

    // Public (exposed to client bundle)
    public: {
      siteUrl: 'https://www.lazingara.es',
    },
  },

  // TypeScript project references
  typescript: {
    strict: true,
    nodeTsConfig: {
      compilerOptions: {
        types: ['vitest/globals', '@playwright/test'],
      },
    },
  },
})
