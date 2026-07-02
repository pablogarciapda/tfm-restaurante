# panel-schema Specification

## Purpose

Database migration creating 8 tables with full RLS policies, the profiles auto-creation trigger, and seed data from existing mock fixtures. Applied via Supabase MCP `apply_migration`.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| SCH-001 | 8-table migration: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas, mesas | MUST |
| SCH-002 | RLS policies on ALL tables — anon: read public tables; admin: full; editor: per jsonb. mesas: authenticated with `can_write('reservas')` MAY write; anon has no access | MUST |
| SCH-003 | Seed data: insert existing mock fixture data into platos, eventos, menu_diario_config, menu_diario_items | MUST |
| SCH-004 | `auth.users` INSERT trigger → auto-create profiles row (role=editor, default permissions) | MUST |
| SCH-005 | Row-level `can_write(resource)` function called by all RLS policies | MUST |
| SCH-006 | mesas table (14 cols): self-ref FK `mesa_padre_id→mesas(id) ON DELETE SET NULL`, CHECK zona 5 values, RLS + Realtime publication | MUST |
| SCH-007 | reservas.estado CHECK constraint includes 'standby' for unfused reservations awaiting reassignment | MUST |
| SCH-008 | FK reservas.mesa_id → mesas.id (nullable — standby reservations have no mesa) | MUST |
| SCH-009 | Realtime publication on mesas via `ALTER PUBLICATION supabase_realtime ADD TABLE mesas` | MUST |
| SCH-010 | Dual occupancy config: configuracion.modo_ocupacion ('auto'/'manual') + ocupacion_manual (int, ≥0) | MUST |

### Requirement: SCH-001 — 8-Table Migration

The system MUST create these tables via migration:

| Table | Key Columns |
|-------|-------------|
| `profiles` | id (uuid PK FK→auth.users), role (text), permissions (jsonb) |
| `platos` | id, nombre, descripcion, precio (numeric), categoria, tipo_menu, imagen_url, disponible (bool), calorias (int), alergenos (text[]) |
| `eventos` | id, titulo, descripcion, fecha (date), categoria, imagen_url, activo (bool) |
| `menu_diario_config` | id, dia_semana (int 0-6), activo (bool), precio (numeric) |
| `menu_diario_items` | id, config_id (FK), seccion (text), nombre, descripcion |
| `configuracion` | id, cliente_elige_mesa (bool), capacidad_total_local (int), modo_ocupacion (text), ocupacion_manual (int) |
| `reservas` | id, nombre_cliente, telefono, email, fecha_hora (timestamptz), numero_comensales, estado (text CHECK IN pendiente,confirmada,cancelada,completada,standby), mesa_id (FK→mesas.id, nullable) |
| `mesas` | id, numero_mesa, capacidad_base, posicion_x/y, ancho, alto, rotacion, zona (CHECK 5 zones), mesa_padre_id (self-ref FK), id_fusion, capacidad_actual, created_at, updated_at |

#### Scenario: Migration applies without error

- GIVEN a Supabase project with auth schema
- WHEN the Phase 3 migration SQL is applied
- THEN all 8 tables exist with correct columns and foreign keys
- AND `reservas.estado` accepts 'standby'
- AND `reservas.mesa_id` FK references `mesas.id`
- AND Realtime publication includes `mesas`

### Requirement: SCH-002 — RLS Policies

The system MUST enable RLS on all 8 tables. Anon role SHALL read `platos`, `eventos`, `menu_diario_config`, `menu_diario_items`. Authenticated role: admin=all, editor=per jsonb via `can_write()`. Service role bypasses RLS. **mesas RLS**: authenticated with `can_write('reservas')` MAY write; anon has no access.

#### Scenario: Anon can read platos

- GIVEN RLS is enabled on `platos`
- WHEN an unauthenticated request SELECTs from `platos`
- THEN rows are returned

#### Scenario: Anon cannot insert

- GIVEN RLS is enabled on `platos`
- WHEN an unauthenticated request INSERTs into `platos`
- THEN the operation is rejected

#### Scenario: Editor with reservas permission can write mesas

- GIVEN editor has `permissions->>'reservas' = true`
- WHEN editor INSERTs into `mesas`
- THEN operation succeeds

#### Scenario: Anon blocked from mesas

- GIVEN RLS is enabled on `mesas`
- WHEN unauthenticated request SELECTs from `mesas`
- THEN operation is rejected

### Requirement: SCH-003 — Seed Data

The system MUST seed initial data from existing mock fixtures: insert `shared/fixtures/carta-mock.ts` platos into `platos`, `shared/fixtures/menu-diario-mock.ts` into `menu_diario_config` + `menu_diario_items`, `shared/fixtures/eventos-mock.ts` into `eventos`. Configuracion seeds with `cliente_elige_mesa=false`, `capacidad_total_local=80`, `modo_ocupacion='auto'`, `ocupacion_manual=NULL`.

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

