# clientes-model Specification

## Purpose
Customer tracking with a `clientes` table, linked to `reservas` via FK. Enables repeat-customer recognition, reservation history, and deduplication by phone.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CLI-001 | `clientes` table: id (uuid PK), nombre (text NOT NULL), telefono (text UNIQUE NOT NULL), email (text, nullable), created_at, updated_at (timestamptz) | MUST |
| CLI-002 | `reservas` modified: ADD cliente_id (uuid FK→clientes.id, nullable), DROP nombre_cliente/telefono/email | MUST |
| CLI-003 | Dedup on reservation: SELECT by phone → reuse existing cliente; else INSERT new | MUST |
| CLI-004 | RLS on `clientes`: anon=no access; authenticated with `can_write('clientes')` MAY write; service role bypasses | MUST |
| CLI-005 | Migrate existing reservas rows: extract phone→find/create cliente→set cliente_id | MUST |

### Requirement: CLI-001 — clientes Table

The system MUST create a `clientes` table with columns: `id` (uuid PK, DEFAULT gen_random_uuid()), `nombre` (text NOT NULL), `telefono` (text UNIQUE NOT NULL), `email` (text, nullable), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now()). RLS MUST be enabled.

#### Scenario: Insert new cliente
- GIVEN no existing cliente with telefono="600000000"
- WHEN INSERT clientes (nombre="Ana", telefono="600000000", email="ana@test.com")
- THEN row created with auto-generated id
- AND updated_at equals created_at

#### Scenario: Duplicate phone rejected
- GIVEN existing cliente with telefono="600000000"
- WHEN INSERT clientes (nombre="Another", telefono="600000000")
- THEN UNIQUE constraint violation; INSERT rejected

### Requirement: CLI-002 — reservas Migration

The system MUST ALTER `reservas`: ADD `cliente_id` column (uuid, FK→clientes.id ON DELETE SET NULL), DROP columns `nombre_cliente`, `telefono`, `email`. Foreign key MUST be nullable (standby reservations have no cliente).

#### Scenario: New reserva references cliente
- GIVEN cliente with id="abc-123"
- WHEN INSERT reservas (cliente_id="abc-123", fecha_hora=..., numero_comensales=4, estado='pendiente')
- THEN reserva created with FK linking to cliente
- AND nombre_cliente/telefono/email columns no longer exist

#### Scenario: Null cliente_id allowed
- GIVEN a standby reservation
- WHEN INSERT reservas (cliente_id=NULL, estado='standby')
- THEN INSERT succeeds

### Requirement: CLI-003 — Dedup on Reservation

POST /api/reservas MUST: normalize phone (strip spaces, ensure Spanish prefix), SELECT `clientes` WHERE telefono matches → if found reuse id, else INSERT new cliente. Same phone always maps to same cliente row.

#### Scenario: Existing phone reuses cliente
- GIVEN cliente "Juan" with telefono="+34600000001"
- WHEN reservation submitted with same phone but different name
- THEN existing cliente row used (id referenced in reserva.cliente_id)
- AND cliente.nombre NOT overwritten (original name preserved)

#### Scenario: New phone creates cliente
- GIVEN no cliente with telefono="+34600000002"
- WHEN reservation submitted
- THEN new cliente row INSERTed with nombre, telefono, email from form

### Requirement: CLI-004 — clientes RLS

Anon MUST NOT access `clientes`. Authenticated users with `can_write('clientes')` MAY SELECT/INSERT/UPDATE. Service role bypasses RLS.

#### Scenario: Anon blocked from clientes
- GIVEN RLS enabled
- WHEN unauthenticated SELECT from clientes
- THEN request rejected (empty result or error)

### Requirement: CLI-005 — Data Migration

A migration script MUST: for each reservas row with `nombre_cliente NOT NULL AND telefono NOT NULL`, find or create a `clientes` row by phone, then SET `reservas.cliente_id`. Duplicate phones map to first-created cliente.

#### Scenario: Migration preserves references
- GIVEN 3 reservas all with telefono="+34600000003"
- WHEN migration runs
- THEN single cliente row created for that phone
- AND all 3 reservas reference that same cliente_id
