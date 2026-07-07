# dias-bloqueados Specification

## Purpose

Management of blocked/closed days where reservations are not accepted. Supports individual date blocks and recurring weekly patterns (e.g., "closed every Monday"). Stored in a dedicated table with CRUD operations via API. Used server-side to reject reservations on blocked dates.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| BLO-001 | Create `dias_bloqueados` table: id (uuid PK), fecha (date NOT NULL), recurrente (bool DEFAULT false), motivo (text nullable), created_at (timestamptz). RLS enabled; admin-only write, service role bypass. | MUST |
| BLO-002 | Recurrence logic: `recurrente=true` blocks that same calendar day EVERY year (MM-DD matching), NOT weekly day-of-week. Computed in query — single row represents infinite annual recurrence. | MUST |
| BLO-003 | Reservation validation MUST reject any `fecha_hora` whose date falls on a blocked day (individual or recurrent). Server-side check in POST /api/reservas. | MUST |
| BLO-004 | Admin CRUD: GET/POST/DELETE `/api/dias-bloqueados`. POST validates fecha is not in the past. DELETE removes the specific row. Rows with `recurrente=true` show "Recurrente" badge in admin UI. | MUST |

### Requirement: BLO-001 — dias_bloqueados Table

The system MUST create `dias_bloqueados` via migration:

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| fecha | date | NOT NULL |
| recurrente | boolean | DEFAULT false |
| motivo | text | nullable |
| created_at | timestamptz | DEFAULT now() |

RLS: anon no access; authenticated with `can_write('configuracion')` MAY INSERT/DELETE (admin only). Service role bypasses RLS for server-side API.

#### Scenario: Table exists after migration

- GIVEN migration applied
- WHEN querying information_schema.tables
- THEN dias_bloqueados table exists with 5 columns
- AND RLS enabled

#### Scenario: Admin inserts blocked day

- GIVEN admin authenticated
- WHEN INSERT INTO dias_bloqueados (fecha, recurrente, motivo)
- THEN row created successfully

#### Scenario: Anon blocked from reading

- GIVEN RLS enabled
- WHEN unauthenticated request SELECTs from dias_bloqueados
- THEN operation rejected

### Requirement: BLO-002 — Recurrence

`recurrente=true` blocks the same MM-DD date EVERY year. Query computes: `fecha = CURRENT_DATE OR (recurrente=true AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM fecha) = EXTRACT(DAY FROM CURRENT_DATE))`. A SINGLE row represents infinite annual recurrence — no row-per-year needed.

#### Scenario: Recurring Christmas blocks all years

- GIVEN dias_bloqueados row: fecha='2026-12-25', recurrente=true
- WHEN checking if '2027-12-25' is blocked
- THEN blocked=true (MM-DD matches)

#### Scenario: Individual date only blocks that year

- GIVEN row: fecha='2026-07-15', recurrente=false
- WHEN checking '2027-07-15'
- THEN NOT blocked (one-time date)

### Requirement: BLO-003 — Reservation Validation

POST /api/reservas MUST check `fecha_hora` date against `dias_bloqueados` (individual + recurring) BEFORE creating reservation. If blocked: 409 Conflict `{ error: "Fecha no disponible", motivo: "..." }`. Check uses same query as BLO-002.

#### Scenario: Reservation on blocked date rejected

- GIVEN '2026-12-25' is blocked (recurrente)
- WHEN POST /api/reservas with fecha_hora='2026-12-25T14:00:00'
- THEN 409 "Fecha no disponible"
- AND motivo from blocked row included in response

#### Scenario: Reservation on open date succeeds

- GIVEN '2026-07-15' has no blocked entry
- WHEN POST /api/reservas with fecha_hora='2026-07-15T14:00:00'
- THEN reservation proceeds normally (subject to other validations)

### Requirement: BLO-004 — Admin CRUD

GET /api/dias-bloqueados returns all rows ordered by fecha ASC. POST accepts `{ fecha, recurrente, motivo }` — validates fecha not in past. DELETE /api/dias-bloqueados/[id] removes row. Admin-only access.

#### Scenario: List blocked days

- GIVEN 3 blocked rows exist
- WHEN GET /api/dias-bloqueados
- THEN 3 rows returned ordered by fecha

#### Scenario: Block past date rejected

- GIVEN today is 2026-07-07
- WHEN POST /api/dias-bloqueados { fecha: "2026-07-01", recurrente: false }
- THEN 400 "No se pueden bloquear fechas pasadas"

#### Scenario: Delete blocked day

- GIVEN blocked row id exists
- WHEN DELETE /api/dias-bloqueados/[id]
- THEN row deleted; reservations for that date now allowed
