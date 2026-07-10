---
name: nuxt4
description: 'Trigger: Nuxt 4, Nuxt 4.4, app/ directory, Nuxt config, SSR, SPA, composables, auto-imports. Nuxt 4.4.8 framework cheat-sheet for La Zíngara (tfm-restaurant). Supersedes user-level nuxt skill.'
license: MIT
metadata:
  author: gentleman-programming
  version: '2.1'
  target: 'Nuxt 4.4.8'
  source: 'https://nuxt.com/docs/4.x'
---

## Activation Contract

Load this skill when working with Nuxt in `tfm-restaurant`. It supersedes the user-level `nuxt` skill. Nuxt 4.4.8 is the project standard. The project is **Restaurante La Zíngara** — public SSR pages + SPA admin at `/cocina/**`.

## Hard Rules

- **pnpm only.** `pnpm-lock.yaml` is the sole lockfile. Never use npm or yarn.
- **Composition API** with `<script setup lang="ts">`. Never Options API.
- **Vue 3 + TypeScript strict.** Vite bundler.
- **Tailwind v4** via `@tailwindcss/vite` (CSS-first: `@import "tailwindcss"`). No `tailwind.config.js`.
- **Supabase** via `@nuxtjs/supabase`. Never expose `service_role` key client-side. RLS on all tables.
- **Modular architecture:** modules interact via contracts in `shared/contracts/`. No cross-module internal references.
- **TDD:** write tests before or alongside implementation.

## Directory Structure (Nuxt 4 — La Zíngara)

`srcDir` = `app/`. `~` → `app/`. `@` → `~/`. `#shared` → `shared/`.

```
tfm-restaurant/
├── app/                         # srcDir (Nuxt 4)
│   ├── app.vue                  # root component
│   ├── pages/                   # file-based routing (SSR public + SPA admin)
│   │   └── cocina/              # admin section (dashboard, carta, reservas, config, etc.)
│   ├── components/              # auto-imported (PascalCase, 30 components)
│   ├── composables/             # auto-imported (usePlatos, useAuth, useMenuDiario, useEventos, useRestaurantConfig, useImageUpload)
│   ├── layouts/                 # default.vue, cocina.vue (admin sidebar layout)
│   ├── middleware/               # auth, role, permissions — protect /cocina/**
│   ├── plugins/                 # Supabase client, Konva, Turnstile
│   ├── features/                # feature modules (mesas/stores/, mesas/components/, mesas/composables/)
│   ├── stores/                  # Pinia stores (auto-imported via imports.dirs)
│   ├── types/                   # database.types.ts (Supabase-generated)
│   ├── utils/                   # auto-imported (image-url, etc.)
│   └── assets/                  # processed by Vite (css, images, fonts)
├── server/                      # Nitro server (at root, not inside app/)
│   ├── api/                     # /api/* endpoints (config, reservas, clientes, admin, images, etc.)
│   ├── plugins/                 # Supabase admin client, SMS, email, security-headers
│   ├── sms/                     # SMS verification logic
│   └── utils/                   # email.ts, rate-limit.ts, validation.ts, image-security.ts, sms-*.ts
├── shared/                      # shared between app and server
│   ├── contracts/               # module boundary contracts (mesas.contract.ts, reservation.contract.ts)
│   ├── db/                      # shared DB access
│   ├── fixtures/                # test data fixtures
│   ├── types/                   # shared TypeScript types (auto-imported both sides)
│   └── utils/                   # phone.ts, slots.ts, fusion-math.ts, referencia.ts (auto-imported)
├── test/                        # Vitest + Playwright
│   ├── unit/                    # unit tests (Vitest, happy-dom)
│   ├── nuxt/                    # Nuxt integration tests (nuxt environment)
│   ├── e2e/                     # Playwright end-to-end tests
│   ├── utils/                   # test utilities
│   └── __fixtures__/            # test fixtures and stubs
├── public/                      # static assets (favicon.ico, robots.txt)
├── scripts/                     # auxiliary scripts
├── nuxt.config.ts               # root config
├── vitest.config.ts             # Vitest multi-project config
├── playwright.config.ts         # Playwright config
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

**Key difference from Nuxt 3:** Code directories under `app/`. Root keeps `server/`, `public/`, `shared/`, config files.

Ref: https://nuxt.com/docs/4.x/directory-structure/app

## Configuration (`nuxt.config.ts`)

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2026-06-28',

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/turnstile',
  ],

  // Supabase — manual auth via middleware, no auto-redirect
  supabase: {
    redirect: false,
    types: '~/types/database.types.ts',
    cookieOptions: {
      secure: process.env.NUXT_PUBLIC_SUPABASE_COOKIE_SECURE !== 'false',
    },
  },

  // Fonts — Playfair Display (serif headings) + Inter (sans body)
  fonts: {
    families: [
      { name: 'Playfair Display', provider: 'google' },
      { name: 'Inter', provider: 'google' },
    ],
  },

  // Turnstile CAPTCHA
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
  },

  // SPA for admin section
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

  // Tailwind v4
  css: ['@/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // Runtime config — server secrets + public vars
  runtimeConfig: {
    corsAllowedOrigins: 'http://localhost:3000,https://www.lazingara.es',
    smtpPassword: '',
    smsProvider: 'mock', // 'mock' | 'labsmobile'
    labsMobileUsername: '',
    labsMobileToken: '',
    labsMobileSender: 'LaZingara',
    labsMobileTest: '1',
    public: {
      siteUrl: 'https://www.lazingara.es',
    },
  },

  typescript: {
    strict: true,
    nodeTsConfig: {
      compilerOptions: {
        types: ['vitest/globals', '@playwright/test'],
      },
    },
  },
})
```

