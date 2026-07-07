# api-config Specification

## Purpose
Server-side configuration endpoints that protect sensitive fields (smtp_password). Replaces direct Supabase client access for the configuracion page.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| ACF-001 | GET /api/config returns all configuracion fields EXCEPT smtp_password. Admin-only (auth cookie). | MUST |
| ACF-002 | POST /api/config upserts the single configuracion row. smtp_password accepted write-only (empty/placeholder values ignored). Admin-only. | MUST |
| ACF-003 | POST /api/config accepts auth-only via `requireUserSession` or equivalent. Returns 401 unauthenticated. | MUST |

### Requirement: ACF-001 — GET /api/config

GET /api/config MUST: verify authenticated user, SELECT `*` from `configuracion` (single row) using `serverSupabaseServiceRole` to bypass RLS, EXCLUDE `smtp_password` from response. If no row exists, return empty object `{}`. Response: `200 { cliente_elige_mesa, capacidad_total_local, ..., smtp_host, ... }` (all fields except smtp_password).

#### Scenario: Authenticated admin reads config
- GIVEN admin session cookie
- WHEN GET /api/config
- THEN 200 with all config fields
- AND smtp_password NOT present in response

#### Scenario: Unauthenticated request rejected
- GIVEN no auth cookie
- WHEN GET /api/config
- THEN 401 "Unauthorized"

#### Scenario: No config row exists
- GIVEN configuracion table is empty
- WHEN GET /api/config
- THEN 200 with empty object `{}`

### Requirement: ACF-002 — POST /api/config

POST /api/config MUST: verify auth, accept partial config body, UPSERT `configuracion` row. If body includes `smtp_password=== ""` or `"••••••••"`, exclude it from upsert (preserve existing). All other fields upsert directly. Returns updated config (minus password). Response: `200 { ...fields }`.

#### Scenario: Update non-sensitive fields
- GIVEN config row exists with capacidad_total_local=80
- WHEN POST /api/config { capacidad_total_local: 100, cliente_elige_mesa: true }
- THEN config updated; 200 with updated values
- AND smtp_password unchanged

#### Scenario: Password placeholder ignored
- GIVEN stored smtp_password='secret'
- WHEN POST /api/config { smtp_password: "" } or { smtp_password: "••••••••" }
- THEN smtp_password remains 'secret'
- AND other fields updated normally

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
