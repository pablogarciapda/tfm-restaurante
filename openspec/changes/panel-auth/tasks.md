# Tasks: Panel & Auth (Phase 2)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,350 across ~34 files |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 (feature-branch-chain) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Supabase foundation: module + DB + RLS + seed + test harness | PR 1 | base: feature/panel-auth; zero UI |
| 2 | Auth + middleware + layout + dashboard | PR 2 | base: PR 1 branch |
| 3 | CRUDs (platos/eventos/menu-diario) + public page migration | PR 3 | base: PR 2 branch |
| 4 | Usuarios + configuracion + Nitro endpoints + E2E + quality gate | PR 4 | base: PR 3 branch |

---

## 1. Supabase Foundation (PR 1 — ~650 lines)

- [x] 1.1 [SETUP] Install `@nuxtjs/supabase` via pnpm; register in `nuxt.config.ts` modules + runtimeConfig. (AR-006)
- [x] 1.2 [SETUP] Create `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; add `.env.example`. (AR-006)
- [x] 1.3 [DB] Run 7 `apply_migration` calls: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas. Columns per design §DB Schema. (SCH-001)
- [x] 1.4 [DB] Enable RLS on all 7 tables; apply policy matrix: anon SELECT public tables; write via `can_write()`. (SCH-002)
- [x] 1.5 [DB] Create `can_write(resource)` SECURITY DEFINER function; create `handle_new_user()` trigger on `auth.users` INSERT. (SCH-004, SCH-005, PERM-004)
- [x] 1.6 [DB] Seed `platos`, `eventos`, `menu_diario_config`, `menu_diario_items`, `configuracion` from `shared/fixtures/*-mock.ts`. (SCH-003)
- [x] 1.7 [TDD:RED→GREEN] `test/unit/utils/mock-supabase.test.ts` + `test/utils/mock-supabase.ts`: mock Supabase client factory. (TH-004)
- [x] 1.8 [TDD:RED→GREEN] `test/unit/utils/rls-helpers.test.ts` + `test/utils/rls-helpers.ts`: RLS policy test helpers. (TH-005)
- [x] 1.9 [GATE] `pnpm vitest run` green; `supabase_get_advisors(type=security)` no new RLS issues.

## 2. Auth + Middleware + Layout + Dashboard (PR 2 — ~700 lines)

- [ ] 2.1 [TDD:RED→GREEN] `app/middleware/auth.ts`: check session; unauthenticated → redirect `/cocina`. (AUTH-003, AR-005)
- [ ] 2.2 [TDD:RED→GREEN] `app/middleware/role.ts`: load `profiles` row; set `$role`+`$permissions`; missing profile → force logout. (PERM-001, PERM-005, AR-005)
- [ ] 2.3 [TDD:RED→GREEN] `app/middleware/permissions.ts`: map route→resource; check jsonb; denied → redirect `/cocina/dashboard`. (PERM-005, AR-005)
- [ ] 2.4 [TDD:RED→GREEN] `app/composables/useAuth.ts`: wrap `useSupabaseClient().auth` signIn/signOut/onAuthStateChange. (AUTH-001, AUTH-004)
- [ ] 2.5 [TDD:RED→GREEN] `app/pages/cocina/index.vue`: login form email+password, error state, auth redirect. (AUTH-001, AUTH-005)
- [ ] 2.6 [TDD:RED→GREEN] `app/layouts/cocina.vue`: sidebar + main + topbar (email + logout). ClientOnly. (PU-010)
- [ ] 2.7 [TDD:RED→GREEN] `app/components/AdminSidebar.vue`: 7 nav links, active highlight, hide unauthorized, hamburger <768px. (PU-009)
- [ ] 2.8 [TDD:RED→GREEN] `app/components/MetricCard.vue`: label + value + icon slot. (DASH-001)
- [ ] 2.9 [TDD:RED→GREEN] `app/composables/useDashboard.ts`: parallel `useAsyncData` for 3 metrics. (DASH-002, DASH-003, DASH-004)
- [ ] 2.10 [TDD:RED→GREEN] `app/pages/cocina/dashboard.vue`: 3 MetricCards; read-only. (DASH-001 to DASH-005)
- [ ] 2.11 [GATE] All middleware tests green; login→dashboard flow verified.

## 3. CRUDs + Public Migration (PR 3 — ~1,350 lines)

- [ ] 3.1 [TDD:RED→GREEN] `app/composables/usePlatos.ts`: `useAsyncData` from Supabase, sort by `puesto`. (CN-006)
- [ ] 3.2 [TDD:RED→GREEN] `app/components/PlatoForm.vue`: fields per CRUD-002, Spanish labels, validation. (CRUD-002)
- [ ] 3.3 [TDD:RED→GREEN] `app/components/PlatosTable.vue`: sortable columns, toggle disponible, delete confirm. (CRUD-001, CRUD-004, CRUD-005)
- [ ] 3.4 [TDD:RED→GREEN] `app/pages/cocina/carta.vue`: list + create/edit/delete flows. (CRUD-001 to CRUD-005)
- [ ] 3.5 [TDD:RED→GREEN] `app/composables/useMenuDiario.ts`: join config+items for current day. (MD-004, MD-005)
- [ ] 3.6 [TDD:RED→GREEN] `app/components/MenuDiarioEditor.vue`: day selector + 5-section dish manager + add/remove. (CMD-001 to CMD-005)
- [ ] 3.7 [TDD:RED→GREEN] `app/pages/cocina/menu-diario.vue`: day list + editor integration. (CMD-001 to CMD-005)
- [ ] 3.8 [TDD:RED→GREEN] `app/composables/useEventos.ts`: `useAsyncData`, active only, fecha ASC. (EG-001)
- [ ] 3.9 [TDD:RED→GREEN] `app/components/EventoForm.vue` + `EventosTable.vue`: form with date picker + sortable list. (CEV-001, CEV-002)
- [ ] 3.10 [TDD:RED→GREEN] `app/pages/cocina/eventos.vue`: list + create/edit/delete + toggle activo. (CEV-001 to CEV-004)
- [ ] 3.11 [MIGRATE] `app/pages/carta.vue`: replace mock import → `usePlatos()`. (CN-006)
- [ ] 3.12 [MIGRATE] `app/pages/menu-diario.vue`: replace mock → `useMenuDiario()` with variable pricing. (MD-001, MD-004, MD-005)
- [ ] 3.13 [MIGRATE] `app/pages/eventos.vue`: replace mock → `useEventos()`, only active+future. (EG-001)
- [ ] 3.14 [GATE] Public pages SSR 200; CRUD forms render; vitest green on composables+components.

## 4. Usuarios + Config + E2E (PR 4 — ~700 lines)

- [ ] 4.1 [TDD:RED→GREEN] `app/components/ConfiguracionForm.vue`: toggle cliente_elige_mesa + capacidad input. (CFG-001)
- [ ] 4.2 [TDD:RED→GREEN] `app/pages/cocina/configuracion.vue`: form + upsert save; admin-only per middleware. (CFG-001 to CFG-003)
- [ ] 4.3 [TDD:RED→GREEN] `server/api/cocina/usuarios/create.post.ts`: `serverSupabaseServiceRole` → `auth.admin.createUser()`. (USR-002)
- [ ] 4.4 [TDD:RED→GREEN] `server/api/cocina/usuarios/list.get.ts`: join auth.users + profiles. (USR-001, USR-006)
- [ ] 4.5 [TDD:RED→GREEN] `server/api/cocina/usuarios/update.post.ts`: update profile role+permissions. (USR-003)
- [ ] 4.6 [TDD:RED→GREEN] `server/api/cocina/usuarios/deactivate.post.ts`: set `profiles.activo=false`. (USR-004)
- [ ] 4.7 [TDD:RED→GREEN] `server/api/cocina/usuarios/reset-password.post.ts`: `auth.admin.generateLink()`. (USR-005)
- [ ] 4.8 [TDD:RED→GREEN] `app/components/UsuarioForm.vue`: email+password+role select; `UsuariosTable.vue`: email, role badge, perm summary; `PermissionsEditor.vue`: 6 toggles. (USR-001 to USR-003)
- [ ] 4.9 [TDD:RED→GREEN] `app/pages/cocina/usuarios.vue`: list + create + edit permissions + deactivate + reset password. (USR-001 to USR-006)
- [ ] 4.10 [TDD:RED→GREEN] `test/e2e/cocina-login.spec.ts`: login→dashboard→logout flow. (AUTH-001 to AUTH-005)
- [ ] 4.11 [TDD:RED→GREEN] `test/e2e/cocina-crud.spec.ts`: create plato→edit→delete. (CRUD-001 to CRUD-005)
- [ ] 4.12 [GATE] `pnpm vitest run --coverage` ≥70%; `pnpm playwright test` green; `pnpm vue-tsc --noEmit` clean; `pnpm eslint .` clean.
