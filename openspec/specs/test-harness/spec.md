# test-harness Specification

## Purpose

TDD-ready test stack for Restaurante La Zíngara. Proves all three testing layers (unit, integration, E2E) are wired before feature code is written. Extended with Supabase mock client and RLS test helpers for Phase 2.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| TH-001 | Vitest Stack with @nuxt/test-utils (Projects Approach) | MUST |
| TH-002 | Three Smoke Tests (TDD RED-first) | MUST |
| TH-003 | Code Quality Gates (ESLint, Prettier, vue-tsc) | MUST |
| TH-004 | Supabase Mock Client for Vitest unit/integration tests | MUST |
| TH-005 | RLS Policy Test Helpers | MUST |

### Requirement: TH-001 — Vitest Stack with @nuxt/test-utils (Projects Approach)

The system MUST use Vitest 4.x with `@nuxt/test-utils` configured via the Vitest **projects** approach (`defineVitestProject` from `@nuxt/test-utils/config`). Two separate projects: `unit`, `nuxt` (integration). `happy-dom` MUST be an explicit `devDependency`. Unit component tests MUST use `mount()` from `@vue/test-utils` with happy-dom environment. Integration tests MUST use `$fetch` from `@nuxt/test-utils/e2e`. Playwright MUST be installed for E2E as a separate runner. Test files for Nuxt context live in `test/nuxt/`.

| Success Criterion                                            | Verification                                     |
| ------------------------------------------------------------ | ------------------------------------------------ |
| No unresolved peer conflicts                                 | `pnpm ls` shows clean dependency tree            |
| `vitest.config.ts` uses `defineVitestProject` with 2 projects | Config references `unit`, `nuxt` projects |
| `happy-dom` in `devDependencies`                             | `package.json` lists it explicitly               |

#### Scenario: Dependencies install without peer conflicts

- GIVEN `pnpm install` runs
- WHEN checking peer dependency warnings
- THEN no unresolved `vitest`, `@nuxt/test-utils`, or `playwright` conflicts exist
- AND if a peer mismatch IS detected, the version MUST be pinned before tests can run

#### Scenario: Playwright browser download failure is handled

- GIVEN `pnpm exec playwright install chromium` fails (network, disk, or permissions)
- WHEN `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set as env fallback
- THEN the install MUST NOT fail
- AND `package.json` MUST surface a pre-test hook or `test:e2e:install` script so browser install is explicit before `pnpm test:e2e`

#### Scenario: Vitest projects config resolves

- GIVEN `vitest.config.ts` defines `unit` and `nuxt` projects
- WHEN `pnpm test` runs
- THEN each project's test files are discovered and executed
- AND the nuxt project uses `environment: 'nuxt'` with all Nuxt auto-imports available

### Requirement: TH-002 — Three Smoke Tests (TDD RED-first)

The system MUST have three smoke tests written BEFORE the production code they verify (TDD RED phase). All three MUST pass after implementation.

#### Scenario: Unit — Vue component renders via @vue/test-utils mount()

- GIVEN a Vue component exists in `app/components/` or `app/pages/` and vitest unit project uses environment 'happy-dom'
- WHEN Vitest mounts it via `mount()` from `@vue/test-utils` (NOT `mountSuspended` — unit project has no Nuxt runtime)
- THEN the wrapper is truthy and contains expected text
- AND no mount-time errors are thrown

#### Scenario: Integration — SSR `/` returns 200

- GIVEN `@nuxt/test-utils` Nuxt environment is active
- WHEN a test fetches `/` via `$fetch`
- THEN the HTTP status is 200
- AND the response body is non-empty HTML

#### Scenario: E2E — Playwright loads `/`

- GIVEN the Nuxt dev server is running as Playwright's `webServer`
- WHEN Playwright executes `page.goto('/')`
- THEN the page loads without uncaught console errors
- AND a `<title>` element is present in the DOM

### Requirement: TH-003 — Code Quality Gates

The system MUST have `@nuxt/eslint` registered as a module in `nuxt.config.ts` (flat config). Prettier MUST be installed and configured. `pnpm lint` MUST pass; `pnpm format --check` MUST report clean. `pnpm typecheck` MUST use `vue-tsc -b --noEmit`.

#### Scenario: ESLint flat config passes on clean scaffold

- GIVEN `@nuxt/eslint` module is registered and scaffold is complete
- WHEN `pnpm lint` executes
- THEN exit code is 0

#### Scenario: TypeScript strict type-check passes

- GIVEN all `.vue` and `.ts` files have strictly valid TypeScript
- WHEN `pnpm typecheck` (`vue-tsc -b --noEmit`) runs
- THEN exit code is 0 and no TS errors are reported

#### Scenario: Prettier format check reports clean

- GIVEN all source files are formatted
- WHEN `pnpm format --check` runs
- THEN exit code is 0

### Requirement: TH-004 — Supabase Mock Client for Vitest

The system MUST provide a Supabase mock client for vitest unit/integration tests. It SHALL mock `useSupabaseClient()` returning configurable `from().select()`, `from().insert()`, `from().update()`, `from().delete()` chains. Mock chain SHALL support `.eq()`, `.single()`, `.order()`, `.limit()`. The mock SHALL be a factory: `createMockSupabaseClient(overrides?)`. Tests using the mock SHALL NOT require a real Supabase connection. Must also mock `useSupabaseUser()` returning a configurable user stub (or null for unauthenticated tests).

(Previously: No Supabase testing — Phase 1 tests used mock data imports directly)

#### Scenario: Mock select returns configurable data

- GIVEN a vitest unit test creates a mock client with `select: () => [{id:1, nombre:'Gazpacho'}]`
- WHEN a composable calls `.from('platos').select()`
- THEN the mock returns `[{id:1, nombre:'Gazpacho'}]`

#### Scenario: Mock user returns null for unauthenticated

- GIVEN `useSupabaseUser()` mock configured to return `null`
- WHEN middleware auth check runs
- THEN unauthenticated path is triggered (redirect to /cocina)

#### Scenario: Mock insert returns created row

- GIVEN mock configured for insert returning `{id: 99}`
- WHEN a CRUD composable calls `.from('platos').insert({...})`
- THEN the mock returns `{id: 99}`

### Requirement: TH-005 — RLS Policy Test Helpers

The system MUST provide test helpers for verifying RLS policies. A helper `testRlsPolicy(table, role, operation)` SHALL execute a query as the specified role and assert the result. For unit tests without real DB: mock the `can_write()` function. For integration/E2E: use the actual Supabase instance. Tests SHALL verify: anon can SELECT platos/eventos/menu tables, anon CANNOT INSERT/UPDATE/DELETE any table, editor can write only to permitted resources, admin can write to all.

(Previously: No RLS testing existed — Phase 1 had no database)

#### Scenario: Anon read access verified

- GIVEN RLS is enabled on platos
- WHEN a test executes `SELECT * FROM platos` as anon
- THEN rows are returned (policy allows read)

#### Scenario: Anon write blocked

- GIVEN RLS is enabled on platos
- WHEN a test executes `INSERT INTO platos` as anon
- THEN the operation is rejected by RLS

#### Scenario: Editor write to permitted table

- GIVEN editor has `carta: true` permission
- WHEN a test executes `INSERT INTO platos` as that editor
- THEN `can_write('carta')` returns true and insert succeeds