Ref: https://nuxt.com/docs/4.x/api/configuration/nuxt-config

## Design Tokens (Tailwind v4)

Design tokens defined in `app/assets/css/main.css` via `@theme`:

```css
@import 'tailwindcss';

@theme {
  --color-terracotta: #C67B5C;
  --color-cream: #FAF7F2;
  --color-slate: #2D3748;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

- **Terracotta** — CTAs, prices, accents
- **Cream** — backgrounds
- **Slate** — text, headings
- **Playfair Display** — headings (h1-h6)
- **Inter** — body text

Use utility classes like `text-terracotta`, `bg-cream`, `text-slate`, `font-serif`.

## CLI Commands (pnpm)

| Command            | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Start dev server (hot reload, default port 3000) |
| `pnpm build`       | Production build                                 |
| `pnpm preview`     | Preview production build locally                 |
| `pnpm test`        | Vitest run (unit + nuxt integration)             |
| `pnpm test:e2e`    | Playwright e2e tests                             |
| `pnpm lint`        | ESLint                                           |
| `pnpm typecheck`   | `nuxt prepare && vue-tsc -b --noEmit`            |
| `pnpm format`      | Prettier write                                   |
| `pnpm format:check`| Prettier check                                   |

## Data Fetching

| Composable                          | Use case                                                      |
| ----------------------------------- | ------------------------------------------------------------- |
| `useFetch(url, opts)`               | SSR-safe fetch with auto-key from URL. Wraps `$fetch`.        |
| `useAsyncData(key, handler, opts)`  | Fine-grained control. Custom key required for dedup.           |
| `$fetch(url, opts)`                 | Client-side interactions only (event handlers). No SSR dedup. |
| `useLazyFetch` / `useLazyAsyncData` | Non-blocking. Must handle `pending`/`status` manually.        |

**Supabase pattern** (preferred for DB access):
```ts
const client = useSupabaseClient()
const { data } = useAsyncData('key', async () => {
  const { data } = await client.from('platos').select('*').order('puesto')
  return data
})
```

**Nuxt 4 changes:** `data` is a `shallowRef` by default. `pending` = computed matching `status === 'pending'`. All calls with same key share refs — keep `deep`, `transform`, `pick`, `getCachedData`, `default` consistent.

Ref: https://nuxt.com/docs/4.x/getting-started/data-fetching

## Rendering Modes

| Mode              | Config                                                        | Use case                          |
| ----------------- | ------------------------------------------------------------- | --------------------------------- |
| Universal (SSR)   | Default                                                       | Public pages (/, /carta, /reservas, /eventos, /contacto) |
| Client-only (SPA) | `routeRules: { '/cocina/**': { ssr: false } }`                | Admin panel                       |
| Hybrid            | `routeRules` per route: `prerender`, `swr`, `isr`, `cors`     | Mix static + dynamic              |

SPA loading template: `spa-loading-template.html` at root (NOT inside `app/`).

Ref: https://nuxt.com/docs/4.x/guide/concepts/rendering

## Auto-Imports

- `app/components/` — all `.vue` files, PascalCase. Nested: `SomeFolder/MyComponent.vue` → `<SomeFolderMyComponent>`.
- `app/composables/` — files with `use*` convention.
- `app/utils/` — all exported functions.
- `shared/utils/`, `shared/types/`, `shared/contracts/` — both sides (configured in `imports.dirs`).
- `app/stores/` — Pinia stores (configured in `imports.dirs`).
- Vue APIs (`ref`, `computed`, `watch`, `onMounted`, etc.), Nuxt composables, and `$fetch` are auto-imported globally.
- Supabase composables (`useSupabaseClient`, `useSupabaseUser`) auto-imported by `@nuxtjs/supabase`.

Disable scanning: `imports: { scan: false }`. Access `#imports` for explicit import path.

