# panel-configuracion Specification

## Purpose

System settings page at `/cocina/configuracion`. Organized in 10 labeled sections: General, Precios, Recomendados, Imágenes, Correo saliente, Protección de datos, Reservas, Horarios, Zonas, Días bloqueados. Covers: `capacidad_total_local` (integer), dual occupancy mode (`modo_ocupacion` auto/manual), manual occupancy override (`ocupacion_manual`), menu pricing, SMTP configuration, GDPR consent text, reservation mode, service hours, zone management, and blocked days. Admin-only access; config loaded/saved via `/api/config` (no direct Supabase client).

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CFG-001 | Settings form: cliente_elige_mesa (toggle) + capacidad_total_local (number) + modo_ocupacion (radio) + ocupacion_manual (number, conditional) | MUST |
| CFG-002 | Save updates the single `configuracion` row | MUST |
| CFG-003 | Admin-only: editor role blocked by permissions middleware | MUST |
| CFG-004 | "Aforo del local" informational section showing capacidad_total_local as the table manager capacity ceiling | MUST |
| CFG-005 | Dual occupancy mode selector: Auto/Manual radio + ocupacion_manual number input (visible on Manual) | MUST |
| CFG-006 | Configuration page reorganized into labeled sections with visual dividers | MUST |
| CFG-007 | SMTP section: smtp_host, smtp_port, smtp_user, smtp_from_email (editable), smtp_password (write-only: masked input, placeholder dots on load, sent on change only) | MUST |
| CFG-008 | Protección de datos section: texto_proteccion_datos (textarea, nullable) | MUST |
| CFG-009 | Reservas section: modo_reserva (radio: Automática / Verificada) | MUST |
| CFG-010 | Test email button in SMTP section: POST /api/cocina/smtp/test → success/error toast | MUST |
| CFG-011 | Horarios section with time inputs for comida/cena + intervalo select | MUST |
| CFG-012 | Zonas section with editable nombre/capacidad/toggle table + add/delete | MUST |
| CFG-013 | Días bloqueados inline CRUD with date picker + recurrente checkbox | MUST |

### Requirement: CFG-001 — Settings Form

The system MUST render a section-based form at `/cocina/configuracion` organized into 10 sections (see CFG-006). Save button: **"Guardar configuración"**. Sections: General, Precios, Recomendados, Imágenes, Correo saliente, Protección de datos, Reservas, Horarios, Zonas, Días bloqueados.

(Previously: single flat form with toggle, capacity, price, image fields.)

(All original CFG-001 scenarios preserved: Form loads, Toggle, Invalid capacidad — now rendered within their respective section groups.)

#### Scenario: Form loads with current values

- GIVEN configuracion row has cliente_elige_mesa=false, capacidad_total_local=80, modo_ocupacion='auto', ocupacion_manual=NULL
- WHEN admin visits `/cocina/configuracion`
- THEN toggle shows unchecked; number input shows 80
- AND "Automático" radio is selected
- AND "Ocupación manual" input is hidden
- AND all 10 sections render with correct headers

#### Scenario: Toggle cliente_elige_mesa

- GIVEN cliente_elige_mesa is false
- WHEN admin checks the toggle and clicks "Guardar configuración"
- THEN the configuracion row updates with cliente_elige_mesa=true
- AND success toast appears

#### Scenario: Invalid capacidad_total_local

- GIVEN admin enters capacidad_total_local=0
- WHEN admin clicks "Guardar configuración"
- THEN validation error: **"La capacidad debe ser al menos 1"**

### Requirement: CFG-002 — Save Configuration

The system MUST upsert the single `configuracion` row on save. Success toast: **"Configuración actualizada"**. Error toast on failure: **"Error al guardar"**.

#### Scenario: Toggle cliente_elige_mesa

- GIVEN cliente_elige_mesa is false
- WHEN admin checks the toggle and clicks "Guardar configuración"
- THEN the configuracion row updates with cliente_elige_mesa=true
- AND success toast appears

#### Scenario: Invalid capacidad_total_local

- GIVEN admin enters capacidad_total_local=0
- WHEN admin clicks "Guardar configuración"
- THEN validation error: **"La capacidad debe ser al menos 1"**

### Requirement: CFG-003 — Admin-Only Access

The system MUST restrict `/cocina/configuracion` to admin role. Editor visiting this route SHALL be redirected to `/cocina/dashboard` with error **"No tiene permisos para esta sección"**.

#### Scenario: Editor blocked

- GIVEN an editor with `configuracion: false`
- WHEN navigating to `/cocina/configuracion`
- THEN redirected to `/cocina/dashboard` with permissions error

### Requirement: CFG-004 — Aforo Connection Display

The system MUST display on `/cocina/configuracion` an informational section showing that `capacidad_total_local` is used as the capacity ceiling for the table manager at `/cocina/reservas`. Section heading: **"Aforo del local"**. Description text: **"Este valor se usa como límite máximo de ocupación en el gestor de mesas."** Displays current `capacidad_total_local` value from DB.

