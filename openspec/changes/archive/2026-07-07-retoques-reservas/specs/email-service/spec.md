# email-service Specification

## Purpose
SMTP-based email sending for reservation confirmations, with write-only password protection and port-based TLS detection. Configurable from admin panel.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| EM-001 | SMTP config stored in `configuracion`: smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_password | MUST |
| EM-002 | Port-based TLS: 465→SSL, 587→STARTTLS, else plain/no encryption | MUST |
| EM-003 | smtp_password NEVER returned to client. Server-only reads via environment variable `NUXT_SMTP_PASSWORD` (priority) or DB. | MUST |
| EM-004 | `NUXT_SMTP_PASSWORD` env var overrides DB password. If neither exists, email service disabled with warning. | MUST |
| EM-005 | Confirmation email: send on reservation confirmed (subject: "Confirmación de reserva — La Zíngara", HTML body with date/time/guests). Sender: smtp_from_email. | MUST |
| EM-006 | Test endpoint: POST /api/cocina/smtp/test sends test email to smtp_from_email. Admin-only. | MUST |

### Requirement: EM-001 — SMTP Configuration

`configuracion` MUST include: `smtp_host` (text, nullable), `smtp_port` (integer, nullable, 1-65535), `smtp_user` (text, nullable), `smtp_from_email` (text, nullable), `smtp_password` (text, nullable). All nullable — email disabled when host or password is NULL.

#### Scenario: SMTP fields nullable
- GIVEN new configuracion row without SMTP migration
- WHEN querying configuracion
- THEN smtp_host is NULL
- AND email service is disabled (no-op send)

### Requirement: EM-002 — TLS Detection

Port 465 MUST use implicit SSL (connect with `tls` option). Port 587 MUST use STARTTLS (connect plain, then upgrade). Other ports: attempt STARTTLS, fall back to plain if server doesn't support it.

#### Scenario: Port 465 uses SSL
- GIVEN smtp_port=465
- WHEN sending email
- THEN connection established with direct TLS (`secure: true`)

#### Scenario: Port 587 uses STARTTLS
- GIVEN smtp_port=587
- WHEN sending email
- THEN plain connection, upgraded to TLS via STARTTLS command

### Requirement: EM-003 — Password Protection

`smtp_password` MUST never appear in GET /api/config responses, client-side code, or browser network requests. Only read server-side via `serverSupabaseServiceRole` or `useRuntimeConfig()`. Admin form shows placeholder dots on load.

#### Scenario: Password excluded from API response
- GIVEN smtp_password='secret' in DB
- WHEN GET /api/config
- THEN response includes smtp_host, smtp_port, etc.
- AND smtp_password absent from response body

### Requirement: EM-004 — Env Var Override

`NUXT_SMTP_PASSWORD` runtime config SHALL override DB smtp_password. If both NULL/empty, `sendEmail()` SHALL return `{ success: false }` without throwing. Server log: "Email disabled: no SMTP password configured."

#### Scenario: Env var overrides DB
- GIVEN NUXT_SMTP_PASSWORD='env-secret', DB smtp_password='db-secret'
- WHEN sendEmail() called
- THEN 'env-secret' used as SMTP password

### Requirement: EM-005 — Confirmation Email

When reserva confirmed (estado='confirmada'), system MUST send email to cliente.email. Subject: "Confirmación de reserva — La Zíngara". Body (HTML): "Hola {nombre}, tu reserva para {num} personas el {fecha} a las {hora} está confirmada." From: smtp_from_email. Failure to send MUST NOT rollback reservation (fire-and-forget).

#### Scenario: Email sent on confirmation
- GIVEN SMTP configured, reserva confirmada
- WHEN reservation state transitions to 'confirmada'
- THEN email sent to cliente.email
- AND email failure logs warning but does not undo reservation

### Requirement: EM-006 — Test Email

POST /api/cocina/smtp/test MUST accept `{ host, port, user, password, from_email }` (password from form), attempt to send a test email to `from_email`, and return `{ success: boolean, message: string }`. Admin-only (auth+permissions middleware).

#### Scenario: Test email succeeds
- GIVEN admin with valid SMTP config
- WHEN POST /api/cocina/smtp/test with correct creds
- THEN test email delivered; response `{ success: true }`

#### Scenario: Test email auth failure
- GIVEN wrong password
- WHEN POST /api/cocina/smtp/test
- THEN response `{ success: false, message: "Error de autenticación SMTP" }`