Ref: https://nuxt.com/docs/4.x/guide/concepts/auto-imports

## Nitro Server Engine

| Directory            | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `server/api/`        | `/api/*` endpoints. Files: `hello.get.ts`, `users.post.ts` |
| `server/middleware/` | Global Nitro middleware                                    |
| `server/routes/`     | Custom server routes (bypasses vue-router)                 |
| `server/utils/`      | Server-only utilities (email, rate-limit, validation, SMS) |
| `server/plugins/`    | Nitro plugins (Supabase admin client)                      |
| `server/sms/`        | SMS verification logic                                     |

Access `#server` alias for imports from Nuxt app side. Server endpoints use `requireUserSession` for auth-gated routes.

Ref: https://nuxt.com/docs/4.x/guide/concepts/server-engine

## Supabase Integration

- Module: `@nuxtjs/supabase` (v2)
- Client access: `useSupabaseClient<Database>()` (typed)
- Auth: `useSupabaseUser()` + middleware chain (`auth` → `role` → `permissions`)
- `redirect: false` — manual auth handling on `/cocina/**` only
- Types: `app/types/database.types.ts` (regenerated via `supabase-zingara_generate_typescript_types`)
- RLS enforced on ALL tables. Check with `supabase-zingara_get_advisors(type: 'security')` after schema changes.
- Never expose service role key in client code. Use server-only endpoints for admin operations.
- `shared/db/` for shared database access patterns.

### Key DB Tables

| Table | Purpose |
|-------|---------|
| `platos` | Carta items with `categoria`, `familia_id` FK, `precio`, `puesto` |
| `familias` | Sub-categories (13 wine DOs, 2 postres families). FK via `categoria_id` → `categorias` |
| `categorias` | Menu categories with `puesto` ordering |
| `categorias_eventos` | Event categories (festivo, espectaculo, etc.) |
| `reservas` | Reservations with `mesa_id`, `cliente_id`, `zona_id` FKs, `cancel_token` for token-based cancellation |
| `clientes` | Customer records with GDPR consent tracking (`gdpr_aceptado`, `gdpr_aceptado_at`) |
| `configuracion` | System settings (single-row config table) — includes multi-tenant restaurant data, SMTP, horarios, zonas |
| `mesas` | Table definitions for Konva canvas manager with fusion support |
| `menu_diario_config` | Daily menu configuration (per day-of-week, secciones, festivo support) |
| `menu_diario_items` | Daily menu items with `agotado` toggle per dish |
| `eventos` | Events with FK to `categorias_eventos` |
| `dias_bloqueados` | Blocked/closed days (single, recurrent, ranges) |

## Built-in Components

| Component                | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `<NuxtPage>`             | Renders current page route                           |
| `<NuxtLayout>`           | Wraps content with layout from `app/layouts/`        |
| `<NuxtLink>`             | Router link (drop-in for `<a>`)                      |
| `<ClientOnly>`           | Client-only rendering wrapper. Use `#fallback` slot. |
| `<NuxtLoadingIndicator>` | Top-bar progress indicator                           |

Ref: https://nuxt.com/docs/4.x/directory-structure/app

## TypeScript

- **Strict** default: `compilerOptions.strict: true`, `noUncheckedIndexedAccess: true`.
- **Split tsconfigs**: `.nuxt/tsconfig.app.json`, `.nuxt/tsconfig.server.json`, `.nuxt/tsconfig.node.json`, `.nuxt/tsconfig.shared.json`.
- **Project references**: `vue-tsc -b --noEmit` (NOT `vue-tsc --noEmit`).
- **Type augmentations** go into the appropriate context dir (`app/`, `server/`, `shared/`).
- Supabase types: `app/types/database.types.ts` — regenerated when schema changes.

Ref: https://nuxt.com/docs/4.x/guide/concepts/typescript

## Pinia Integration

Already configured via `@pinia/nuxt` (v0.11+) and Pinia v3. Stores in `app/stores/` (auto-imported).

```ts
// app/stores/mesas.ts
export const useMesasStore = defineStore('mesas', () => {
  const mesas = ref<Mesa[]>([])
  // Composition API style
  return { mesas }
})
```

Use Composition API style with `defineStore()`. `@pinia/nuxt` handles SSR safety.

Ref: https://pinia.vuejs.org/ssr/nuxt.html

