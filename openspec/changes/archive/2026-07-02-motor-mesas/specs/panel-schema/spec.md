# Delta for panel-schema

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: SCH-001 — 8-Table Migration
(Previously: 7-table migration)

The system MUST create 8 tables via migration (existing 7 + `mesas`), and update `configuracion` with `modo_ocupacion` and `ocupacion_manual` columns. The `reservas.mesa_id` FK MUST reference `mesas.id`. `reservas.estado` CHECK constraint MUST include `'standby'`.

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

#### Scenario: Migration applies without error (updated)

- GIVEN a Supabase project with auth schema
- WHEN the Phase 3 migration SQL is applied
- THEN all 8 tables exist with correct columns and foreign keys
- AND `reservas.estado` accepts 'standby'
- AND `reservas.mesa_id` FK references `mesas.id`
- AND Realtime publication includes `mesas`

### Requirement: SCH-002 — RLS Policies
(Previously: RLS on 7 tables)

The system MUST enable RLS on all 8 tables. Anon role SHALL read `platos`, `eventos`, `menu_diario_config`, `menu_diario_items`. Authenticated role: admin=all, editor=per jsonb via `can_write()`. Service role bypasses RLS. **New**: `mesas` RLS: authenticated with `can_write('reservas')` MAY write; anon has no access.

#### Scenario: Editor with reservas permission can write mesas

- GIVEN editor has `permissions->>'reservas' = true`
- WHEN editor INSERTs into `mesas`
- THEN operation succeeds

#### Scenario: Anon blocked from mesas

- GIVEN RLS is enabled on `mesas`
- WHEN unauthenticated request SELECTs from `mesas`
- THEN operation is rejected
