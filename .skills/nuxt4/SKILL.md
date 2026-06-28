---
name: nuxt4
description: "Trigger: Nuxt 4, Nuxt 4.4, new directory structure, app/ directory. Nuxt 4.4 framework cheat-sheet for project tfm-restaurant. Supersedes user-level nuxt skill (Nuxt 3.x) for THIS project."
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  target: "Nuxt 4.4.8"
  source: "https://nuxt.com/docs/4.x"
---

## Activation Contract

Load this skill when working with Nuxt in the `tfm-restaurant` project. It supersedes the user-level `nuxt` skill (`/Users/cho/.config/opencode/skills/nuxt/SKILL.md` — Nuxt 3.x). Nuxt 4.4.8 is the project standard.

## Hard Rules

- Package manager: pnpm. `pnpm-lock.yaml` is the sole lockfile.
- Composition API with `<script setup lang="ts">` only. NO Options API.
- Vue 3.x + TypeScript strict. Vite is the default bundler.
- Tailwind v4 via `@tailwindcss/vite` (CSS-first: `@import "tailwindcss"`). No `tailwind.config.js`.

## Directory Structure (Nuxt 4)

`srcDir` defaults to `app/`. The `~` alias resolves to `app/`. `@` is alias for `~/`.

```
project-root/
├── app/                    # srcDir (NEW in Nuxt 4)
│   ├── app.vue             # root component
│   ├── error.vue           # error page
│   ├── app.config.ts       # app-level runtime config
│   ├── router.options.ts   # vue-router options (optional)
│   ├── pages/              # file-based routing
│   ├── components/         # auto-imported
│   ├── composables/        # auto-imported (use* convention)
│   ├── utils/              # auto-imported
│   ├── layouts/            # auto-imported, used via <NuxtLayout>
│   ├── middleware/         # named middleware
│   ├── plugins/            # .server or .client suffix for context
│   └── assets/             # processed by Vite (css, images, fonts)
├── server/                 # Nitro server (stays at root, NOT inside app/)
│   ├── api/                # /api/* endpoints
│   ├── middleware/         # Nitro middleware
│   ├── routes/             # custom server routes
│   └── utils/              # server-only utilities
├── shared/                 # code shared between app and server
│   ├── utils/              # auto-imported both sides
│   └── types/              # auto-imported both sides
├── public/                 # static assets (favicon, robots.txt)
├── modules/                # local Nuxt modules (optional)
├── layers/                 # Nuxt layers
├── content/                # Nuxt Content (if used)
├── nuxt.config.ts          # root config
├── package.json
└── pnpm-lock.yaml
```

**Key difference from Nuxt 3:** Code directories move under `app/`. Root keeps `server/`, `public/`, `shared/`, `nuxt.config.ts`. For this project, `stores/` goes under a custom dir (see Pinia below).

Ref: https://nuxt.com/docs/4.x/directory-structure/app

## Configuration

### `nuxt.config.ts` (root level)

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt'],
  devtools: { enabled: true },
  typescript: { strict: true, typeCheck: true }, // strict is default
  ssr: true, // default
  compatibilityDate: '2026-06-01', // required for Nuxt 4
  routeRules: {
    '/cocina/**': { ssr: false }, // admin as SPA
  },
  imports: {
    dirs: ['app/stores'], // custom auto-import dir for Pinia stores
  },
  css: ['@/assets/css/main.css'],
})
```

### `app.config.ts` (inside `app/`)

For runtime-reactive config exposed via `useAppConfig()`. Must be inside `app/`.

### Runtime Config

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    supabaseKey: '', // server-only
    public: {
      siteUrl: '', // exposed to client
    },
  },
})
```

Read via `useRuntimeConfig()`.

Ref: https://nuxt.com/docs/4.x/api/configuration/nuxt-config

## CLI Commands (pnpm)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server (hot reload, default port 3000) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build locally |
| `pnpm generate` | Static site generation |
| `pnpm typecheck` | `vue-tsc -b --noEmit` (project references) |

Scaffold: `pnpm create nuxt@latest <name>`. Use `nuxt upgrade` to bump version.

Ref: https://nuxt.com/docs/4.x/getting-started/installation

## Data Fetching

| Composable | Use case |
|-----------|----------|
| `useFetch(url, opts)` | SSR-safe fetch with auto-key from URL. Wraps `$fetch`. |
| `useAsyncData(key, handler, opts)` | Fine-grained control. Custom key required for dedup. |
| `$fetch(url, opts)` | Client-side interactions only (event handlers). No SSR dedup. |
| `useLazyFetch` / `useLazyAsyncData` | Non-blocking. Must handle `pending`/`status` manually. |

**Nuxt 4 changes:** `data` is a `shallowRef` by default (performance). Use `deep: true` for deep reactivity. `pending` is a computed that matches `status === 'pending'`. All calls with same key share refs — must have consistent `deep`, `transform`, `pick`, `getCachedData`, `default`. `getCachedData` called on every fetch with `ctx.cause`.

Ref: https://nuxt.com/docs/4.x/getting-started/data-fetching

## Rendering Modes

| Mode | Config | Use case |
|------|--------|----------|
| Universal (SSR) | Default | Public-facing pages, SEO-critical |
| Client-only (SPA) | `ssr: false` in config or `routeRules: { '/admin/**': { ssr: false } }` | Admin panels |
| Hybrid | `routeRules` per route: `prerender`, `swr`, `isr`, `ssr: false`, `cors`, `redirect` | Mix static + dynamic |
| Static | `pnpm generate` | Landing pages, blogs |

SPA loading template: `~/spa-loading-template.html` at root (NOT inside `app/` in Nuxt 4).

