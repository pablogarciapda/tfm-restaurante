# Delta for panel-schema

## ADDED Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| SCH-011 | New `clientes` table: id (uuid PK), nombre (text NOT NULL), telefono (text UNIQUE NOT NULL), email (text), created_at, updated_at. RLS enabled. | MUST |
| SCH-012 | New configuracion columns: smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_password (all text/int nullable), texto_proteccion_datos (text), modo_reserva (text DEFAULT 'automatica', CHECK IN ('automatica','verificada')) | MUST |
| SCH-013 | Alter reservas: ADD cliente_id (uuid FK→clientes.id ON DELETE SET NULL, nullable), DROP nombre_cliente, DROP telefono, DROP email | MUST |
| SCH-014 | RLS on clientes: anon NO access; authenticated with can_write('clientes') MAY select/insert/update; service role bypasses | MUST |

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
- THEN table has 23 columns
- AND existing row has modo_reserva='automatica'
- AND SMTP columns are NULL

### Requirement: SCH-013 — reservas Migration

Migration MUST: ALTER reservas ADD cliente_id (uuid, FK→clientes.id ON DELETE SET NULL, nullable), THEN drop columns: nombre_cliente, telefono, email. Old data MUST be migrated before column drops (see CLI-005 in clientes-model spec).

#### Scenario: New column structure verified
- GIVEN migration applied and data migrated
- WHEN querying reservas table columns
- THEN cliente_id column exists as FK
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

## MODIFIED Requirements

### Requirement: SCH-001 — 8-Table Migration

The system MUST now include 9 tables. Add `clientes` to the table list (see SCH-011). All other table definitions unchanged.

(Previously: 8 tables: profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas, mesas. Now: +clientes = 9 tables.)

#### Scenario: All 9 tables exist after migration
- GIVEN migration applied
- WHEN querying information_schema.tables WHERE table_schema='public'
- THEN all 9 tables (profiles, platos, eventos, menu_diario_config, menu_diario_items, configuracion, reservas, mesas, clientes) exist
