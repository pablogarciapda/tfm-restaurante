# panel-schema Specification

## Purpose

Database migration creating 10 tables with full RLS policies, the profiles auto-creation trigger, and seed data from existing mock fixtures. Applied via Supabase MCP `apply_migration`.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| SCH-001 | 10-table migration: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas, mesas, clientes, dias_bloqueados | MUST |
| SCH-002 | RLS policies on ALL tables — anon: read public tables; admin: full; editor: per jsonb. mesas: authenticated with `can_write('reservas')` MAY write; anon has no access | MUST |
| SCH-003 | Seed data: insert existing mock fixture data into platos, eventos, menu_diario_config, menu_diario_items | MUST |
| SCH-004 | `auth.users` INSERT trigger → auto-create profiles row (role=editor, default permissions) | MUST |
| SCH-005 | Row-level `can_write(resource)` function called by all RLS policies | MUST |
| SCH-006 | mesas table (14 cols): self-ref FK `mesa_padre_id→mesas(id) ON DELETE SET NULL`, CHECK zona dynamic from zonas_config, RLS + Realtime publication | MUST |
| SCH-007 | reservas.estado CHECK constraint includes 'standby' for unfused reservations awaiting reassignment | MUST |
| SCH-008 | FK reservas.mesa_id → mesas.id (nullable — standby reservations have no mesa) | MUST |
| SCH-009 | Realtime publication on mesas via `ALTER PUBLICATION supabase_realtime ADD TABLE mesas` | MUST |
| SCH-010 | Dual occupancy config: configuracion.modo_ocupacion ('auto'/'manual') + ocupacion_manual (int, ≥0) | MUST |
| SCH-011 | New `clientes` table: id (uuid PK), nombre (text NOT NULL), telefono (text UNIQUE NOT NULL), email (text), created_at, updated_at. RLS enabled. | MUST |
| SCH-012 | New configuracion columns: smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_password (all text/int nullable), texto_proteccion_datos (text), modo_reserva (text DEFAULT 'automatica', CHECK IN ('automatica','verificada')) | MUST |
| SCH-013 | Alter reservas: ADD cliente_id (uuid FK→clientes.id ON DELETE SET NULL, nullable), DROP nombre_cliente, DROP telefono, DROP email | MUST |
| SCH-014 | RLS on clientes: anon NO access; authenticated with can_write('clientes') MAY select/insert/update; service role bypasses | MUST |
| SCH-015 | New `dias_bloqueados` table: id (uuid PK), fecha (date NOT NULL), recurrente (bool DEFAULT false), motivo (text nullable), created_at (timestamptz). RLS: admin-only write, service role bypass. | MUST |
| SCH-016 | New configuracion columns: horarios_config (jsonb, default lunch/dinner schedule), zonas_config (jsonb, default 5 zones), cliente_elige_zona (text DEFAULT 'none', CHECK IN ('none','zona','zona_mesa')). capacidad_total_local default 80→264. | MUST |
| SCH-017 | New reservas column: zona (text, nullable). Stored by zone name at reservation time. No FK (zone names are editable). | MUST |

### Requirement: SCH-001 — 10-Table Migration

The system MUST create these tables via migration:

| Table | Key Columns |
|-------|-------------|
| `profiles` | id (uuid PK FK→auth.users), role (text), permissions (jsonb) |
| `platos` | id, nombre, descripcion, precio (numeric), categoria, tipo_menu, imagen_url, disponible (bool), calorias (int), alergenos (text[]) |
| `eventos` | id, titulo, descripcion, fecha (date), categoria, imagen_url, activo (bool) |
| `menu_diario_config` | id, dia_semana (int 0-6), activo (bool), precio (numeric) |
| `menu_diario_items` | id, config_id (FK), seccion (text), nombre, descripcion |
| `configuracion` | id, cliente_elige_mesa (bool), capacidad_total_local (int), modo_ocupacion (text), ocupacion_manual (int) |
| `reservas` | id, cliente_id (FK→clientes.id), fecha_hora (timestamptz), numero_comensales, estado (text CHECK IN pendiente,confirmada,cancelada,completada,standby), mesa_id (FK→mesas.id, nullable), zona (text, nullable) |
| `mesas` | id, numero_mesa, capacidad_base, posicion_x/y, ancho, alto, rotacion, zona (CHECK from zonas_config), mesa_padre_id (self-ref FK), id_fusion, capacidad_actual, created_at, updated_at |
| `clientes` | id (uuid PK), nombre (text NOT NULL), telefono (text UNIQUE NOT NULL), email (text), created_at, updated_at |
| `dias_bloqueados` | id (uuid PK), fecha (date NOT NULL), recurrente (bool DEFAULT false), motivo (text nullable), created_at (timestamptz DEFAULT now()) |