Ref: https://nuxt.com/docs/4.x/guide/concepts/rendering

## Auto-Imports

- `app/components/` — all `.vue` files, PascalCase. Nested: `SomeFolder/MyComponent.vue` → `<SomeFolderMyComponent>`.
- `app/composables/` — files with `use*` convention. First-level only unless nested dirs added to `imports.dirs`.
- `app/utils/` — all exported functions. First-level only by default.
- `shared/utils/` and `shared/types/` — auto-imported both in app and server.
- Vue APIs (`ref`, `computed`, `watch`, `onMounted`, etc.), Nuxt composables, and `$fetch` are auto-imported globally.

Disable scanning: `imports: { scan: false }`. Access `#imports` for explicit import path.

Ref: https://nuxt.com/docs/4.x/guide/concepts/auto-imports

## Nitro Server Engine

| Directory | Purpose |
|-----------|---------|
| `server/api/` | `/api/*` endpoints. Files: `hello.get.ts`, `users.post.ts` |
| `server/middleware/` | Global Nitro middleware |
| `server/routes/` | Custom server routes (bypasses vue-router) |
| `server/utils/` | Server-only utilities |
| `server/plugins/` | Nitro plugins |

Access `#server` alias for imports from Nuxt app side.

Ref: https://nuxt.com/docs/4.x/guide/concepts/server-engine

## Built-in Components

| Component | Purpose |
|-----------|---------|
| `<NuxtPage>` | Renders current page route |
| `<NuxtLayout>` | Wraps content with layout from `app/layouts/` |
| `<NuxtLink>` | Router link (drop-in for `<a>`) |
| `<ClientOnly>` | Client-only rendering wrapper. Use `#fallback` slot. |
| `<NuxtLoadingIndicator>` | Top-bar progress indicator |

Ref: https://nuxt.com/docs/4.x/directory-structure/app

## TypeScript (Nuxt 4)

- **Strict** default: `compilerOptions.strict: true`, `noUncheckedIndexedAccess: true`.
- **Split tsconfigs**: `.nuxt/tsconfig.app.json`, `.nuxt/tsconfig.server.json`, `.nuxt/tsconfig.node.json`, `.nuxt/tsconfig.shared.json`.
- **Project references**: `vue-tsc -b --noEmit` (NOT `vue-tsc --noEmit`). Type augmentations go into the appropriate context dir (`app/`, `server/`, `shared/`).
- Auto-generated paths for aliases.

Ref: https://nuxt.com/docs/4.x/guide/concepts/typescript

## Pinia Integration

```bash
pnpm add pinia @pinia/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  imports: { dirs: ['app/stores'] },
})
```

Stores go in `app/stores/`. Define with `defineStore()`. Use Composition API style. `@pinia/nuxt` is Nuxt 4 compatible.

Ref: https://pinia.vuejs.org/ssr/nuxt.html

## Testing (`@nuxt/test-utils`)

```bash
pnpm add -D @nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core
```

- **Vitest projects** approach recommended: separate `unit`, `nuxt`, `e2e` test projects.
- Nuxt environment: `environment: 'nuxt'` in vitest config (from `@nuxt/test-utils/config`).
- `mountSuspended` for component tests that need Nuxt context.
- `mockNuxtImport` for mocking auto-imports.
- `registerEndpoint` for mocking Nitro endpoints.
- Test files in `test/nuxt/` get Nuxt TypeScript context (aliases, auto-imports).

Ref: https://nuxt.com/docs/4.x/getting-started/testing

## Key Nuxt 3 → 4 Migration Notes

| Change | Migration |
|--------|-----------|
| `app/` as new `srcDir` | Move `pages/`, `components/`, `composables/`, `layouts/`, `middleware/`, `plugins/`, `utils/`, `assets/`, `app.vue`, `error.vue`, `app.config.ts` into `app/`. Root keeps `server/`, `public/`, `shared/`, `nuxt.config.ts`. |
| `~` alias → `app/` | `~/components` → `app/components/` |
| SPA loader location | `spa-loading-template.html` at root, NOT inside `app/` |
| `data` is `shallowRef` | Use `deep: true` if mutation reactivity needed |
| `typecheck` script | `vue-tsc -b --noEmit` (project references) |
| Tailwind v4 wiring | Use `@tailwindcss/vite` plugin, NOT `@nuxtjs/tailwindcss` v3 module |
| `app.vue` location | `app/app.vue`, NOT `app.vue` at root |
| `imports.dirs` for `stores/` | Add `['app/stores']` — Nuxt 4 doesn't auto-import root `stores/` |
| `unhead` v2 | No more `vmid`, `hid`, `body`, `children` props on meta |

Ref: https://nuxt.com/docs/4.x/getting-started/upgrade

## Decision Gates

| Need | Action |
|------|--------|
| Public page, SEO-critical | SSR (default). `routeRules: { '/**': { prerender: true } }` if static ok. |
| Admin/SPA section | `routeRules: { '/cocina/**': { ssr: false } }` |
| Form submission | `$fetch` in event handler (not `useFetch`) |
| Shared types/utils | `shared/` directory with alias `#shared` |
| Environment-specific plugin | Suffix `.client.ts` or `.server.ts` |
| Component auto-import | Place in `app/components/` with PascalCase filename |

## References

- https://nuxt.com/docs/4.x — Nuxt 4 official docs
- https://nuxt.com/docs/4.x/getting-started/upgrade — Nuxt 3 → 4 migration
- https://nuxt.com/docs/4.x/api/configuration/nuxt-config — Config reference
- https://nitro.build — Nitro server docs
- https://pinia.vuejs.org — Pinia docs
