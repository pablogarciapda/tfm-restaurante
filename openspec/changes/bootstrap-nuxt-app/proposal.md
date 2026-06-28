# Proposal: Bootstrap Nuxt Application

**Phase**: 1 — MVP Public

## Intent

Establish the La Zíngara Nuxt 3 application foundation with TDD-ready tooling. The project is greenfield — no `package.json`, no app code, no test runner. This change creates the first buildable artifact that all Phase 1 features (public pages, SEO, Supabase) land into.

## Scope

### In Scope

- Scaffold Nuxt 3 latest stable + TypeScript strict + Composition API `<script setup>` via `nuxi init`
- Install Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/vite` plugin), CSS-first config (no `tailwind.config.js`)
- Install test stack: Vitest 2.x, `@vue/test-utils`, `@nuxt/test-utils` (integration environment), Playwright (E2E)
- Install code quality: `@nuxt/eslint` (flat config), Prettier, `vue-tsc` (no-emit type check)
- Write 3 smokes tests FIRST (TDD RED): unit component render, SSR integration 200, Playwright E2E `/` loads
- Minimal SSR home page at `/` proving public-site SSR works
- Configure `package.json` scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`
- Root-level folder structure: `pages/`, `components/`, `composables/`, `layouts/`, `stores/`, `server/`, `tests/`

### Out of Scope

- Supabase integration, env wiring, DB schema, migrations, RLS (Change #2)
- Public pages beyond `/` (Change #3)
- SEO meta, structured data, sitemap (Change #4)
- Admin `/cocina/**`, auth, middleware (Phase 2)
- Konva, table engine, Realtime sync (Phase 3)
- README or doc files

## Capabilities

### New Capabilities

- `nuxt-app-stack`: Nuxt 3 SSR shell — TypeScript strict mode, file-based routing, Tailwind v4 utility-first CSS, build toolchain (dev/build/preview)
- `test-harness`: TDD-ready test stack — Vitest unit/integration (`@nuxt/test-utils` env), Playwright E2E. Three smoke tests prove all layers wired before feature code

### Modified Capabilities

None — greenfield. No existing specs.

## Approach

- **Scaffold**: `pnpm dlx nuxi@latest init` (pnpm is mandatory; no npm fallback), TypeScript strict, no UI modules pre-installed
- **Tailwind v4**: Install `tailwindcss @tailwindcss/vite`; register `@tailwindcss/vite` in `nuxt.config.ts` vite plugins; use CSS-first `@import "tailwindcss"` in main stylesheet
- **Testing**: `vitest.config.ts` uses `@nuxt/test-utils/environment` for server integration; `playwright.config.ts` targets Nuxt dev server as `webServer`
- **ESLint**: `@nuxt/eslint` module with flat config
- **TDD**: All 3 smoke tests written first (RED) → scaffold home page + config (GREEN) → verify stack

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `/` (project root) | New | `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.prettierrc`, `app.vue` |
| `pages/` | New | `index.vue` — minimal SSR home page |
| `components/` | New | Skeleton directory for auto-imports |
| `composables/` | New | Skeleton directory |
| `layouts/` | New | `default.vue` — base layout |
| `stores/` | New | Skeleton for Pinia (Phase 2) |
| `tests/` | New | Unit, integration, and e2e test files |
| `assets/css/` | New | `main.css` — Tailwind v4 import |
| `server/` | New | Skeleton directory |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tailwind v4 `@tailwindcss/vite` Nuxt compat | Medium | Pin known-compatible versions; fallback to `@nuxtjs/tailwindcss` module |
| Nuxt 4 GA makes Nuxt 3 stale mid-project | Low | Nuxt 3 LTS stable; upgrade path documented; re-evaluate at Change #3 |
| `@nuxt/test-utils` + Vitest 2.x peer mismatch | Medium | Use `@nuxt/test-utils` latest (built for Vitest 2.x); verify peer deps on install |
| Playwright browser download size | Low | Chromium-only; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` env fallback |

## Rollback Plan

Delete `node_modules/`, `package.json`, `nuxt.config.ts`, and all generated directories. Project returns to greenfield state. No data loss.

## Dependencies

- Node.js 22+ (TypeScript strict, ESM)
- pnpm (mandatory; no npm fallback — user preference)
- Git initialized in project root
- Internet access for package install

## Success Criteria

- [ ] `pnpm test` passes 3 smoke tests (unit render, SSR 200, E2E `/`)
- [ ] `pnpm build` completes without errors
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` passes
- [ ] `pnpm test:e2e` passes (E2E `page.goto('/')` succeeds)
- [ ] Tailwind v4 `@import "tailwindcss"` compiles (no CSS build errors)
- [ ] `curl http://localhost:3000/` returns SSR HTML