(Previously: 9 tables — now 10 tables with `dias_bloqueados` added.)

#### Scenario: All 10 tables exist after migration

- GIVEN migration applied
- WHEN querying information_schema.tables WHERE table_schema='public'
- THEN all 10 tables (profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas, mesas, clientes, dias_bloqueados) exist

#### Scenario: Migration applies without error

- GIVEN a Supabase project with auth schema
- WHEN the Phase 3 migration SQL is applied
- THEN all 10 tables exist with correct columns and foreign keys
- AND `reservas.estado` accepts 'standby'
- AND `reservas.mesa_id` FK references `mesas.id`
- AND `reservas.cliente_id` FK references `clientes.id`
- AND `reservas.zona` column is text nullable
- AND Realtime publication includes `mesas`

### Requirement: SCH-002 — RLS Policies

The system MUST enable RLS on all 10 tables. Anon role SHALL read `platos`, `eventos`, `menu_diario_config`, `menu_diario_items`. Authenticated role: admin=all, editor=per jsonb via `can_write()`. Service role bypasses RLS. **mesas RLS**: authenticated with `can_write('reservas')` MAY write; anon has no access. **dias_bloqueados RLS**: anon no access; authenticated with `can_write('configuracion')` MAY INSERT/DELETE; service role bypass.

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

#### Scenario: Anon blocked from dias_bloqueados

- GIVEN RLS enabled on `dias_bloqueados`
- WHEN unauthenticated SELECT from `dias_bloqueados`
- THEN operation rejected

### Requirement: SCH-003 — Seed Data

The system MUST seed initial data from existing mock fixtures: insert `shared/fixtures/carta-mock.ts` platos into `platos`, `shared/fixtures/menu-diario-mock.ts` into `menu_diario_config` + `menu_diario_items`, `shared/fixtures/eventos-mock.ts` into `eventos`. Configuracion seeds with `cliente_elige_mesa=false`, `capacidad_total_local=264`, `modo_ocupacion='auto'`, `ocupacion_manual=NULL`, `horarios_config` default schedule, `zonas_config` 5 default zones, `cliente_elige_zona='none'`.

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
| `zona` | text | NOT NULL, CHECK IN (current zonas_config.nombre values) |
| `mesa_padre_id` | uuid | FK→mesas(id) ON DELETE SET NULL, nullable |
| `id_fusion` | uuid | nullable |
| `capacidad_actual` | int | NOT NULL, DEFAULT capacidad_base |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now() |

(Previously: CHECK IN ('Principal','Zingaro','Privado','Terraza','Bar'))

RLS policy: authenticated users with `can_write('reservas')` MAY INSERT/UPDATE/DELETE. Anon: no access.

#### Scenario: mesas table exists after migration

- GIVEN the Phase 3 migration is applied
- WHEN querying `information_schema.tables`
- THEN `mesas` table exists with all 14 columns and correct types

#### Scenario: RLS blocks anon on mesas

- GIVEN RLS is enabled on `mesas`
- WHEN an unauthenticated request SELECTs from `mesas`
- THEN the operation is rejected

#### Scenario: New zone names accepted

- GIVEN zonas_config has zone "Reservado" replacing "Privado"
- WHEN inserting mesa with zona='Reservado'
- THEN INSERT succeeds
- AND zone='Privado' rejected by CHECK constraint

#### Scenario: Privado rows migrated to Reservado

- GIVEN existing mesas rows with zona='Privado'
- WHEN migration applied (UPDATE mesas SET zona='Reservado' WHERE zona='Privado')
- THEN all rows now have zona='Reservado'
- AND CHECK constraint updated to accept 'Reservado', reject 'Privado'

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

### Requirement: SCH-011 — clientes Table

The system MUST create `clientes` table via migration:
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| nombre | text | NOT NULL |
| telefono | text | UNIQUE, NOT NULL |
| email | text | nullable |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

RLS MUST be enabled. Anon role: no access. Authenticated with `can_write('clientes')`: full CRUD.

#### Scenario: Migration applied
- GIVEN retoques-reservas migration SQL
- WHEN applied to Supabase
- THEN `clientes` table exists with all 6 columns
- AND UNIQUE constraint on telefono
- AND RLS enabled

### Requirement: SCH-012 — configuracion New Columns

Migration MUST ADD 7 columns to `configuracion`:
| Column | Type | Default/Check |
|--------|------|---------------|
| smtp_host | text | nullable |
| smtp_port | integer | nullable, CHECK 1-65535 |
| smtp_user | text | nullable |
| smtp_from_email | text | nullable |
| smtp_password | text | nullable |
| texto_proteccion_datos | text | nullable |
| modo_reserva | text | DEFAULT 'automatica', CHECK IN ('automatica','verificada') |

Existing config row MUST have modo_reserva DEFAULT set to 'automatica'.

