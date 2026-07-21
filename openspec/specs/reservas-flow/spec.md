# reservas-flow Specification

## Purpose

Reservation form at `/reservas` with multi-step flow: form → GDPR consent (if configured) → SMS verification → submission to real endpoint. User fills in personal data (including apellidos), accepts data protection policy, verifies phone via SMS code, and submits. The real POST /api/reservas endpoint creates cliente + reserva rows in Supabase. Reservation mode (automatica/verificada) determines whether the reservation is confirmed immediately or marked pending for operator review. Time slot selection uses a dynamic grid generated from restaurant service hours. Admin users can reasign zone/mesa of existing reservations.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| RF-001 | Form fields: nombre, apellidos (optional), teléfono (Spanish mobile validation), email, **time slot grid** (replacing datetime-local), slot selection required, numero_comensales (1-20). All required except apellidos. Client-side validation before proceeding. | MUST | Unit |
| RF-002 | SMS verification step: after form fields valid and GDPR consent accepted → send code to phone → user enters code → verify → form completes. Verification is a REQUIRED pre-submit gate. | MUST | Integration |
| RF-003 | Code flow: POST /api/sms/send → user enters 4-digit code → POST /api/sms/verify → on success, submit enabled; on failure, retry (max 3) with error message; resend after 60s cooldown | MUST | Integration |
| RF-005 | POST /api/reservas real endpoint: creates cliente (dedup by phone) + reserva row; returns `{ success: true, reserva_id, estado }` | MUST | Integration |
| RF-006 | GDPR consent modal: scrollable popup after form submit, before SMS. Text from `configuracion.texto_proteccion_datos`. Accept enabled only at scroll-end. Reject returns to form preserving all data. | MUST | Unit |
| RF-007 | Real POST /api/reservas: creates cliente (dedup by phone) → creates reserva (cliente_id FK) → server-side slot validation → blocked day check → modo_reserva branching (automatica→confirmada, verificada→pendiente) → email on confirm | MUST | Integration |
| RF-008 | modo_reserva integration: read `configuracion.modo_reserva` server-side. Automatica sets estado='confirmada' + sends email. Verificada sets estado='pendiente' for operator confirmation. | MUST | Integration |
| SLA-001 | Dynamic time slot grid replacing datetime-local, grouped by Comida/Cena turns. Past slots disabled on today. | MUST | Unit |
| SLA-002 | Slot click sets fecha_hora as ISO datetime (Europe/Madrid). Visual highlight, one selected at a time. | MUST | Unit |
| SLA-003 | Blocked days disable entire grid with motivo message. Date can be selected but proceed blocked. | MUST | Unit |
| SLA-004 | Server-side slot validation (±5min tolerance) + blocked day check. 400 for bad slot, 409 for blocked date. | MUST | Integration |
| SLA-006 | zona field included in PATCH /api/reservas/[id]/mesa payload (admin-assigned only). Stored in reservas.zona column. | MUST | Integration |
| ADM-001 | Admin can reasign zone/mesa of existing reservation (inline edit from admin panel). | MUST | Unit |
| ADM-002 | PATCH /api/reservas/[id]/mesa endpoint with zone+mesa validation. Admin-only. | MUST | Integration |

### Requirement: RF-001 — Form Fields and Validation

The system MUST render a form with: `nombre` (text, required, min 2 chars), `apellidos` (text, optional), `teléfono` (tel, required, Spanish mobile format: 6XX XXX XXX or +346XXXXXXXX), `email` (email, required, format validation), **time slot grid** (replacing datetime-local), slot selection required from grid, `numero_comensales` (number, required, 1-20). All fields MUST validate client-side before proceeding to GDPR step. Phone MUST NOT require E.164 format.

(Previously: form had `<input type="datetime-local">` for fecha_hora, no zone field)

#### Scenario: Spanish mobile accepted
- GIVEN phone = "600123456"
- WHEN blur phone field
- THEN no validation error; format accepted

