# Delta for panel-schema

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: SCH-006 — mesas Table (zona CHECK constraint)

The system MUST create the `mesas` table with RLS enabled:

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| numero_mesa | int | NOT NULL |
| capacidad_base | int | NOT NULL, CHECK ≥1 |
| posicion_x | float | NOT NULL, DEFAULT 0 |
| posicion_y | float | NOT NULL, DEFAULT 0 |
| ancho | float | NOT NULL, DEFAULT 100 |
| alto | float | NOT NULL, DEFAULT 100 |
| rotacion | float | NOT NULL, DEFAULT 0 |
| zona | text | NOT NULL, CHECK IN (current zonas_config.nombre values) |
| mesa_padre_id | uuid | FK→mesas(id) ON DELETE SET NULL, nullable |
| id_fusion | uuid | nullable |
| capacidad_actual | int | NOT NULL, DEFAULT capacidad_base |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

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
