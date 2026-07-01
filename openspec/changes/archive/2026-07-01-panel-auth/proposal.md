# Proposal: Panel & Auth (Phase 2)

## Intent

Deliver the `/cocina` admin panel with Supabase Auth, role-based permissions, and CRUD operations for La Zíngara. Migrate public pages (`/carta`, `/menu-diario`, `/eventos`) from mock fixtures to live Supabase data. Enable staff to manage the restaurant digitally — no more ad-hoc paper/phone workflows.

## Phase Tag

**Phase 2** — Panel & Auth (per `openspec/config.yaml` rules: `Tag Phase`)

## Scope

### In Scope

| # | Deliverable | Details |
|---|-------------|---------|
| 1 | `/cocina` login | Supabase Auth email/password, blind route, session persistence |
| 2 | 3-tier middleware | `auth.ts` → `role.ts` → `permissions.ts` guarding all `/cocina/**` routes (SPA: `ssr: false`) |
| 3 | `/cocina/dashboard` | Metrics: total platos, today's reservations, active events |
| 4 | `/cocina/carta` | CRUD platos (nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos) |
| 5 | `/cocina/menu-diario` | Day management + variable pricing (Mon-Fri 16€, Sat 25€, Sun optional) + 5-section structure |
| 6 | `/cocina/eventos` | CRUD eventos |
| 7 | `/cocina/configuracion` | System settings (cliente_elige_mesa, capacidad_total_local) |
| 8 | `/cocina/usuarios` | Admin-only: create user, assign role, edit permissions JSON, deactivate, reset password |
| 9 | Public page migration | `/carta`, `/menu-diario`, `/eventos` → Supabase composables (usePlatos, useMenuDiario, useEventos) with `useAsyncData`. No mock fallback. Mock fixtures become DB seed data. |
| 10 | DB schema | 7 tables: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas. RLS on ALL tables. Trigger: `auth.users` insert → auto-create profiles row. |
| 11 | Permissions system | 2 roles (admin/editor). Permissions = `jsonb`: `{carta, menu_diario, eventos, reservas, configuracion, usuarios}`. RLS enforces via Postgres function `can_write(resource)`. |

### Out of Scope

| # | Deferred | Target |
|---|----------|--------|
| 1 | `/cocina/reservas` Konva canvas table manager | Phase 3 |
| 2 | `mesas` table + fusion logic | Phase 3 |
| 3 | LabsMobile SMS integration (module exists, wiring deferred) | Later |
| 4 | SEO meta, i18n, real photography | Later |

## Capabilities

### New Capabilities

