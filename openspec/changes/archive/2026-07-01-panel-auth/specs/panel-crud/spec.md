# panel-crud Specification

## Purpose

CRUD pattern for `/cocina/carta` plato management: list, create, edit, delete via Supabase. Establishes reusable pattern for eventos and menu-diario CRUD pages.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CRUD-001 | Plato list table with sortable columns: nombre, categoria, tipo_menu, precio, disponible | MUST |
| CRUD-002 | Create plato form with validation, Spanish labels | MUST |
| CRUD-003 | Edit plato: pre-filled form, optimistic UI update | SHOULD |
| CRUD-004 | Delete plato with confirmation dialog | MUST |
| CRUD-005 | Toggle `disponible` inline via switch | SHOULD |
| CRUD-006 | Image upload to Supabase Storage bucket `platos` | MAY |

### Requirement: CRUD-001 — Plato List Table

The system MUST render a table at `/cocina/carta` listing all platos. Columns: nombre, categoria, tipo_menu, precio (€ formatted), disponible (badge). Rows SHALL be sortable by column header click. Empty state: **"No hay platos. Crea el primero."** with a CTA button.

#### Scenario: List displays all platos

- GIVEN the platos table has 15 rows
- WHEN an admin visits `/cocina/carta`
- THEN a table renders with 15 rows showing nombre, categoria, tipo_menu, precio, disponible

#### Scenario: Empty platos list

- GIVEN the platos table has 0 rows
- WHEN an admin visits `/cocina/carta`
- THEN the empty state message **"No hay platos. Crea el primero."** is displayed

### Requirement: CRUD-002 — Create Plato

The system MUST provide a form to create a new plato with fields: nombre, descripcion (textarea), precio (number), categoria (select), tipo_menu (select: carta|menu_diario|ambos), imagen_url, disponible (checkbox), calorias (number), alergenos (multi-select). Labels in Spanish. Required: nombre, precio, categoria. Submit button: **"Crear plato"**. Validation errors SHALL show inline.

#### Scenario: Successful create

- GIVEN the create form is filled with valid data
- WHEN admin clicks "Crear plato"
- THEN the plato is inserted into Supabase
- AND the list refreshes showing the new row
- AND success toast: **"Plato creado correctamente"**

#### Scenario: Validation error

- GIVEN the create form with empty nombre
- WHEN admin clicks "Crear plato"
- THEN inline error: **"El nombre es obligatorio"**
- AND no Supabase insert occurs

### Requirement: CRUD-003 — Edit Plato

The system SHOULD provide an edit form pre-filled with the plato's current data. Save updates via Supabase UPDATE. Optimistic UI: update the row in the local list before server confirmation.

#### Scenario: Edit and save

- GIVEN admin clicks edit on an existing plato
- WHEN admin changes the price and saves
- THEN the row updates with the new price
- AND success toast: **"Plato actualizado"**

### Requirement: CRUD-004 — Delete Plato

The system MUST require a confirmation dialog before deleting a plato. Dialog text: **"¿Eliminar este plato?"** with buttons **"Cancelar"** and **"Eliminar"**. On confirm, DELETE the row from Supabase.

#### Scenario: Delete with confirmation

- GIVEN admin clicks delete on a plato
- WHEN the confirmation dialog appears and admin clicks "Eliminar"
- THEN the plato is removed from Supabase
- AND the row disappears from the list
- AND success toast: **"Plato eliminado"**

#### Scenario: Cancel delete

- GIVEN the delete confirmation dialog is open
- WHEN admin clicks "Cancelar"
- THEN the dialog closes and the plato remains

### Requirement: CRUD-005 — Toggle Disponible

The system SHOULD allow toggling `disponible` directly from the list via a switch/checkbox without opening the edit form.

#### Scenario: Toggle off

- GIVEN a plato with `disponible=true`
- WHEN admin clicks the toggle
- THEN the plato's `disponible` becomes false in Supabase
- AND the badge updates to **"No disponible"**

## Edge Cases

- **Duplicate name**: error **"Ya existe un plato con ese nombre"**
- **Network failure**: error toast **"Error al guardar"**; keep form data
- **Concurrent edit**: last-write-wins; no conflict detection
