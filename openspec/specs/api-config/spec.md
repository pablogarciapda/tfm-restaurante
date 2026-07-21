# api-config Specification

## Purpose
Server-side configuration endpoints that protect sensitive fields (smtp_password). Replaces direct Supabase client access for the configuracion page. Includes REST API for blocked days management, reservation zone/mesa reassignment, and JSONB validation for service hours and zones configuration.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| ACF-001 | GET /api/config returns all configuracion fields EXCEPT smtp_password. Includes horarios_config, zonas_config. Admin-only (auth cookie). | MUST |
| ACF-002 | POST /api/config upserts the single configuracion row. Accepts horarios_config, zonas_config. Validates JSONB via Zod. smtp_password accepted write-only (empty/placeholder values ignored). Admin-only. | MUST |
| ACF-003 | POST /api/config accepts auth-only via `requireUserSession` or equivalent. Returns 401 unauthenticated. | MUST |
| ACF-004 | GET/POST/DELETE /api/dias-bloqueados CRUD. Admin-only, service role DB access. POST validates fecha not in past. | MUST |
| ACF-005 | PATCH /api/reservas/[id]/mesa. Accepts { zona?, mesa_id? }, validates zona against zonas_config and mesa FK + zone membership. Admin-only with can_write('reservas'). | MUST |
| ACF-006 | Zod schemas for horarios_config and zonas_config validation on POST /api/config. 5 keys, HH:MM regex, intervalo divisor of 60. | MUST |

### Requirement: ACF-001 — GET /api/config

GET /api/config MUST: verify authenticated user, SELECT `*` from `configuracion` (single row) using `serverSupabaseServiceRole` to bypass RLS, EXCLUDE `smtp_password` from response. If no row exists, return empty object `{}`. Response includes ALL configuracion fields including: `horarios_config`, `zonas_config`.

(Previously: returned 22 fields without horarios_config, zonas_config)

#### Scenario: Authenticated admin reads config
- GIVEN admin session cookie
- WHEN GET /api/config
- THEN 200 with all config fields including horarios_config, zonas_config
- AND smtp_password NOT present in response

#### Scenario: New fields have default values

- GIVEN migration applied with defaults
- WHEN GET /api/config
- THEN horarios_config = { comida_inicio:"13:30", ... }
- AND zonas_config = [ 5 zones ]

#### Scenario: Unauthenticated request rejected
- GIVEN no auth cookie
- WHEN GET /api/config
- THEN 401 "Unauthorized"

#### Scenario: No config row exists
- GIVEN configuracion table is empty
- WHEN GET /api/config
- THEN 200 with empty object `{}`

### Requirement: ACF-002 — POST /api/config

POST /api/config MUST: verify auth, accept partial config body including new fields `horarios_config` (JSONB), `zonas_config` (JSONB). Validate JSONB fields via Zod schemas (ACF-006). UPSERT `configuracion` row. If body includes `smtp_password=== ""` or `"••••••••"`, exclude it from upsert (preserve existing). Returns updated config (minus password). Response: `200 { ...fields }`.

(Previously: did not accept horarios_config, zonas_config fields)

#### Scenario: Update non-sensitive fields
- GIVEN config row exists with capacidad_total_local=80
- WHEN POST /api/config { capacidad_total_local: 100, cliente_elige_mesa: true }
- THEN config updated; 200 with updated values
- AND smtp_password unchanged

#### Scenario: Update horarios and zonas together

- GIVEN existing config row
- WHEN POST /api/config { horarios_config: { ...updated }, zonas_config: [ ...updated ] }
- THEN both JSONB fields updated
- AND 200 with updated config

#### Scenario: Password placeholder ignored
- GIVEN stored smtp_password='secret'
- WHEN POST /api/config { smtp_password: "" } or { smtp_password: "••••••••" }
- THEN smtp_password remains 'secret'
- AND other fields (including new) updated normally

#### Scenario: Password explicitly set
- GIVEN stored smtp_password='old-secret'
- WHEN POST /api/config { smtp_password: "new-secret" }
- THEN smtp_password updated to 'new-secret'

### Requirement: ACF-003 — Auth Enforcement

POST /api/config MUST return 401 for unauthenticated requests. POST /api/config MUST NOT allow non-admin users (403 Forbidden if editor role without configuracion permission).