#### Scenario: Aforo connection info visible

- GIVEN configuracion has capacidad_total_local=80
- WHEN admin visits `/cocina/configuracion`
- THEN section "Aforo del local" shows "80"
- AND description explains the connection to the table manager

### Requirement: CFG-005 — Dual Occupancy Mode

The system MUST provide a dual occupancy mode selector on `/cocina/configuracion`:

- **Modo de ocupación**: radio group with options **"Automático"** and **"Manual"** bound to `modo_ocupacion`
- **Ocupación manual**: number input (visible only when Manual is selected), bound to `ocupacion_manual`, label: **"Número de ocupantes"**, min=0, max=capacidad_total_local

When mode is "Automático", aforo on `/cocina/reservas` is calculated as `SUM(capacidad_actual) FROM mesas WHERE mesa_padre_id IS NULL`. When "Manual", `ocupacion_manual` overrides the calculation. Default SHALL be "Automático".

#### Scenario: Select Manual mode and set value

- GIVEN modo_ocupacion='auto'
- WHEN admin selects "Manual" radio
- THEN "Ocupación manual" number input appears
- WHEN admin enters 45 and saves
- THEN modo_ocupacion='manual', ocupacion_manual=45 persisted
- AND `/cocina/reservas` aforo bar shows 45 regardless of actual mesas sum

#### Scenario: Switch back to Auto mode

- GIVEN modo_ocupacion='manual', ocupacion_manual=50
- WHEN admin selects "Automático" radio and saves
- THEN modo_ocupacion='auto' persisted
- AND `/cocina/reservas` aforo bar recalculates from mesas

#### Scenario: Manual value exceeds capacity

- GIVEN capacidad_total_local=80
- WHEN admin enters ocupacion_manual=100
- AND clicks save
- THEN validation error: **"La ocupación manual no puede superar la capacidad total del local"**

### Requirement: CFG-006 — Section Layout

The configuration page MUST display fields grouped into labeled sections with `<h3>` headers and visual separators: **General** (capacidad_total_local, modo_ocupacion, ocupacion_manual), **Precios** (precio_menu_diario, precio_menu_sabado), **Recomendados** (mostrar_recomendados, titulo_recomendados), **Imágenes** (max_ancho_imagen, calidad_imagen, max_peso_imagen, auto_comprimir_imagen), **Correo saliente** (SMTP fields), **Protección de datos** (texto_proteccion_datos), **Reservas** (modo_reserva), **Horarios** (comida/cena time inputs, intervalo select), **Zonas** (editable table), **Días bloqueados** (inline CRUD table).

#### Scenario: Sections render with headers
- GIVEN admin visits /cocina/configuracion
- WHEN page loads
- THEN 10 section headers displayed
- AND fields grouped under respective sections
- AND sections visually separated (borders/backgrounds)

### Requirement: CFG-007 — SMTP Section

SMTP fields: `smtp_host` (text), `smtp_port` (number, 1-65535), `smtp_user` (text), `smtp_from_email` (email), `smtp_password` (password input). On load, password field SHALL show placeholder dots (not real value). Sending an empty password field MUST NOT overwrite the stored password. Only non-empty submissions update the stored value.

#### Scenario: Password masked on load
- GIVEN smtp_password='secret123' in DB
- WHEN config form loads
- THEN password input shows placeholder "••••••••"
- AND actual value not rendered in DOM or network response

#### Scenario: Empty password preserves existing
- GIVEN stored smtp_password='secret123'
- WHEN admin saves config with password field unchanged (placeholder)
- THEN smtp_password remains 'secret123' in DB

### Requirement: CFG-008 — Protección de Datos Section

The system MUST render a `<textarea>` for `texto_proteccion_datos` under "Protección de datos" section. Null value = empty textarea. Placeholder: "Texto de protección de datos que se muestra en el popup GDPR...".

#### Scenario: GDPR text saved
- GIVEN texto_proteccion_datos=NULL
- WHEN admin enters text and saves
- THEN texto_proteccion_datos updated in configuracion

### Requirement: CFG-009 — Reservas Section

Radio group for `modo_reserva`: "Automática" (value='automatica'), "Verificada" (value='verificada'). Default: 'automatica'. Description: "Automática: reserva confirmada tras SMS. Verificada: pendiente hasta confirmación manual."

#### Scenario: Select verificada mode
- GIVEN modo_reserva='automatica'
- WHEN admin selects "Verificada" and saves
- THEN modo_reserva='verificada' persisted
- AND new reservations default to 'pendiente' state

### Requirement: CFG-010 — Test Email Button

A "Enviar correo de prueba" button in SMTP section MUST call POST /api/cocina/smtp/test with current form SMTP values (including password if changed). Success → green toast "Correo de prueba enviado". Failure → red toast with error message.

#### Scenario: Test email succeeds
- GIVEN valid SMTP config in form
- WHEN admin clicks "Enviar correo de prueba"
- THEN POST /api/cocina/smtp/test called
- AND "Correo de prueba enviado" toast shown

