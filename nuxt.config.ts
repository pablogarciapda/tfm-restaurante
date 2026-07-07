import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Nuxt 4.4.8 strict SSR shell
  ssr: true,
  compatibilityDate: '2026-06-28',

  // App metadata — favicon
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // ESLint flat config (v1.x) + font loading + Supabase
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/supabase', '@pinia/nuxt'],

  // @nuxtjs/supabase — disable auto-redirect (we handle auth manually via middleware on /cocina/** only)
  supabase: {
    redirect: false,
    types: '~/types/database.types.ts',
    // Cookie SameSite/Secure — Secure=true requires HTTPS. On HTTP-only VPS,
    // set NUXT_PUBLIC_SUPABASE_COOKIE_SECURE=false in .env to allow cookie storage.
    cookieOptions: {
      secure: process.env.NUXT_PUBLIC_SUPABASE_COOKIE_SECURE !== 'false',
    },
  },

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
    dirs: [
      'app/stores',
      'app/features/mesas/stores',
      'shared/types',
      'shared/contracts',
      'shared/utils',
    ],
  },

  // Tailwind v4 CSS-first
  css: ['@/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // Runtime config — server-only secrets + public vars
  runtimeConfig: {
    // CORS: comma-separated allowed origins (set NUXT_CORS_ALLOWED_ORIGINS in .env)
    corsAllowedOrigins: 'http://localhost:3000,https://www.lazingara.es',

    // SMTP password: set NUXT_SMTP_PASSWORD in .env (server-only, overrides DB value)
    smtpPassword: '',

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
