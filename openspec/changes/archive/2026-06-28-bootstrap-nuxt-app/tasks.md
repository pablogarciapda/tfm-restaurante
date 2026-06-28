# Tasks: Bootstrap Nuxt Application

## Review Workload Forecast

| Field                   | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Estimated changed lines | ~280 hand-written + pnpm-lock.yaml (auto-generated, ~5K–15K) |
| 400-line budget risk    | Medium                                                       |
| Chained PRs recommended | No                                                           |
| Suggested split         | Single PR — bootstrap is atomic; lockfile cannot be split    |
| Delivery strategy       | single-pr                                                    |
| Chain strategy          | size-exception                                               |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

> **size:exception rationale**: Hand-written code (~280 lines) is under budget. The `pnpm-lock.yaml` (auto-generated machinery) inflates the PR diff past 400 lines. Maintainer must approve the size exception before `sdd-apply`.

## Phase 1: Foundation — Scaffold & Dependencies (NX-001, NX-004)

- [x] 1.1 Init git repo at project root: `git init && git add -A && git commit -m "chore: initial commit"`
- [x] 1.2 Scaffold Nuxt 4.4.8: `pnpm create nuxt@latest . --packageManager pnpm --gitInit false --no-install`; verify `app/app.vue` + `app/pages/index.vue` generated (NX-001, NX-004) — **NOTE**: minimal template only generates `app/app.vue`; `app/pages/index.vue` will be created in Phase 4
- [x] 1.3 Pin `nuxt` to `4.4.8` in `package.json`, run `pnpm install`, confirm `pnpm-lock.yaml` is sole lockfile (NX-001)
- [x] 1.4 Install all pinned dev deps per design version pin table (`vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `@playwright/test`, `@nuxt/eslint`, `eslint@^9`, `prettier`, `eslint-config-prettier`, `vue-tsc`, `tailwindcss`, `@tailwindcss/vite`, `typescript@^5.7`) (TH-001, TH-003)
- [x] 1.5 Verify zero `package-lock.json`/`yarn.lock`; `pnpm-lock.yaml` is only lockfile (NX-001)

## Phase 2: Configuration — All Config Files (NX-002, NX-003, NX-005, TH-001, TH-003)

- [x] 2.1 Configure `nuxt.config.ts`: Tailwind vite plugin, `@nuxt/eslint` module, `imports.dirs`, `routeRules`, `compatibilityDate: '2026-06-28'`, `typescript.strict`, `css` entry, per design (NX-002, NX-004, NX-005, TH-003)
- [x] 2.2 Configure root `tsconfig.json`: `files: []`, 4 references to `.nuxt/tsconfig.{app,server,shared,node}.json` (NX-001)
- [x] 2.3 Configure `package.json` scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`, `format:check` per design (NX-003)
- [x] 2.4 Configure `vitest.config.ts`: 2 projects (unit + nuxt) using `defineVitestProject`; Playwright owns E2E — no vitest e2e project (TH-001)
- [x] 2.5 Configure `playwright.config.ts`: Chromium only, `webServer` = `pnpm dev`, `testDir: './test/e2e'` (TH-001)
- [x] 2.6 Configure `eslint.config.mjs`: `withNuxt()` + ignores + `eslint-config-prettier` (TH-003)
- [x] 2.7 Configure `.prettierrc`: `semi: false, singleQuote: true, trailingComma: 'all', tabWidth: 2` (TH-003)
- [x] 2.8 Create `app/assets/css/main.css` with `@import "tailwindcss"` (NX-002)

## Phase 3: TDD RED — Smoke Tests (TH-002)

- [x] 3.1 Write `test/unit/smoke.test.ts`: `mountSuspended` renders a Vue component, wrapper truthy, text match — RED (fails: no Spanish home yet) (TH-002 Scenario 1)
- [x] 3.2 Write `test/nuxt/smoke.test.ts`: `$fetch('/')` → 200, body non-empty HTML containing Spanish text — RED (TH-002 Scenario 2, NX-005) — RED confirmed via native fetch against dev server
- [x] 3.3 Write `test/e2e/smoke.spec.ts`: Playwright `page.goto('/')`, `<title>` present, no console errors — RED (TH-002 Scenario 3) — deferred to Playwright runner (excluded from vitest)

## Phase 4: TDD GREEN — Implementation (NX-005, AR-001, AR-002, AR-004)

- [x] 4.1 Implement `app/app.vue`: `<NuxtLayout><NuxtPage /></NuxtLayout>` shell, `<script setup lang="ts">` (NX-001, NX-005)
- [x] 4.2 Implement `app/layouts/default.vue`: `<div><slot /></div>` shell (NX-005)
- [x] 4.3 Implement `app/pages/index.vue`: SSR home page with Spanish es-ES visible text, structured HTML markup — GREEN target for all 3 smoke tests (NX-005, AR-004)
- [x] 4.4 Create slice skeleton: `app/features/.gitkeep`, `shared/types/.gitkeep`, `shared/contracts/.gitkeep`, `shared/utils/.gitkeep` (AR-001, AR-002)
- [x] 4.5 Create empty-dir `.gitkeep` files: `app/{components,composables,middleware,plugins,utils,stores}/.gitkeep`, `server/.gitkeep`; skip dirs with content (`layouts/`, `pages/`, `assets/`, `public/`) (NX-004)

## Phase 5: Build & Verify — All Gates Green (All NX, TH, AR)

- [x] 5.1 Run `nuxt prepare` → generates `.nuxt/tsconfig.*.json` and `.nuxt/eslint.config.mjs` (NX-001)
- [x] 5.2 Run `pnpm test` → unit + nuxt smoke tests pass GREEN (TH-001, TH-002) — unit test has infra issue with nuxt environment + vitest 4.1.9; nuxt test GREEN with running dev server
- [x] 5.3 Run `pnpm typecheck` → `vue-tsc -b --noEmit` exits 0 (NX-001, NX-003, TH-003)
- [x] 5.4 Run `pnpm lint` → ESLint flat config exits 0 (TH-003)
- [x] 5.5 Run `pnpm build` → no errors, CSS compiles (NX-001, NX-002)
- [x] 5.6 Run `pnpm format:check` → Prettier reports clean (TH-003)
- [x] 5.7 Tailwind v4 detection: verified built CSS ships utility classes (`text-4xl`, `font-bold`, `flex-col`, etc.) — `@tailwindcss/vite` plugin working, no fallback needed (NX-002)
- [x] 5.8 Install Playwright browser: `pnpm exec playwright install chromium` (TH-001 Scenario 2)
- [x] 5.9 Run `pnpm test:e2e` → Playwright smoke passes (1/1) (TH-002)
- [x] 5.10 Final SSR smoke: `curl -s http://localhost:3000/` returns HTML with Spanish body text "Restaurante La Zíngara" (NX-005 Scenario 1)

## Corrective Batch (2026-06-28)

Three design deviations from previous apply batch corrected:

- [x] C.1 Restore `vitest.config.ts` to 2-projects approach (unit + nuxt via `defineConfig` + `defineVitestProject`). Unit project uses `environment: 'happy-dom'` with `@vitejs/plugin-vue`. Added `@vitejs/plugin-vue@6.0.7` devDependency.
- [x] C.2 Rewrite `test/unit/smoke.test.ts` to use `mount()` from `@vue/test-utils` (not `mountSuspended`). Unit smoke test now runs and passes GREEN in the unit project.
- [x] C.3 Remove `pnpm patch` on `@nuxt/test-utils@4.0.3`. Patch deleted, `patchedDependencies` removed from `pnpm-workspace.yaml`. All tests pass without the patch.

All gates re-verified GREEN: `pnpm test` (2/2), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e`, `curl /`.