#### Scenario: Non-Spanish format still rejected
- GIVEN phone = "12345"
- WHEN blur phone field
- THEN error: "Formato de teléfono no válido"

#### Scenario: Slot not selected blocks continue

- GIVEN all fields filled except no slot clicked
- WHEN user clicks "Continuar"
- THEN error: "Seleccione un horario"

#### Scenario: All fields valid with slot selected
- GIVEN form filled with slot "14:00" selected
- WHEN click "Continuar"
- THEN proceeds to GDPR consent step

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| All fields valid | Form filled with valid data | Click "Continuar" | Proceeds to GDPR consent step (or SMS if GDPR text null) |
| Missing required field | "nombre" empty | Click "Continuar" | Error shown: "El nombre es obligatorio" |
| Invalid email format | email = "no-email" | Blur email field | Error shown: "Email no válido" |
| Phone format invalid | teléfono = "abc" | Blur phone field | Error shown: "Formato de teléfono no válido" |
| Past date rejected | fecha_hora = yesterday | Validate | Error shown: "La fecha debe ser futura" |
| Comensales out of range | comensales = 0 or 21 | Validate | Error shown: "Entre 1 y 20 comensales" |

### Requirement: RF-002 — SMS Verification Step

The system MUST present an SMS verification step after form validation passes. The step MUST show: phone number confirmation, code input (4-digit), verify button, resend link (with cooldown). Form submission MUST be disabled until verification succeeds.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Verification step appears | Form validated, "Continuar" clicked | Transition to step 2 | Phone shown, code input visible, submit disabled |
| Code input limited to 4 digits | Code input focused | Type digits | Only 4 numeric characters accepted |

### Requirement: RF-003 — Send → Verify → Submit Flow

The system MUST call `POST /api/sms/send` with `{ phone }` to request a code. The user enters the received code and clicks "Verificar", which calls `POST /api/sms/verify` with `{ phone, code }`. On success: submit button enables. On failure: error message, retry counter (max 3 attempts). Resend available after 60s cooldown.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path: send + verify | Phone entered, step 2 active | Send code → receive "1234" → enter code → verify | Verification success; submit enabled |
| Wrong code | Code "0000" sent, user enters "9999" | Click "Verificar" | Error: "Código incorrecto"; 2 attempts remaining |
| Max retries reached | 3 failed verification attempts | Enter wrong code 4th time | Input disabled; message: "Demasiados intentos. Solicite un nuevo código." |
| Resend cooldown | Code requested | Click "Reenviar" immediately | Button disabled; countdown "Reenviar en 60s" shown |
| Resend after cooldown | 60s elapsed | Click "Reenviar" | New code sent; retry counter resets |

### Requirement: RF-005 — Submit Endpoint

The system MUST POST reservation data to `POST /api/reservas` after successful SMS verification + GDPR acceptance. The real endpoint MUST create `clientes` and `reservas` rows in Supabase and return `200 { success: true, reserva_id, estado }`. Request body: `{ nombre, apellidos, telefono, email, fecha_hora, numero_comensales, sms_verified: true }`.

(Previously: no `zona` field in payload)

#### Scenario: Successful submit
- GIVEN form valid, SMS verified, GDPR accepted
- WHEN POST /api/reservas
- THEN Response 200; { success: true, reserva_id, estado }
- AND rows exist in clientes + reservas tables

#### Scenario: Successful submit with zone
- GIVEN form valid, SMS verified, GDPR accepted, zone "Terraza" selected
- WHEN POST /api/reservas
- THEN Response 200; { success: true, reserva_id, estado }
- AND reservas row has zona='Terraza'

#### Scenario: Successful submit without zone
- GIVEN form valid, SMS verified, GDPR accepted, no zone selected
- WHEN POST /api/reservas
- THEN Response 200
- AND reservas row has zona=NULL

#### Scenario: Submit shows confirmation
- GIVEN POST succeeds
- WHEN response received
- THEN confirmation message: "Reserva confirmada" with reference ID

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

