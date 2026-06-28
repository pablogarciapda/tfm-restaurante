# Design: Bootstrap Nuxt Application

## Technical Approach

Scaffold a Nuxt 4.4.8 greenfield project via `pnpm create nuxt@latest`, then layer in Tailwind v4 (`@tailwindcss/vite`), Vitest 4.x with `@nuxt/test-utils` v4 projects approach (unit + nuxt only), Playwright for E2E, and `@nuxt/eslint` v1.x flat config — all TDD-first with 3 RED smoke tests. Deliverable: `pnpm build` + `pnpm test` passing. No Supabase, no real domain slices, no SEO.

> **Proposal freeze note**: The proposal text says "Nuxt 3" — the binding version is Nuxt **4.4.8** (per Engram obs #485, nuxt4 skill, and AGENTS.md). The proposal is frozen-stale on this point.
>
> **Proposal→design directory drift**: Proposal says `tests/` (plural); specs and design use `test/` (singular). This is frozen-proposal drift — the design keeps `test/`. Specs are unchanged.
>
> **Spec TH-001 API drift**: Spec says `defineVitestConfig` from `@nuxt/test-utils/config`; the actual v4 API is `defineVitestProject`. The design uses the real API name per [Nuxt 4 testing docs](https://nuxt.com/docs/4.x/getting-started/testing). Spec is frozen.

## Version Pin Table

All versions verified against `npm view <pkg> version` on 2026-06-28.

| Package | Pinned Version | npm Latest | Rationale | Fallback |
|---------|---------------|------------|-----------|----------|
| `nuxt` | `4.4.8` | 4.4.8 | Project standard per nuxt4 skill & AGENTS.md | N/A — hard requirement |
| `vitest` | `^4.1.0` | 4.1.9 | `@nuxt/test-utils` v4 peers `vitest@^4.0.2`; 4.x is current major | `^4.0.0` minimum |
| `@nuxt/test-utils` | `^4.0.0` | 4.0.3 | v4 is current; exports `defineVitestProject`; peers `vitest@^4.0.2` + `happy-dom@>=20.0.11` | N/A |
| `@vue/test-utils` | `^2.4.11` | 2.4.11 | Vue 3 stable; no 3.x yet | N/A |
| `happy-dom` | `^20.0.11` | 20.10.6 | `@nuxt/test-utils` v4 peers `>=20.0.11`; explicit `devDependency` per spec TH-001 | N/A (peer-enforced floor) |
| `tailwindcss` | `^4.3.0` | 4.3.1 | v4 CSS-first per spec NX-002 | `^4.0.0` minimum |
| `@tailwindcss/vite` | `^4.3.0` | 4.3.1 | Must match `tailwindcss` major; Vite plugin | `@nuxtjs/tailwindcss` module if plugin breaks |
| `@nuxt/eslint` | `^1.16.0` | 1.16.0 | Flat config + `withNuxt()` requires v1.x; module registered in nuxt.config | N/A |
| `eslint` | `^9.0.0` | 10.6.0 | **Intentional conservative pin**: ESLint 10 released 2026-06-26 (2 days ago). `@nuxt/eslint@1.16.0` peerDeps say `^9.0.0 \|\| ^10.0.0` but we default to v9 until ESLint 10 compat is proven in this stack. Bump to `^10.0.0` in a future maintenance change. | `^10.0.0` (after verification) |
| `prettier` | `^3.9.0` | 3.9.1 | Stable; no breaking changes expected | N/A |
| `eslint-config-prettier` | `^9.0.0` | 10.1.8 | Disables ESLint rules that conflict with Prettier; v9 aligns with ESLint 9 pin | `^10.0.0` after ESLint 10 validation |
| `vue-tsc` | `^3.3.0` | 3.3.5 | Nuxt 4 split tsconfigs require vue-tsc 3.x; `-b` project references mode | `^3.0.0` minimum |
| `@playwright/test` | `^1.61.0` | 1.61.1 | Stable channel; Chromium only | N/A |
| `typescript` | `^5.7.0` | 6.0.3 | Nuxt 4.4 defaults; TypeScript 6.0.3 is latest but not yet validated in the Nuxt 4 toolchain | `^5.0.0` minimum; `^6.0.0` after validation |

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Slice home** | `app/features/` over `domains/` | `features/` is Nuxt-community idiomatic; `domains/` implies DDD which we're not doing |
| **Contract boundary** | `shared/contracts/` (Nuxt 4 auto-import both sides) | Nuxt 4 auto-imports `shared/` in app + server; no explicit imports needed |
| **Vitest projects** | 2 projects: `unit` (node) + `nuxt` (nuxt env); Playwright owns E2E | No vitest `e2e` project — it would conflict with Playwright's `testDir: './test/e2e'`. Playwright is the sole E2E runner. |
| **Vitest API** | `defineVitestProject` from `@nuxt/test-utils/config` (NOT `defineVitestConfig`) | Per Context7 `/nuxt/nuxt` v4 docs; the v0.x `defineVitestConfig` wrapper is gone in v4 |
| **Tailwind** | `@tailwindcss/vite` plugin in `nuxt.config.ts` | CSS-first `@import "tailwindcss"`; no `tailwind.config.js` |
| **ESLint** | `@nuxt/eslint` module + `withNuxt()` flat config | Generated base config in `.nuxt/`; `withNuxt()` is the composition API |

## Vitest Config (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
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

Playwright is a separate runner — no vitest E2E project. See `playwright.config.ts` below.

## Package Scripts (9 scripts)

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "nuxt prepare && vue-tsc -b --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

`format:check` added per spec TH-003 (`pnpm format --check` must work). `format` remains `--write`.

## Testing Strategy

| Layer | Tests | Tool | Location |
|-------|-------|------|----------|
| Unit | 1 smoke: component render via `mountSuspended` | Vitest + `@nuxt/test-utils/runtime` | `test/unit/smoke.test.ts` |
| Nuxt Integration | 1 smoke: `$fetch('/')` returns 200 AND non-empty HTML body containing expected Spanish text (assert `html.includes('...')` for visible content) | Vitest + `@nuxt/test-utils/e2e` | `test/nuxt/smoke.test.ts` |
| E2E | 1 smoke: Playwright `page.goto('/')` loads `<title>` | Playwright + `@nuxt/test-utils/playwright` | `test/e2e/smoke.spec.ts` |

All 3 tests written RED-first (fail before production code exists), then GREEN after `app/app.vue` + `app/pages/index.vue` implemented.

## Key Config Files (remaining)

### `nuxt.config.ts`

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Nuxt 4.4.8 strict SSR shell
  ssr: true,
  compatibilityDate: '2026-06-28',

  // ESLint flat config (v1.x)
  modules: ['@nuxt/eslint'],

  // Devtools only in development
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  // SPA admin (Phase 2 placeholder)
  routeRules: {
    '/cocina/**': { ssr: false },
  },

  // Auto-import dirs
  // Nuxt 4 only auto-imports shared/utils/ and shared/types/ top-level.
  // shared/contracts/ and other nested dirs need explicit registration.
  imports: {
    dirs: [
      'app/stores',
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

  // TypeScript project references — Nuxt 4 generates .nuxt/tsconfig.{app,server,shared,node}.json
  typescript: {
    strict: true,
    nodeTsConfig: {
      types: ['vitest/globals', '@playwright/test'],
    },
  },
})
```

### `tsconfig.json`

```json
// tsconfig.json (root, only hand-written tsconfig)
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

> Per Nuxt 4 official docs (https://nuxt.com/docs/4.x/directory-structure/tsconfig), the root `tsconfig.json` references 4 auto-generated `.nuxt/tsconfig.*.json` files directly. No wrapper tsconfigs at project root. Context-specific overrides go through `nuxt.config.ts` `typescript.tsConfig/sharedTsConfig/nodeTsConfig` and `nitro.typescript.tsConfig`.

### Other configs

| File | Key detail |
|------|-----------|
| `.prettierrc` | `semi: false, singleQuote: true, trailingComma: 'all', tabWidth: 2` |
| `app/assets/css/main.css` | `@import "tailwindcss"` |

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

### `eslint.config.mjs`

```js
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt({
  ignores: ['.nuxt/', 'dist/', 'node_modules/', '.output/', 'playwright-report/'],
  extends: [prettier],
})
```

## File Changes

| File | Action |
|------|--------|
| `package.json` | Create — deps + 9 scripts |
| `nuxt.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `.prettierrc`, `.gitignore` | Create |
| `app/app.vue`, `app/pages/index.vue`, `app/layouts/default.vue`, `app/assets/css/main.css` | Create |
| `app/{components,composables,layouts,middleware,plugins,utils,stores,features}/.gitkeep` | Create |
| `server/.gitkeep`, `public/.gitkeep` | Create |
| `shared/{types,contracts,utils}/.gitkeep` | Create |
| `test/unit/smoke.test.ts`, `test/nuxt/smoke.test.ts`, `test/e2e/smoke.spec.ts` | Create |

### `app/layouts/default.vue`

```vue
<template>
  <div>
    <slot />
  </div>
</template>
```

`<slot />` is sufficient for the bootstrap. The root `app/app.vue` must contain `<NuxtLayout><NuxtPage /></NuxtLayout>` to activate this layout (or just `<NuxtPage />` if layouts are not used).

## Rollout

Greenfield — no migration. Single commit workflow: scaffold → install deps → write RED tests → implement home → verify 9 scripts pass.

## Open Questions

- [ ] `@tailwindcss/vite` 4.3.1 vs Nuxt 4 module system compat must be verified at install time (the plugin injects CSS via Vite, which interacts with Nuxt's hybrid SSR pipeline). Fallback to `@nuxtjs/tailwindcss` module if detection fails. Detection: run `pnpm build` and verify CSS output contains compiled utility classes; if build errors OR missing utility CSS, switch to module fallback.
- [ ] ESLint 10 compat with `@nuxt/eslint` 1.16.0 must be proven before bumping `eslint` pin to `^10.0.0`.
- [ ] TypeScript 6.0.3 compat with Nuxt 4.4.8 toolchain must be validated before bumping pin.