## Testing

Vitest multi-project config (`vitest.config.ts`) with three test projects:

| Project | Environment | Location | Purpose |
|---------|------------|----------|---------|
| `unit` | `happy-dom` | `test/unit/**` | Component + composable unit tests |
| `nuxt` | `nuxt` (happy-dom DOM) | `test/nuxt/**` | Nuxt integration tests |
| `e2e` | Playwright | `test/e2e/**` | End-to-end browser tests |

```ts
// vitest.config.ts — key parts
export default defineConfig({
  test: {
    coverage: { provider: 'v8' },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'happy-dom',
        },
        plugins: [vue()],
        resolve: {
          alias: {
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '@': fileURLToPath(new URL('./app', import.meta.url)),
          },
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
```

**Unit tests** mount components with `@vue/test-utils`. Mock Nuxt auto-imports via `globalThis` injection or `vi.mock`. **Nuxt tests** use `mountSuspended` from `@nuxt/test-utils` for components needing Nuxt context.

Commands: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright).

Ref: https://nuxt.com/docs/4.x/getting-started/testing

## Key Nuxt 3 → 4 Migration Notes

| Change                       | Migration                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/` as new `srcDir`       | Move `pages/`, `components/`, `composables/`, `layouts/`, `middleware/`, `plugins/`, `utils/`, `assets/`, `app.vue` into `app/`. Root keeps `server/`, `public/`, `shared/`, configs. |
| `~` alias → `app/`           | `~/components` → `app/components/`                                                                                                                                                    |
| SPA loader location          | `spa-loading-template.html` at root, NOT inside `app/`                                                                                                                                |
| `data` is `shallowRef`       | Use `deep: true` if mutation reactivity needed                                                                                                                                        |
| `typecheck` script           | `vue-tsc -b --noEmit` (project references)                                                                                                                                            |
| Tailwind v4 wiring           | Use `@tailwindcss/vite` plugin with `@import "tailwindcss"` in CSS. No `tailwind.config.js`.                                                                                          |
| `app.vue` location           | `app/app.vue`, NOT `app.vue` at root                                                                                                                                                  |
| `imports.dirs` for stores    | Add `['app/stores']` — Nuxt 4 doesn't auto-import root `stores/`                                                                                                                      |
| `unhead` v2                  | No more `vmid`, `hid`, `body`, `children` props on meta                                                                                                                               |
| `@nuxtjs/tailwindcss`        | Replaced by `@tailwindcss/vite`                                                                                                                                                       |
| `@nuxtjs/supabase` v2        | Cookie-based auth. `redirect: false` for manual handling.                                                                                                                             |

Ref: https://nuxt.com/docs/4.x/getting-started/upgrade

## Project-Specific Patterns

### Konva Canvas (Table Manager)

For the interactive table map in `/cocina/reservas`:
- `konva` + `vue-konva` libraries
- Target 60 FPS with hardware-accelerated Canvas 2D
- Tables are `<v-rect>`, `<v-circle>`, or `<v-group>` shapes on a `<v-stage>`
- Drag, resize, rotate via Konva `Transformer`
- Fusion logic in `shared/utils/fusion-math.ts` (capacity: `sum(capacidad_base) * 0.75`)
- 6 feature components: TableCanvas, TableToolbar, TableNode, ZoneSection, AforoIndicator, FusionConfirmDialog, StandbyBanner
- Pinia store (`canvas-store`) for canvas state management
- Realtime sync via `useMesas` composable

### useRestaurantConfig (Multi-tenant)

Composable in `app/composables/useRestaurantConfig.ts`:
- Fetches restaurant info (name, address, phone, logo, social links) from `/api/public-config`
- SSR-safe via `useState` + `Object.assign` in SSR render + deferred `onMounted` client hydration
- Used by `AppHeader` and `AppFooter` for dynamic branding
- Admin editable from `/cocina/configuracion` → "Datos del Restaurante" section

### useImageUpload (Image Upload with Security)

Composable in `app/composables/useImageUpload.ts`:
- Client-side compression to WebP via Canvas re-encode (strips EXIF, metadata, polyglot data)
- SVG blocked by browser SecurityError on Canvas drawImage
- Upload via proxy URL (`/api/images/...`) to hide Supabase project ID
- Supports upload from file and from external URL (via `/api/fetch-image` proxy with SSRF protection)
- Configurable quality, max width, max size from configuracion

### ImageLightbox

Inline template component used inside `PlatoForm.vue` for image preview:
- Modal overlay with full-size image view
- Activated by magnifying glass icon on image thumbnail

### Module Contracts (`shared/contracts/`)

Every inter-module boundary uses a contract interface:
```ts
// shared/contracts/mesas.contract.ts
export interface MesaContract {
  id: string
  numero_mesa: number
  capacidad: number
  posicion: { x: number; y: number }
  zona: string
}
```

Never import internal module implementation directly — always through the contract.

### Supabase Types

Regenerate after every DB schema change:
```
supabase-zingara_generate_typescript_types → app/types/database.types.ts
```

### Middleware Chain

Admin routes (`/cocina/**`) use three middleware in sequence:
1. `auth` — check Supabase session
2. `role` — verify `profiles.role` is `admin` or `editor`
3. `permissions` — check granular `profiles.permissions` JSONB

### Image Handling

Use `toProxyUrl(url)` from `app/utils/image-url.ts` for Supabase Storage images. Server-side image security in `server/utils/image-security.ts`.

### Supabase Realtime — Lecciones Aprendidas

**Habilitar tablas para Realtime**: Las tablas deben añadirse a la publicación `supabase_realtime`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nombre_tabla;
```

Verificar con:
```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**REPLICA IDENTITY FULL**: Necesario para que los eventos UPDATE incluyan la fila completa (no solo el ID):

```sql
ALTER TABLE nombre_tabla REPLICA IDENTITY FULL;
```

**PostgREST schema cache**: Al añadir columnas nuevas via `ALTER TABLE`, PostgREST puede tener el schema cacheado sin la columna nueva. Refrescar con:

```sql
NOTIFY pgrst, 'reload schema';
```

**TypeScript types**: Después de añadir columnas, regenerar `app/types/database.types.ts` con `supabase-zingara_generate_typescript_types`. Si la columna no está en los tipos, el `$fetch` o cliente Supabase puede filtrarla silenciosamente.

**Patrón de suscripción en Vue**:
```ts
const client = useSupabaseClient()
let channel: ReturnType<typeof client.channel>

onMounted(() => {
  channel = client.channel('nombre-canal')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tabla' },
      (payload) => {
        // Actualizar datos directamente con el payload
        // NO llamar a refreshNuxtData — no funciona en este contexto
      })
    .subscribe()
})

onUnmounted(() => channel?.unsubscribe())
```

**IMPORTANTE**: La suscripción debe ir en `onMounted` (solo cliente). Si se hace durante SSR (setup), el WebSocket no se conecta y al hidratar en cliente no se reconecta.

**Realtime en Carta Pública** (`app/pages/carta.vue`):
```ts
// Escucha cambios en platos (INSERT/UPDATE/DELETE), categorías y familias
channel = client.channel('carta-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'platos' },
    (payload) => {
      // Modificar directo el ref (no refreshNuxtData)
      // Manejar INSERT: push, UPDATE: find+assign, DELETE: find+splice
    })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' },
    () => refreshNuxtData('carta-categorias'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'familias' },
    () => refreshNuxtData('carta-familias'))
  .subscribe()
```

**Realtime en Menú Diario** (`app/pages/menu-diario.vue`):
```ts
// Escucha cambios en menu_diario_items (agotado toggle en vivo)
channel = client.channel('menu-diario-realtime')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'menu_diario_items' },
    (payload) => { /* actualizar displayItems en vivo */ })
  .subscribe()