POST /api/reservas MUST: validate required fields (nombre, telefono, email, fecha_hora, numero_comensales), normalize phone, validate slot time against horarios_config (±5min tolerance), check fecha_hora date against dias_bloqueados (409 if blocked), SELECT or INSERT `clientes` row, INSERT `reservas` row with cliente_id, apply `modo_reserva` branching. MUST return `{ success: true, reserva_id, estado }`.

#### Scenario: Successful automatic reservation
- GIVEN modo_reserva='automatica', valid form data, SMS verified, slot valid, date not blocked
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

#### Scenario: Blocked date rejected
- GIVEN fecha_hora date is in dias_bloqueados
- WHEN POST /api/reservas
- THEN 409: "Fecha no disponible" with motivo

#### Scenario: Invalid slot rejected
- GIVEN fecha_hora time not in generated slots
- WHEN POST /api/reservas
- THEN 400: "Horario fuera de los turnos disponibles"

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

### Requirement: SLA-001 — Dynamic Time Slot Grid

ReservationForm MUST replace `<input type="datetime-local">` with a time slot grid generated from `configuracion.horarios_config`. Grid shows available slots as clickable buttons grouped by turn (Comida / Cena). Each slot=time string (HH:MM). Past slots on the selected date are disabled. Slots are generated client-side from fetched config, validated server-side on submit.

#### Scenario: Slot grid renders for today

- GIVEN horarios_config: comida 13:30-15:30, cena 21:00-23:30, intervalo 15min
- AND current time is 14:05
- WHEN user opens /reservas
- THEN "Comida" section shows slots 13:30-15:30 with 13:30 and 13:45 disabled (past), rest clickable
- AND "Cena" section shows all slots 21:00-23:15 clickable

#### Scenario: Date picker filters slot availability

- GIVEN today is 2026-07-07
- WHEN user selects date 2026-07-08
- THEN slot grid for that date generated
- AND no time-based past-slot filtering (future date, all slots available)
- AND blocked days filtered out (if 2026-07-08 is blocked, grid disabled with "Fecha no disponible")

#### Scenario: All slots for a turn shown

- GIVEN lunch 13:30-15:30, intervalo=15
- WHEN slot grid renders for a future date
- THEN 8 slots: [13:30, 13:45, 14:00, 14:15, 14:30, 14:45, 15:00, 15:15]
- AND all 8 are clickable

### Requirement: SLA-002 — Slot Click Selects Time

Clicking a slot button MUST select it (visual highlight) and set `form.fecha_hora` to the full ISO datetime combining selected date + slot time in Europe/Madrid. Only ONE slot selectable at a time. Selected slot persists through form step transitions.

#### Scenario: Slot selection updates fecha_hora

- GIVEN date selected: 2026-07-08
- WHEN user clicks slot "14:00"
- THEN form.fecha_hora = "2026-07-08T14:00:00+02:00" (Europe/Madrid)
- AND slot button visually highlighted
- AND previously selected slot de-selected

### Requirement: SLA-003 — Blocked Days Disable Grid

When the selected date matches a `dias_bloqueados` entry (individual or recurrent), the entire slot grid MUST be disabled with message: "Fecha no disponible" + optional `motivo` text. Date input itself MAY allow selection but prevents proceeding to next step.

#### Scenario: Blocked day disables slots

- GIVEN '2026-12-25' is blocked (recurrente, motivo="Navidad")
- WHEN user selects date 2026-12-25
- THEN slot grid shows "Fecha no disponible: Navidad"
- AND all slot buttons disabled
- AND "Continuar" button disabled

### Requirement: SLA-004 — Server-Side Slot Validation

POST /api/reservas MUST validate: (a) `fecha_hora` time matches a valid slot from `horarios_config` (±5 min tolerance for clock drift), (b) date not in `dias_bloqueados`. If validation fails: 400 `{ error: "Horario no disponible" }` or 409 `{ error: "Fecha bloqueada" }`.

#### Scenario: Valid slot accepted

- GIVEN horarios_config lunch 13:30-15:30, intervalo 15
- WHEN POST with fecha_hora="2026-07-08T14:00:00+02:00"
- THEN validation passes (14:00 is a valid slot)