#### Scenario: Editor without permission blocked
- GIVEN editor with configuracion=false
- WHEN POST /api/config
- THEN 403 "No tiene permisos para modificar la configuración"

### Requirement: ACF-004 — dias-bloqueados CRUD Endpoints

System MUST provide 3 endpoints for blocked days management:

**GET /api/dias-bloqueados**: returns all rows ordered by fecha ASC. Admin-only.

**POST /api/dias-bloqueados**: accepts `{ fecha (date), recurrente (bool, default false), motivo (text, optional) }`. Validates fecha not in past. Returns created row. Admin-only.

**DELETE /api/dias-bloqueados/[id]**: deletes row by id. Returns 200 on success, 404 if not found. Admin-only.

All endpoints use `serverSupabaseServiceRole` for DB access (bypass RLS). Auth via session cookie.

#### Scenario: List blocked days

- GIVEN 3 rows in dias_bloqueados
- WHEN GET /api/dias-bloqueados
- THEN 200 with array of 3 rows ordered by fecha ASC

#### Scenario: Create blocked day

- GIVEN valid admin session
- WHEN POST /api/dias-bloqueados { fecha: "2026-12-25", recurrente: true, motivo: "Navidad" }
- THEN 201 with created row
- AND row persisted in DB

#### Scenario: Create past date rejected

- GIVEN today = 2026-07-07
- WHEN POST with fecha: "2026-07-01"
- THEN 400 "No se pueden bloquear fechas pasadas"

#### Scenario: Delete non-existent row

- GIVEN id does not exist
- WHEN DELETE /api/dias-bloqueados/[id]
- THEN 404 "Día bloqueado no encontrado"

#### Scenario: Unauthenticated blocked

- GIVEN no auth cookie
- WHEN any dias-bloqueados endpoint called
- THEN 401 "Unauthorized"

### Requirement: ACF-005 — PATCH /api/reservas/[id]/mesa

PATCH /api/reservas/[id]/mesa MUST: accept `{ zona? (text), mesa_id? (uuid) }`, validate zona exists in zonas_config enabled zones, validate mesa_id references existing mesa in selected zone, update reserva row. Returns updated reserva object. Admin + `can_write('reservas')` required.

#### Scenario: Update zona only

- GIVEN reserva with zona=NULL
- WHEN PATCH /api/reservas/[id]/mesa { zona: "Terraza" }
- THEN reserva.zona updated to "Terraza"
- AND 200 with updated reserva

#### Scenario: Update mesa_id with zone validation

- GIVEN mesa #5 is in "Terraza", reserva has no mesa
- WHEN PATCH { zona: "Terraza", mesa_id: <uuid of mesa #5> }
- THEN reserva.zona and reserva.mesa_id updated
- AND 200 response

#### Scenario: Mesa not in zone rejected

- GIVEN mesa #5 is in "Terraza"
- WHEN PATCH { zona: "Principal", mesa_id: <uuid of mesa #5> }
- THEN 400 "La mesa no pertenece a la zona seleccionada"

#### Scenario: Invalid zona name rejected

- GIVEN zonas_config has no zone called "VIP"
- WHEN PATCH { zona: "VIP" }
- THEN 400 "Zona no válida"

### Requirement: ACF-006 — JSONB Validation (Zod Schemas)

POST /api/config MUST validate `horarios_config` and `zonas_config` with server-side Zod schemas before writing to DB. `horarios_config`: 5 required keys, HH:MM time regex, intervalo ∈ {5,10,15,20,30,60}, comida_inicio < comida_fin, cena_inicio < cena_fin. `zonas_config`: array of { id: string, nombre: non-empty string, capacidad: positive int ≤ 999, enabled: boolean }. Return 400 with field-level errors on validation failure.

#### Scenario: Valid JSONB accepted

- GIVEN horarios_config with all fields valid
- WHEN POST /api/config { horarios_config }
- THEN config updated successfully

#### Scenario: Malformed zonas_config rejected

- GIVEN zonas_config missing "id" field in one entry
- WHEN POST /api/config
- THEN 400 "zonas_config[2].id: Required"

#### Scenario: Interval validation

- GIVEN horarios_config.intervalo_minutos=45
- WHEN POST /api/config
- THEN 400 "intervalo_minutos: Must be one of [5,10,15,20,30,60]"