```

## Decision Gates

| Need                        | Action                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| Public page, SEO-critical   | SSR (default). `useAsyncData` with Supabase.                                     |
| Admin/SPA section           | `routeRules: { '/cocina/**': { ssr: false } }`                                   |
| Form submission             | `$fetch` in event handler (not `useFetch`)                                        |
| DB access (client)          | `useSupabaseClient()` in `useAsyncData` handler                                   |
| DB access (server)          | `server/plugins/` Supabase admin client (service role)                            |
| Shared types/utils          | `shared/` directory with `imports.dirs` config                                    |
| Module boundary             | `shared/contracts/` — never import module internals                               |
| Environment-specific plugin | Suffix `.client.ts` or `.server.ts`                                               |
| Component auto-import       | Place in `app/components/` with PascalCase filename                               |
| Schema change               | Migration via Supabase MCP → regenerate types → check RLS advisors                |

## References

- https://nuxt.com/docs/4.x — Nuxt 4 official docs
- https://nuxt.com/docs/4.x/getting-started/upgrade — Nuxt 3 → 4 migration
- https://nuxt.com/docs/4.x/api/configuration/nuxt-config — Config reference
- https://nitro.build — Nitro server docs
- https://pinia.vuejs.org — Pinia docs
- https://supabase.com/docs — Supabase docs
- https://konvajs.org — Konva.js docs