#### Scenario: Invalid time rejected

- GIVEN horarios_config lunch starts at 13:30, interval 15
- WHEN POST with fecha_hora="2026-07-08T14:07:00+02:00"
- THEN 400 "Horario fuera de los turnos disponibles"

### Requirement: SLA-006 — Zone in Reservation Payload

Zone is admin-assigned only (not customer-selectable). When admin reasigns zone via PATCH /api/reservas/[id]/mesa, the `zona` field is stored in `reservas.zona` column. Customer reservation form does not include a zone selector.

#### Scenario: Reservation submitted with zone

- GIVEN user selected zone "Terraza"
- WHEN POST /api/reservas
- THEN body includes `zona: "Terraza"`
- AND reservas row has zona='Terraza'

#### Scenario: Reservation submitted without zone

- GIVEN user did not select a zone (or dropdown hidden)
- WHEN POST /api/reservas
- THEN body omits zona field (or null)
- AND reservas row has zona=NULL

### Requirement: ADM-001 — Admin Reasign Zona/Mesa

Admin user MUST be able to change `zona` and `mesa_id` of an existing reservation from the admin panel. UX: reservation detail view shows current zona + mesa with edit pencil icon; clicking opens inline select dropdowns for zone (from zonas_config) and mesa (filtered by selected zone). Save calls PATCH /api/reservas/[id]/mesa.

#### Scenario: Admin reasigns zona

- GIVEN reservation has zona='Principal', mesa_id=NULL
- WHEN admin opens edit, selects zona='Terraza', clicks save
- THEN PATCH /api/reservas/[id]/mesa { zona: "Terraza" }
- AND reservation updated with new zona value

#### Scenario: Admin reasigns mesa

- GIVEN reservation has mesa_id=NULL
- WHEN admin selects zone='Principal', then selects mesa #3, clicks save
- THEN PATCH /api/reservas/[id]/mesa { mesa_id: "<uuid>", zona: "Principal" }
- AND FK validated against mesas table

### Requirement: ADM-002 — PATCH /api/reservas/[id]/mesa Endpoint

PATCH /api/reservas/[id]/mesa MUST: accept `{ zona?, mesa_id? }`, validate zona against zonas_config names, validate mesa_id FK exists and belongs to selected zone, update reserva row, return updated reserva. Admin-only (auth + can_write('reservas')). Returns 200 with updated reserva or 400/404 on validation failure.

#### Scenario: Successful mesa reassignment

- GIVEN valid reserva id, zona="Principal", mesa_id=valid mesa in Principal
- WHEN PATCH /api/reservas/[id]/mesa
- THEN reserva.zona and reserva.mesa_id updated
- AND 200 with updated reserva data

#### Scenario: Mesa not in selected zone rejected

- GIVEN mesa #5 is in "Terraza" zone
- WHEN PATCH with zona="Principal", mesa_id=#5
- THEN 400 "La mesa no pertenece a la zona seleccionada"

## Edge Cases

- **Phone format**: accept +34 Spanish mobile (6XX XXX XXX or +346XXXXXXXX), reject landlines
- **Expired code**: if code older than 10 minutes → verify returns false; user must resend
- **Concurrent submits**: disable submit button after first click to prevent double-submit
- **Network error on send**: show "Error al enviar el código. Inténtelo de nuevo."
- **Network error on verify**: show "Error al verificar. Inténtelo de nuevo."
- **SSR**: form renders empty on server; client hydrates with empty state — no mismatch
- **Slot timezone**: all slots generated and validated in Europe/Madrid timezone (UTC+1/+2 DST)
- **Past slots today**: slots before current time on today's date are disabled with "Hora pasada" tooltip
- **Blocked day recurrence**: single row with recurrente=true blocks same MM-DD every year (not day-of-week)
- **Zone names stored by value**: zona field stores the name at reservation time, not an FK to zonas_config; renaming a zone does not retroactively change existing reservations
