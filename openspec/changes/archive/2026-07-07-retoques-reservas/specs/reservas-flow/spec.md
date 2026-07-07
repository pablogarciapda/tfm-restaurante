# Delta for reservas-flow

## ADDED Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| RF-006 | GDPR consent modal: scrollable popup after form submit, before SMS. Text from `configuracion.texto_proteccion_datos`. Accept enabled only at scroll-end. Reject returns to form preserving all data. | MUST |
| RF-007 | Real POST /api/reservas: creates cliente (dedup by phone) → creates reserva (cliente_id FK) → modo_reserva branching (automatica→confirmada, verificada→pendiente) → email on confirm | MUST |
| RF-008 | modo_reserva integration: read `configuracion.modo_reserva` server-side. Automatica sets estado='confirmada' + sends email. Verificada sets estado='pendiente' for operator confirmation. | MUST |

### Requirement: RF-006 — GDPR Consent Modal

After form validation succeeds (step 1→step 2 transition), the system MUST display a scrollable modal overlay containing `configuracion.texto_proteccion_datos`. The "Aceptar" button MUST remain disabled (`aria-disabled`) until the user scrolls to the bottom. "Rechazar" MUST close the modal and return to the form with ALL field data intact. If `texto_proteccion_datos` is NULL, the GDPR step SHALL be skipped (direct to SMS).

#### Scenario: Accept at scroll end
- GIVEN form validated, modal shown
- WHEN user scrolls to bottom of protection text
- THEN "Aceptar" button enables
- WHEN clicked → proceeds to SMS step (send code)

#### Scenario: Reject returns to form
- GIVEN modal shown with form data populated
- WHEN user clicks "Rechazar"
- THEN modal closes, form step shown with ALL fields still filled
- AND no data sent to server

#### Scenario: Missing GDPR text skips step
- GIVEN texto_proteccion_datos IS NULL
- WHEN form validated and submitted
- THEN proceed directly to SMS step (no modal)

### Requirement: RF-007 — Real Reservation Endpoint

POST /api/reservas MUST: validate required fields (nombre, telefono, email, fecha_hora, numero_comensales), normalize phone, SELECT or INSERT `clientes` row, INSERT `reservas` row with cliente_id, apply `modo_reserva` branching. MUST return `{ success: true, reserva_id, estado }`.

#### Scenario: Successful automatic reservation
- GIVEN modo_reserva='automatica', valid form data, SMS verified
- WHEN POST /api/reservas
- THEN cliente created/reused in `clientes` table
- AND reserva created with estado='confirmada'
- AND response: `{ success: true, reserva_id, estado: "confirmada" }`

#### Scenario: Successful verified reservation
- GIVEN modo_reserva='verificada', valid form data, SMS verified
- WHEN POST /api/reservas
- THEN reserva created with estado='pendiente'
- AND response: `{ success: true, reserva_id, estado: "pendiente" }`

#### Scenario: SMS not verified → 403
- GIVEN no SMS verification token in request
- WHEN POST /api/reservas
- THEN 403: "Verificación SMS requerida"

### Requirement: RF-008 — modo_reserva Branching

The server MUST read `configuracion.modo_reserva` to determine post-save behaviour. `automatica`: set estado='confirmada', trigger confirmation email. `verificada`: set estado='pendiente', NO email (deferred to operator). Default mode when config row missing SHALL be 'automatica'.

#### Scenario: Automatica sends email
- GIVEN modo_reserva='automatica', SMTP configured
- WHEN reservation saved
- THEN confirmation email sent to cliente.email

#### Scenario: Verificada defers email
- GIVEN modo_reserva='verificada'
- WHEN reservation saved
- THEN no email sent; estado='pendiente' visible in admin

## MODIFIED Requirements

### Requirement: RF-001 — Form Fields and Validation

The system MUST render a form with: `nombre` (text, required, min 2 chars), `teléfono` (tel, required, Spanish mobile format: 6XX XXX XXX or +346XXXXXXXX), `email` (email, required, format validation), `fecha_hora` (datetime-local, required, future only), `numero_comensales` (number, required, 1-20). All fields MUST validate client-side before proceeding. Phone MUST NOT require E.164 format.

(Previously: required E.164 format with `/^\+[1-9]\d{1,14}$/` regex)

#### Scenario: Spanish mobile accepted
- GIVEN phone = "600123456"
- WHEN blur phone field
- THEN no validation error; format accepted

#### Scenario: Non-Spanish format still rejected
- GIVEN phone = "12345"
- WHEN blur phone field
- THEN error: "Formato de teléfono no válido"

(Remaining scenarios unchanged: All fields valid, Missing required field, Invalid email, Past date, Comensales out of range — preserved as-is.)

### Requirement: RF-005 — Submit Endpoint

(Previously: Mock endpoint returning `mock-<timestamp>`)

The system MUST POST reservation data to `POST /api/reservas` after successful SMS verification + GDPR acceptance. The real endpoint MUST create `clientes` and `reservas` rows in Supabase and return `200 { success: true, reserva_id, estado }`. Request body: `{ nombre, telefono, email, fecha_hora, numero_comensales, sms_verified: true }`.

#### Scenario: Successful submit
- GIVEN form valid, SMS verified, GDPR accepted
- WHEN POST /api/reservas
- THEN Response 200; { success: true, reserva_id, estado }
- AND rows exist in clientes + reservas tables

#### Scenario: Submit shows confirmation
- GIVEN POST succeeds
- WHEN response received
- THEN confirmation message: "Reserva confirmada" with reference ID

## REMOVED Requirements

None. The mock endpoint behavior (RF-005) is replaced, not removed — see MODIFIED above.