- `panel-auth`: Login/logout, session state, auth composable, `/cocina` login page
- `panel-permissions`: 2 roles (admin/editor), permissions `jsonb`, RLS helper `can_write()`, auth trigger
- `panel-schema`: 7-table migration + RLS policies + seed data from mock fixtures
- `panel-dashboard`: Metrics composable + `/cocina/dashboard` page (total platos, today's reservations, active events)
- `panel-crud`: Generic CRUD pattern + `/cocina/carta` plato management
- `panel-menu-diario`: Day config with variable pricing + 5-section dish assignment
- `panel-eventos`: CRUD eventos admin
- `panel-configuracion`: `/cocina/configuracion` settings form
- `panel-usuarios`: User CRUD + permission editor (admin-only)

### Modified Capabilities

- `carta-navigation`: CN-006 data source mock → `usePlatos` composable (Supabase `useAsyncData`)
- `menu-diario`: MD-001 fixed price → variable per-day pricing; MD-004 mock → `useMenuDiario` composable
- `eventos-gallery`: EG-001 mock data → `useEventos` composable (Supabase)
- `public-ui`: New admin-specific shared components (sidebar nav, BaseDataTable)
- `app-architecture`: Middleware chain registration, `@nuxtjs/supabase` module install
- `test-harness`: Supabase mock client for vitest, RLS test helpers

## Approach

- **Module**: `@nuxtjs/supabase` — auto-imports `useSupabaseClient`, `useSupabaseUser`, `serverSupabaseServiceRole`; handles SSR cookie relay
- **Middleware (3 files)**: `app/middleware/auth.ts` (redirect unauthenticated), `role.ts` (load profile + role), `permissions.ts` (check `jsonb` field, block route if denied)
- **Server routes**: Nitro `server/api/admin/` endpoints for admin Auth API operations (create user, reset password) using `serverSupabaseServiceRole` via `runtimeConfig` (never exposed client-side)
- **Composables**: `usePlatos()`, `useMenuDiario()`, `useEventos()` wrapping `useAsyncData` for SSR-safe public page data fetching
- **Migrations**: Supabase MCP `apply_migration` for all DDL. Seed script runs mock fixture data as initial DB rows.
- **TDD**: Vitest unit (mock Supabase client), integration (`@nuxt/test-utils`), Playwright E2E (login→CRUD flow), RLS policy tests

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/middleware/` | New | auth.ts, role.ts, permissions.ts |
| `app/pages/cocina/` | New | 8 admin SPA pages |
| `app/composables/` | New + Modified | useAuth, usePlatos, useMenuDiario, useEventos |
| `shared/fixtures/` | Modified | Mock data → DB seed; files kept but no longer imported |
| `server/api/admin/` | New | Nitro endpoints for admin user management |
| `nuxt.config.ts` | Modified | Add `@nuxtjs/supabase` module |
| `app/layouts/` | New | Admin layout with sidebar nav |
| Supabase DB | New | 7 tables + RLS + trigger + seed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@nuxtjs/supabase` incompatibility with Nuxt 4.4.8 | Low | Verify at install; fallback to manual `@supabase/supabase-js` + custom plugin |
| Supabase project paused (MCP timeout) | Medium | User must un-pause project + configure `.env` before migrations |
| RLS + permissions `jsonb` complexity causes auth bypass | Medium | TDD: unit tests for `can_write()` Postgres function; security advisor check post-migration |
| Middleware stacking order errors (auth → role → permissions) | Low | Integration tests verify redirect chain per role |
| Mock cutover breaks SSR hydration | Low | Composables tested with `useAsyncData` + empty-state fallback; Playwright smoke tests on public pages |

## Rollback Plan

1. **Feature flag**: `DISABLE_COCINA_AUTH=true` env var bypasses middleware (dev-only emergency)
2. **Mock fixtures preserved**: `shared/fixtures/*-mock.ts` files remain in repo (commented-out imports in composables as fallback reference)
3. **Migration down scripts**: Each `apply_migration` paired with a `_down.sql` revert script stored in `shared/db/revert/`
4. **Git revert**: `git revert` the merge commit + re-deploy restores Phase 1 public pages to mock-only state

## Dependencies

- `@nuxtjs/supabase` npm module (pnpm add)
- Supabase project un-paused + `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- DB migrations applied (7 tables + RLS + trigger + seed)
- Phase 1 (Changes #1-2) completed: Nuxt scaffold + public pages with mock data

## Success Criteria

- [ ] Login flow: valid credentials → `/cocina/dashboard`; invalid → error message; unauthenticated → redirect to `/cocina`
- [ ] Admin user can CRUD platos, eventos; editor blocked from `/cocina/usuarios` and `/cocina/configuracion`
- [ ] Public `/carta`, `/menu-diario`, `/eventos` load data from Supabase with no mock fallback
- [ ] Menu diario shows Mon-Fri 16€, Sat 25€, Sun (if active) with correct 5-section structure
- [ ] RLS prevents anon role from writing to any table; editor can only write to permitted resources
- [ ] All tests green: Vitest unit + integration + Playwright E2E; coverage ≥ 70%
- [ ] Security advisor (`supabase_get_advisors type=security`) returns no new RLS issues post-migration
