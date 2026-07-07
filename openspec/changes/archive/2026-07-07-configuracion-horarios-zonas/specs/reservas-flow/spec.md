# Delta for reservas-flow

## ADDED Requirements

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

### Requirement: SLA-005 — Zone Selector in Reservation Form

When `configuracion.cliente_elige_zona` is `zona`, ReservationForm MUST render a "Zona" dropdown between the slot grid and comensales input. Dropdown lists only enabled zones from `zonas_config`, sorted by zone order in JSONB array. Label: **"Seleccione una zona (opcional)"**. Selection is optional. When mode is `none`, dropdown is not rendered.

#### Scenario: Zone dropdown visible in zona mode

- GIVEN cliente_elige_zona='zona', 5 zones all enabled
- WHEN user visits /reservas
- THEN dropdown shows 5 zones: Principal, Reservado, Zíngaro, Terraza, Bar
- AND label says "(opcional)"

#### Scenario: Disabled zones excluded

- GIVEN cliente_elige_zona='zona', Terraza disabled
- WHEN user opens zone dropdown
- THEN only 4 zones listed (Terraza excluded)

#### Scenario: No dropdown in none mode

- GIVEN cliente_elige_zona='none'
- WHEN user visits /reservas
- THEN no zone dropdown rendered

### Requirement: SLA-006 — Zone in Reservation Payload

When user selects a zone, ReservationForm MUST include `zona: "{nombre}"` in POST /api/reservas body. If no zone selected, omit the field (or send null). Server stores in `reservas.zona` column.

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

## MODIFIED Requirements

### Requirement: RF-001 — Form Fields and Validation

The system MUST render a form with: `nombre` (text, required, min 2 chars), `apellidos` (text, optional), `teléfono` (tel, required, Spanish mobile format: 6XX XXX XXX or +346XXXXXXXX), `email` (email, required, format validation), **time slot grid** (replacing datetime-local), slot selection required from grid, `zona` (select, optional, conditional on `cliente_elige_zona`), `numero_comensales` (number, required, 1-20). All fields MUST validate client-side before proceeding to GDPR step. Phone MUST NOT require E.164 format.

(Previously: form had `<input type="datetime-local">` for fecha_hora, no zone field)

#### Scenario: Spanish mobile accepted
- GIVEN phone = "600123456"
- WHEN blur phone field
- THEN no validation error; format accepted

#### Scenario: Slot not selected blocks continue

- GIVEN all fields filled except no slot clicked
- WHEN user clicks "Continuar"
- THEN error: "Seleccione un horario"

#### Scenario: All fields valid with slot selected
- GIVEN form filled with slot "14:00" selected
- WHEN click "Continuar"
- THEN proceeds to GDPR consent step

### Requirement: RF-005 — Submit Endpoint

The system MUST POST reservation data to `POST /api/reservas` after successful SMS verification + GDPR acceptance. The real endpoint MUST create `clientes` and `reservas` rows in Supabase and return `200 { success: true, reserva_id, estado }`. Request body: `{ nombre, apellidos, telefono, email, fecha_hora, numero_comensales, zona?, sms_verified: true }`.

(Previously: no `zona` field in payload)

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
