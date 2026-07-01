# Delta for app-architecture

## ADDED Requirements

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
