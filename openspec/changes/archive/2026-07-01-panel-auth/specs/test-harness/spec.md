# Delta for test-harness

## ADDED Requirements

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
