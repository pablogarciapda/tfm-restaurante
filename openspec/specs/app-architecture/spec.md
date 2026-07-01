# app-architecture Specification

## Purpose

Modular architecture skeleton for Restaurante La Zíngara. Establishes the vertical-slice structure, cross-domain contract boundaries, middleware chain for admin routes, and Supabase module integration.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| AR-001 | Vertical slice skeleton at `app/features/` | MUST |
| AR-002 | Contract home: `shared/types/` and `shared/contracts/` | MUST |
| AR-003 | No slice-to-slice direct imports | MUST |
| AR-004 | Home page at `app/pages/index.vue` — NOT a domain slice | MUST |
| AR-005 | 3-tier middleware chain for `/cocina/**` routes | MUST |
| AR-006 | `@nuxtjs/supabase` module installed and registered | MUST |

### Requirement: AR-001 — Vertical Slice Skeleton

The system MUST have an `app/features/` directory with a `.gitkeep` file. This directory is the home for domain slices (`carta`, `reservas`, `mesas`, `eventos`, `auth`, `configuracion`). Each domain slice is an autonomous vertical with its own internal layers. Cross-domain communication is EXCLUSIVELY via contracts in `shared/`. No slices exist at bootstrap — the skeleton is structural preparation.

#### Scenario: Slice home directory exists

- GIVEN the bootstrap scaffold is complete
- WHEN listing `app/features/`
- THEN the directory exists
- AND contains `.gitkeep`
- AND is tracked by git while empty

### Requirement: AR-002 — Contract Home

The system MUST have `shared/` with `shared/types/` and `shared/contracts/` subdirectories, each with a `.gitkeep`. These directories are the contract boundary: every domain slice exposes its public interface through files here (e.g., `carta.contract.ts`). Nuxt 4 auto-imports `shared/` on both app and server sides, making contracts available without explicit imports.

#### Scenario: Contract home structure exists

- GIVEN the bootstrap scaffold is complete
- WHEN listing `shared/`
- THEN `shared/types/.gitkeep` exists
- AND `shared/contracts/.gitkeep` exists

### Requirement: AR-003 — No Slice-to-Slice Direct Imports

No file under `app/features/{domainA}/` SHALL import from `app/features/{domainB}/`. Cross-domain communication MUST go through `shared/contracts/`. This is a structural rule enforced by the directory skeleton and naming convention. A lint rule (eslint plugin) for automated enforcement is OUT OF SCOPE — it is a future hardening task (separate change).

#### Scenario: Skeleton establishes structural boundary

- GIVEN `app/features/` and `shared/contracts/` exist
- WHEN a future domain change adds a slice (e.g., `app/features/carta/`)
- THEN the convention mandates its public interface lives in `shared/contracts/carta.contract.ts`
- AND internal slice files MUST NOT import from sibling `app/features/*` directories

#### Scenario: Contract boundary is verifiable

- GIVEN the project directory structure
- WHEN a reviewer inspects cross-domain imports
- THEN any import from `app/features/domA/` into `app/features/domB/` is a violation
- AND may be detected manually via grep or filesystem traversal

### Requirement: AR-004 — Home Page Decision

The `/` home page MUST remain at `app/pages/index.vue` — it is NOT a domain slice. Rationale: `/` is a shell-level route composing multiple domains, not a standalone domain. This preserves the convention that `app/features/` is only for true vertical domains. The decision is documented here so future implementers understand why `app/features/home/` does not exist.

#### Scenario: Home page is NOT a domain slice

- GIVEN the project directory structure
- WHEN listing `app/features/`
- THEN no `home/` subdirectory exists
- AND the home page is at `app/pages/index.vue`

#### Scenario: Shell pages don't violate slice rules

- GIVEN `app/pages/index.vue` imports from multiple domain contracts in `shared/contracts/`
- WHEN implemented by future changes
- THEN the page is a composition surface, NOT a domain slice
- AND does NOT violate AR-003 because `app/pages/` is not under `app/features/`

### Requirement: AR-005 — Nuxt Middleware Chain for /cocina

The system MUST register a 3-tier Nuxt middleware chain for all `/cocina/**` routes. Middleware files: `app/middleware/auth.ts`, `app/middleware/role.ts`, `app/middleware/permissions.ts`, executed in that order. `auth.ts` SHALL check Supabase session; unauthenticated → redirect to `/cocina`. `role.ts` SHALL load `profiles` row and set `useNuxtApp().$role` + `$permissions`. `permissions.ts` SHALL map route to resource key and check permissions jsonb; denied → redirect to `/cocina/dashboard` with error toast. All `/cocina/**` routes MUST have `ssr: false` in `nuxt.config.ts` `routeRules`.

(Previously: No middleware existed — Phase 1 had no admin routes)

#### Scenario: Unauthenticated user redirected

- GIVEN no active Supabase session
- WHEN user navigates to `/cocina/dashboard`
- THEN auth middleware redirects to `/cocina`

#### Scenario: Editor with permission passes

- GIVEN editor with `carta: true` and active session
- WHEN navigating to `/cocina/carta`
- THEN all 3 middleware checks pass; page renders

#### Scenario: Editor without permission blocked

- GIVEN editor with `usuarios: false` and active session
- WHEN navigating to `/cocina/usuarios`
- THEN permissions middleware redirects to `/cocina/dashboard`

### Requirement: AR-006 — @nuxtjs/supabase Module

The system MUST install and register `@nuxtjs/supabase` in `nuxt.config.ts`. This module SHALL provide auto-imported composables: `useSupabaseClient`, `useSupabaseUser`, `useSupabaseSession`. `serverSupabaseServiceRole` SHALL be available in Nitro server routes via `runtimeConfig`. The `SUPABASE_SERVICE_ROLE_KEY` SHALL be in `.env` only; NEVER exposed to client bundle.

(Previously: No Supabase module — Phase 1 used `@supabase/supabase-js` directly for read-only public data)

#### Scenario: Module registered in config

- GIVEN `@nuxtjs/supabase` is installed
- WHEN `nuxt.config.ts` is checked
- THEN the module appears in the `modules` array with Supabase URL + anon key in runtimeConfig

#### Scenario: Service role key not in client bundle

- GIVEN the app is built for production
- WHEN inspecting the client JS bundle
- THEN `SUPABASE_SERVICE_ROLE_KEY` does not appear
