# nuxt-app-stack Specification

## Purpose

Nuxt 4.4.8 SSR application shell for Restaurante La Zíngara. Establishes the buildable foundation all Phase 1 features land into. Greenfield — no existing app code.

## Requirements

### Requirement: NX-001 — Nuxt 4.4.8 Scaffold with TypeScript Strict

The system MUST be scaffolded via `pnpm create nuxt@latest` (NOT `nuxi`). Nuxt version MUST be 4.4.8. `compatibilityDate` field MUST be present in `nuxt.config.ts`. All Vue components MUST use Composition API `<script setup lang="ts">`. Options API is NOT permitted. Package manager MUST be pnpm; `pnpm-lock.yaml` is the sole lockfile. Root component MUST be `app/app.vue` (not root-level `app.vue`).

| Success Criterion | Verification |
|---|---|
| `pnpm build` exits 0 | No TS errors, no build errors |
| `vue-tsc -b --noEmit` exits 0 | Strict null checks, no implicit any |
| `pnpm-lock.yaml` exists; no `package-lock.json` or `yarn.lock` | Sole lockfile |
| `app/app.vue` uses `<script setup lang="ts">` | No Options API |
| `nuxt.config.ts` contains `compatibilityDate` | Config field present |

#### Scenario: Scaffold produces buildable project

- GIVEN Node.js 22+ and pnpm are installed
- WHEN `pnpm create nuxt@latest` completes and `pnpm install` succeeds
- THEN `pnpm build` completes without errors
- AND `pnpm typecheck` exits 0

#### Scenario: TypeScript strict catches nullable access

- GIVEN strict mode is active (Nuxt 4 default)
- WHEN a source file accesses a nullable value without a guard
- THEN `vue-tsc -b --noEmit` reports the error and exits non-zero

### Requirement: NX-002 — Tailwind v4 CSS-first Configuration

The system MUST use Tailwind v4 via `@tailwindcss/vite` plugin registered in `nuxt.config.ts`. CSS entry point MUST be `app/assets/css/main.css` with `@import "tailwindcss"`. No `tailwind.config.js` file MUST exist.

#### Scenario: Utility classes compile and ship

- GIVEN `@tailwindcss/vite` is registered and `app/assets/css/main.css` imports `@import "tailwindcss"`
- WHEN `pnpm build` runs
- THEN output CSS includes compiled utility classes with zero build errors

#### Scenario: Compat fallback to @nuxtjs/tailwindcss

- GIVEN `@tailwindcss/vite` breaks with the current Nuxt version at install or build
- WHEN the failure is detected
- THEN the system MAY fall back to `@nuxtjs/tailwindcss` module
- AND the CSS-first approach (`@import "tailwindcss"`) MUST remain the target

### Requirement: NX-003 — Package Scripts (8 scripts, pnpm executor)

`package.json` MUST define these scripts, all runnable via `pnpm <name>`: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`. The `typecheck` script MUST be `vue-tsc -b --noEmit` (project references mode, NOT `vue-tsc --noEmit`).

#### Scenario: All scripts execute without fatal errors

- GIVEN all dependencies are installed
- WHEN running each script sequentially
- THEN `pnpm dev` starts dev server on default port
- AND `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm format` each exit 0

#### Scenario: typecheck uses project references mode

- GIVEN `typecheck` script is `vue-tsc -b --noEmit`
- WHEN the script runs on a multi-context Nuxt 4 project (app + server + shared tsconfigs)
- THEN `vue-tsc` resolves project references and type-checks all contexts

### Requirement: NX-004 — Nuxt 4 Directory Structure (app/ srcDir)

The project MUST use Nuxt 4 `app/` as `srcDir`. Directories under `app/`: `pages/`, `components/`, `composables/`, `layouts/`, `middleware/`, `plugins/`, `utils/`, `assets/`. Root directories: `server/`, `public/`, `shared/`, `tests/`. `~` alias MUST resolve to `app/`. `nuxt.config.ts` MUST include `imports: { dirs: ['app/stores'] }` for Pinia auto-import (Phase 2). `shared/` MUST be auto-imported on both app and server sides.

#### Scenario: Directory structure matches Nuxt 4 convention

- GIVEN scaffold is complete
- WHEN listing `app/` directory
- THEN all eight `app/` subdirectories exist
- AND `server/`, `public/`, `shared/`, `tests/` exist at root

#### Scenario: shared/ is auto-importable

- GIVEN Nuxt 4 auto-imports `shared/utils/` and `shared/types/`
- WHEN a TypeScript file in `app/` or `server/` references an export from `shared/`
- THEN the import is resolved without explicit path

### Requirement: NX-005 — SSR Home Page at `/`

The system MUST serve server-side rendered HTML at `/` from `app/app.vue` + `app/pages/index.vue`. The response MUST contain structured HTML with user-facing text in Spanish (es-ES, neutral). `routeRules: { '/cocina/**': { ssr: false } }` MUST be present in `nuxt.config.ts` as a Phase 2 placeholder (no admin pages implemented).

#### Scenario: HTTP GET `/` returns rendered HTML with Spanish text

- GIVEN the dev server is running on `localhost:3000`
- WHEN `curl -s http://localhost:3000/` is executed
- THEN the response includes HTML markup with visible Spanish body content
- AND the `Content-Type` header is `text/html`

#### Scenario: routeRules placeholder exists

- GIVEN `nuxt.config.ts` is inspected
- WHEN checking the `routeRules` config
- THEN `'/cocina/**': { ssr: false }` entry is present
