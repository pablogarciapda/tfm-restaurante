# panel-configuracion Specification

## Purpose

System settings page at `/cocina/configuracion`. Single-row configuration editing: `cliente_elige_mesa` (boolean), `capacidad_total_local` (integer), dual occupancy mode (`modo_ocupacion` auto/manual), and manual occupancy override (`ocupacion_manual`). Admin-only access.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CFG-001 | Settings form: cliente_elige_mesa (toggle) + capacidad_total_local (number) + modo_ocupacion (radio) + ocupacion_manual (number, conditional) | MUST |
| CFG-002 | Save updates the single `configuracion` row | MUST |
| CFG-003 | Admin-only: editor role blocked by permissions middleware | MUST |
| CFG-004 | "Aforo del local" informational section showing capacidad_total_local as the table manager capacity ceiling | MUST |
| CFG-005 | Dual occupancy mode selector: Auto/Manual radio + ocupacion_manual number input (visible on Manual) | MUST |

### Requirement: CFG-001 — Settings Form

The system MUST render a form at `/cocina/configuracion` with four fields:

- **"Permitir que el cliente elija mesa"**: toggle bound to `cliente_elige_mesa`
- **"Capacidad total del local"**: number input bound to `capacidad_total_local`, min=1, max=999
- **"Modo de ocupación"**: radio group (Automático / Manual) bound to `modo_ocupacion`
- **"Ocupación manual"**: number input bound to `ocupacion_manual`, visible when Manual selected, min=0, max=capacidad_total_local

Form heading: **"Configuración del sistema"**. Save button: **"Guardar configuración"**.

#### Scenario: Form loads with current values

- GIVEN configuracion row has cliente_elige_mesa=false, capacidad_total_local=80, modo_ocupacion='auto', ocupacion_manual=NULL
- WHEN admin visits `/cocina/configuracion`
- THEN toggle shows unchecked; number input shows 80
- AND "Automático" radio is selected
- AND "Ocupación manual" input is hidden

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

## Edge Cases

- **Missing config row**: if no configuracion row exists, form shows defaults (cliente_elige_mesa=false, capacidad_total_local=0) and first save creates the row
- **Concurrent edit**: last-write-wins (single-row table, low contention)
- **Dual occupancy auto→manual transition**: when switching from Manual to Auto, `ocupacion_manual` is cleared (NULL) and aforo recalculates from mesas
- **Manual value > capacidad_total_local**: validation error blocks save; admin must reduce value or increase capacidad_total_local first
