# panel-eventos Specification

## Purpose

Admin CRUD for events at `/cocina/eventos`. Manage festive events and espectáculos displayed on the public `/eventos` page.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CEV-001 | Event list table: titulo, fecha, categoria, activo | MUST |
| CEV-002 | Create/edit event form with all fields | MUST |
| CEV-003 | Delete event with confirmation | MUST |
| CEV-004 | Toggle `activo` (published/hidden from public page) | MUST |

### Requirement: CEV-001 — Event List

The system MUST render a table at `/cocina/eventos` listing all eventos sorted by `fecha DESC`. Columns: titulo, fecha (DD/MM/YYYY), categoria (badge: Festivo|Espectáculo), activo (badge: Activo|Inactivo). Empty state: **"No hay eventos. Crea el primero."**

#### Scenario: List displays events

- GIVEN the eventos table has 5 rows
- WHEN admin visits `/cocina/eventos`
- THEN a table renders with 5 rows sorted by date descending

### Requirement: CEV-002 — Create/Edit Event

The system MUST provide a form with fields: titulo (required), descripcion (textarea), fecha (date picker), categoria (select: festivo|espectaculo), imagen_url, activo (checkbox). Labels in Spanish. Save button: **"Guardar evento"**. Success toast: **"Evento guardado"**. Validation: titulo required → **"El título es obligatorio"**; fecha must be future for new events → **"La fecha debe ser futura"**.

#### Scenario: Create future event

- GIVEN the create form is filled with valid data and future date
- WHEN admin clicks "Guardar evento"
- THEN the event is inserted and appears in the list

#### Scenario: Edit past event

- GIVEN an existing event with fecha in the past
- WHEN admin edits description and saves
- THEN the update succeeds (past date allowed for existing events)

### Requirement: CEV-003 — Delete Event

The system MUST show confirmation dialog: **"¿Eliminar este evento?"** with **"Cancelar"** / **"Eliminar"** buttons. On confirm, DELETE from `eventos` table. Success toast: **"Evento eliminado"**.

#### Scenario: Delete confirmed

- GIVEN admin clicks delete on an event
- WHEN the dialog appears and admin clicks "Eliminar"
- THEN the event is removed from Supabase and the list

### Requirement: CEV-004 — Toggle Activo

The system MUST allow toggling `activo` from the list. Inactive events SHALL NOT appear on the public `/eventos` page. Toggle updates the `activo` boolean directly.

#### Scenario: Hide event from public page

- GIVEN an event with activo=true
- WHEN admin toggles activo to false
- THEN the event no longer appears on `/eventos` for public visitors

## Edge Cases

- **Duplicate title**: warn **"Ya existe un evento con ese título"**; allow override
- **Image upload**: same constraints as platos (2MB, jpg/png/webp)
- **Past event date**: allowed on edit but flagged with warning **"Este evento ya ha pasado"**