#### Scenario: Test email with missing config
- GIVEN smtp_host is empty
- WHEN admin clicks "Enviar correo de prueba"
- THEN red toast: "Configure los datos SMTP primero"

### Requirement: CFG-011 — Horarios Section

ConfiguracionForm MUST render a new "Horarios" section with: time inputs for comida_inicio, comida_fin, cena_inicio, cena_fin (type=time, hh:mm format), and select for intervalo_minutos (options: 5, 10, 15, 20, 30, 60). Section heading: **"Horarios de servicio"**. Fields bound to `form.horarios_config.*`. Save via POST /api/config with Zod validation server-side.

#### Scenario: Horarios section renders with defaults

- GIVEN horarios_config has defaults (13:30-15:30, 21:00-23:30, 15min)
- WHEN admin visits /cocina/configuracion
- THEN "Horarios de servicio" section visible with correct time inputs
- AND intervalo select shows "15 minutos"

#### Scenario: Admin edits lunch end time

- GIVEN comida_fin="15:30"
- WHEN admin changes to "16:00" and clicks "Guardar configuración"
- THEN POST body includes updated horarios_config
- AND success toast: "Configuración actualizada"

#### Scenario: Invalid interval rejected

- GIVEN admin changes intervalo_minutos to 45
- WHEN saves
- THEN client-side validation error: "El intervalo debe dividir 60"
- OR server-side 400 with Zod error

### Requirement: CFG-012 — Zonas Section

ConfiguracionForm MUST render a "Zonas" section with a table showing each zone: nombre (editable text input), capacidad (number input, min 1, max 999), and enabled toggle (checkbox). Button "Añadir zona" appends new row. Button "Eliminar" (trash icon) removes zone row. Section heading: **"Zonas del restaurante"**. All changes saved together via POST /api/config.

#### Scenario: Zonas table renders 5 default zones

- GIVEN zonas_config has 5 default zones
- WHEN admin visits /cocina/configuracion
- THEN table shows 5 rows with nombre, capacidad, enabled toggle
- AND each row has edit/delete capability

#### Scenario: Admin renames a zone

- GIVEN zone "Privado" exists
- WHEN admin edits nombre to "Reservado" and saves
- THEN POST body includes updated zonas_config with new name
- AND mesas CHECK constraint updated server-side

#### Scenario: Admin adds new zone

- GIVEN 5 zones exist
- WHEN admin clicks "Añadir zona", fills nombre="VIP" and capacidad=10
- AND saves
- THEN zonas_config has 6 entries
- AND VIP zone appears in total capacity sum

#### Scenario: Admin deletes a zone

- GIVEN zone "Bar" exists with mesas assigned
- WHEN admin clicks delete on "Bar" row
- THEN warning shown: "Esta zona tiene X mesas asignadas"
- AND on confirm, zone removed from zonas_config
- AND mesas assigned to "Bar" retain the value (stored name, not FK)

### Requirement: CFG-013 — Días Bloqueados Section

ConfiguracionForm MUST render a "Días bloqueados" section with inline CRUD table: columns for fecha (date input), recurrente (checkbox with "Anual" label), motivo (optional text, placeholder "Motivo opcional"), acciones (delete button). "Añadir día bloqueado" button adds new row. Rows loaded from GET /api/dias-bloqueados. Saved individually via POST, deleted via DELETE. Server returns updated list after each operation. Section heading: **"Días bloqueados"**.

#### Scenario: Días bloqueados table loads

- GIVEN 2 blocked days exist in DB
- WHEN admin visits /cocina/configuracion
- THEN "Días bloqueados" section shows 2 rows
- AND recurrent rows show "Anual" badge

#### Scenario: Add blocked day

- GIVEN admin enters fecha="2026-12-25", checks "Anual", motivo="Navidad"
- WHEN clicks save
- THEN POST /api/dias-bloqueados succeeds
- AND row appears in table with "Anual" badge

#### Scenario: Cannot block past date

- GIVEN today is 2026-07-07
- WHEN admin enters fecha="2026-07-01"
- THEN save rejected: "No se pueden bloquear fechas pasadas"

#### Scenario: Delete blocked day

- GIVEN a blocked day row exists
- WHEN admin clicks delete icon
- THEN DELETE /api/dias-bloqueados/[id] called
- AND row removed from table

## Edge Cases

- **Missing config row**: if no configuracion row exists, form shows defaults (capacidad_total_local=0) and first save creates the row
- **Concurrent edit**: last-write-wins (single-row table, low contention)
- **Dual occupancy auto→manual transition**: when switching from Manual to Auto, `ocupacion_manual` is cleared (NULL) and aforo recalculates from mesas
- **Manual value > capacidad_total_local**: validation error blocks save; admin must reduce value or increase capacidad_total_local first
- **Zones validation**: at least one zone must be enabled; deleting all enabled zones is rejected
- **Horarios validation**: lunch and dinner start/end validated server-side via Zod; overlapping turns are allowed (admin controls schedule)