### Requirement: SCH-006 — mesas Table

The system MUST create the `mesas` table with RLS enabled:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `numero_mesa` | int | NOT NULL |
| `capacidad_base` | int | NOT NULL, CHECK ≥1 |
| `posicion_x` | float | NOT NULL, DEFAULT 0 |
| `posicion_y` | float | NOT NULL, DEFAULT 0 |
| `ancho` | float | NOT NULL, DEFAULT 100 |
| `alto` | float | NOT NULL, DEFAULT 100 |
| `rotacion` | float | NOT NULL, DEFAULT 0 |
| `zona` | text | NOT NULL, CHECK IN ('Principal','Zingaro','Privado','Terraza','Bar') |
| `mesa_padre_id` | uuid | FK→mesas(id) ON DELETE SET NULL, nullable |
| `id_fusion` | uuid | nullable |
| `capacidad_actual` | int | NOT NULL, DEFAULT capacidad_base |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now() |

RLS policy: authenticated users with `can_write('reservas')` MAY INSERT/UPDATE/DELETE. Anon: no access.

#### Scenario: mesas table exists after migration

- GIVEN the Phase 3 migration is applied
- WHEN querying `information_schema.tables`
- THEN `mesas` table exists with all 14 columns and correct types

#### Scenario: RLS blocks anon on mesas

- GIVEN RLS is enabled on `mesas`
- WHEN an unauthenticated request SELECTs from `mesas`
- THEN the operation is rejected

### Requirement: SCH-007 — reservas.estado 'standby'

The system MUST add `'standby'` to the `reservas.estado` CHECK constraint. Valid values SHALL be: `pendiente`, `confirmada`, `cancelada`, `completada`, `standby`. The `standby` state indicates a reservation whose table was unfused and awaits reassignment.

#### Scenario: Standby value accepted

- GIVEN the updated CHECK constraint
- WHEN inserting reserva with estado='standby'
- THEN the INSERT succeeds

#### Scenario: Invalid estado still rejected

- GIVEN the updated CHECK constraint
- WHEN inserting reserva with estado='unknown_status'
- THEN the INSERT fails with constraint violation

### Requirement: SCH-008 — FK reservas.mesa_id → mesas.id

The system MUST alter the `reservas.mesa_id` foreign key to reference `mesas(id)` (previously nullable placeholder without FK target). Column remains nullable (standby reservations have no mesa_id).

#### Scenario: FK enforces valid mesa reference

- GIVEN FK is created
- WHEN inserting reserva with mesa_id pointing to non-existent mesa
- THEN the INSERT fails with foreign key violation

#### Scenario: Null mesa_id still allowed (standby)

- GIVEN FK is created
- WHEN inserting reserva with mesa_id=NULL and estado='standby'
- THEN the INSERT succeeds

### Requirement: SCH-009 — Realtime Publication on mesas

The system MUST enable Supabase Realtime on the `mesas` table via `ALTER PUBLICATION supabase_realtime ADD TABLE mesas`. All INSERT/UPDATE/DELETE events on `mesas` SHALL be broadcast to subscribed clients.

#### Scenario: mesas changes broadcast via Realtime

- GIVEN Realtime is enabled on mesas
- WHEN a mesa row is updated
- THEN subscribed clients receive the `postgres_changes` payload within 1s

### Requirement: SCH-010 — Dual Occupancy Config Fields

The system MUST add two columns to `configuracion`:

| Column | Type | Default |
|--------|------|---------|
| `modo_ocupacion` | text | 'auto', CHECK IN ('auto','manual') |
| `ocupacion_manual` | int | NULL, CHECK ≥0 |

`modo_ocupacion='auto'` means aforo is calculated from mesas. `modo_ocupacion='manual'` means `ocupacion_manual` overrides the calculation.

#### Scenario: Default modo_ocupacion is auto

- GIVEN migration applied with seed configuracion row
- WHEN querying configuracion.modo_ocupacion
- THEN value is 'auto'
- AND ocupacion_manual is NULL

## Edge Cases

- **Migration re-run**: use `IF NOT EXISTS` for tables; idempotent seed with `ON CONFLICT DO NOTHING`
- **Empty seed**: if seed data is empty, no rows inserted (no error)
- **Down migration**: revert scripts stored in `shared/db/revert/`
- **mesas self-ref FK**: `ON DELETE SET NULL` preserves orphaned tables on parent delete (matching unfusion restore semantics)
- **Realtime reconnection**: full refetch on WebSocket reconnect to prevent stale state
