# panel-schema Specification

## Purpose

Database migration creating 7 tables with full RLS policies, the profiles auto-creation trigger, and seed data from existing mock fixtures. Applied via Supabase MCP `apply_migration`.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| SCH-001 | 7-table migration: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas | MUST |
| SCH-002 | RLS policies on ALL tables — anon: read public tables; admin: full; editor: per jsonb | MUST |
| SCH-003 | Seed data: insert existing mock fixture data into platos, eventos, menu_diario_config, menu_diario_items | MUST |
| SCH-004 | `auth.users` INSERT trigger → auto-create profiles row (role=editor, default permissions) | MUST |
| SCH-005 | Row-level `can_write(resource)` function called by all RLS policies | MUST |

### Requirement: SCH-001 — 7-Table Migration

The system MUST create these tables via migration:

| Table | Key Columns |
|-------|-------------|
| `profiles` | id (uuid PK FK→auth.users), role (text), permissions (jsonb) |
| `platos` | id, nombre, descripcion, precio (numeric), categoria, tipo_menu, imagen_url, disponible (bool), calorias (int), alergenos (text[]) |
| `eventos` | id, titulo, descripcion, fecha (date), categoria, imagen_url, activo (bool) |
| `menu_diario_config` | id, dia_semana (int 0-6), activo (bool), precio (numeric) |
| `menu_diario_items` | id, config_id (FK), seccion (text), nombre, descripcion |
| `configuracion` | id (single row), cliente_elige_mesa (bool), capacidad_total_local (int) |
| `reservas` | id, nombre_cliente, telefono, email, fecha_hora (timestamptz), numero_comensales, estado (text), mesa_id (FK nullable) |

#### Scenario: Migration applies without error

- GIVEN a Supabase project with auth schema
- WHEN the migration SQL is applied
- THEN all 7 tables exist with correct columns and foreign keys

### Requirement: SCH-002 — RLS Policies

The system MUST enable RLS on all 7 tables. Anon role SHALL read `platos`, `eventos`, `menu_diario_config`, `menu_diario_items`. Authenticated role: admin=all, editor=per jsonb via `can_write()`. Service role bypasses RLS.

#### Scenario: Anon can read platos

- GIVEN RLS is enabled on `platos`
- WHEN an unauthenticated request SELECTs from `platos`
- THEN rows are returned

#### Scenario: Anon cannot insert

- GIVEN RLS is enabled on `platos`
- WHEN an unauthenticated request INSERTs into `platos`
- THEN the operation is rejected

### Requirement: SCH-003 — Seed Data

The system MUST seed initial data from existing mock fixtures: insert `shared/fixtures/carta-mock.ts` platos into `platos`, `shared/fixtures/menu-diario-mock.ts` into `menu_diario_config` + `menu_diario_items`, `shared/fixtures/eventos-mock.ts` into `eventos`. Configuracion seeds with `cliente_elige_mesa=false`, `capacidad_total_local=80`.

#### Scenario: Public pages show seeded data after migration

- GIVEN seed migration has run
- WHEN querying `platos` table
- THEN data matches the original mock fixture content

### Requirement: SCH-004 — Auth Trigger

The system MUST create a `SECURITY DEFINER` function `handle_new_user()` that inserts a `profiles` row on `auth.users` INSERT with role='editor' and default permissions jsonb.

#### Scenario: New user gets profile

- GIVEN trigger is installed
- WHEN a row is inserted into `auth.users`
- THEN a corresponding `profiles` row exists with role='editor'

### Requirement: SCH-005 — can_write() Function

The system MUST provide `can_write(resource text) RETURNS boolean SECURITY DEFINER`. Logic: `SELECT role='admin' OR (role='editor' AND (permissions->>resource)::boolean) FROM profiles WHERE id=auth.uid()`.

#### Scenario: can_write returns true for admin

- GIVEN a profiles row with role='admin'
- WHEN `can_write('carta')` is called
- THEN returns true regardless of permissions jsonb

## Edge Cases

- **Migration re-run**: use `IF NOT EXISTS` for tables; idempotent seed with `ON CONFLICT DO NOTHING`
- **Empty seed**: if seed data is empty, no rows inserted (no error)
- **Down migration**: revert scripts stored in `shared/db/revert/`