#### Scenario: Columns added to existing table
- GIVEN configuracion table with 16 columns
- WHEN migration applied
- THEN table has 25 columns (23 original + 3 from SCH-016)
- AND existing row has modo_reserva='automatica'
- AND SMTP columns are NULL

### Requirement: SCH-013 — reservas Migration

Migration MUST: ALTER reservas ADD cliente_id (uuid, FK→clientes.id ON DELETE SET NULL, nullable), THEN drop columns: nombre_cliente, telefono, email. Old data MUST be migrated before column drops (see CLI-005 in clientes-model spec).

#### Scenario: New column structure verified
- GIVEN migration applied and data migrated
- WHEN querying reservas table columns
- THEN cliente_id column exists as FK
- AND zona column exists as text nullable
- AND nombre_cliente, telefono, email columns do NOT exist

### Requirement: SCH-014 — clientes RLS

RLS policy on clientes: anon (no access), authenticated with `can_write('clientes')=true` MAY SELECT/INSERT/UPDATE, service role full access. `can_write()` function MUST check `permissions->>'clientes'` for editors.

#### Scenario: Admin can write clientes
- GIVEN admin authenticated
- WHEN INSERT into clientes
- THEN can_write('clientes') returns true (role='admin' bypass)

#### Scenario: Editor without perm blocked
- GIVEN editor with permissions.clientes=false
- WHEN INSERT into clientes
- THEN can_write('clientes') returns false; INSERT rejected

### Requirement: SCH-015 — dias_bloqueados Table

The system MUST create `dias_bloqueados` via migration: id (uuid PK DEFAULT gen_random_uuid()), fecha (date NOT NULL), recurrente (boolean DEFAULT false), motivo (text nullable), created_at (timestamptz DEFAULT now()). RLS: anon no access; authenticated with `can_write('configuracion')` MAY INSERT/DELETE; service role bypass.

#### Scenario: Table created with all columns

- GIVEN migration applied
- WHEN querying information_schema.columns WHERE table_name='dias_bloqueados'
- THEN 5 columns present: id, fecha, recurrente, motivo, created_at

#### Scenario: RLS blocks anon

- GIVEN RLS enabled on dias_bloqueados
- WHEN unauthenticated SELECT
- THEN operation rejected

### Requirement: SCH-016 — New configuracion Columns

Migration MUST ADD 3 columns to `configuracion`:

| Column | Type | Default |
|--------|------|---------|
| horarios_config | jsonb | `{"comida_inicio":"13:30","comida_fin":"15:30","cena_inicio":"21:00","cena_fin":"23:30","intervalo_minutos":15}` |
| zonas_config | jsonb | `[{"id":"principal","nombre":"Principal","capacidad":70,"enabled":true},{"id":"reservado","nombre":"Reservado","capacidad":14,"enabled":true},{"id":"zingaro","nombre":"Zíngaro","capacidad":60,"enabled":true},{"id":"terraza","nombre":"Terraza","capacidad":100,"enabled":true},{"id":"bar","nombre":"Bar","capacidad":20,"enabled":true}]` |
| cliente_elige_zona | text | `'none'`, CHECK IN ('none','zona','zona_mesa') |

Existing config row MUST be updated with defaults. `capacidad_total_local` default MUST be updated from 80 to 264 (sum of default zone capacities).

#### Scenario: Columns added with defaults

- GIVEN configuracion table with 22 columns
- WHEN migration applied
- THEN table has 25 columns
- AND existing row has horarios_config and zonas_config set to defaults
- AND cliente_elige_zona='none'
- AND capacidad_total_local default is 264

### Requirement: SCH-017 — reservas.zona Column

Migration MUST ADD `zona` TEXT nullable column to `reservas`. No FK constraint (zone names are editable; stored by name from zonas_config at reservation time). Column is nullable — existing reservations have zona=NULL.

#### Scenario: zona column exists

- GIVEN migration applied
- WHEN querying reservas columns
- THEN zona (text, nullable) column present
- AND existing rows have zona=NULL

## Edge Cases

- **Migration re-run**: use `IF NOT EXISTS` for tables; idempotent seed with `ON CONFLICT DO NOTHING`
- **Empty seed**: if seed data is empty, no rows inserted (no error)
- **Down migration**: revert scripts stored in `shared/db/revert/`
- **mesas self-ref FK**: `ON DELETE SET NULL` preserves orphaned tables on parent delete (matching unfusion restore semantics)
- **Realtime reconnection**: full refetch on WebSocket reconnect to prevent stale state
- **Zonas CHECK constraint sync**: when zones are renamed in zonas_config, the mesas.zona CHECK constraint must be updated atomically; existing mesas rows renamed via UPDATE
- **Días bloqueados RLS**: public endpoint GET /api/dias-bloqueados uses service role to bypass RLS for read access
