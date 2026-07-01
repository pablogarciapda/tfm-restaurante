# panel-configuracion Specification

## Purpose

System settings page at `/cocina/configuracion`. Single-row configuration editing: `cliente_elige_mesa` (boolean) and `capacidad_total_local` (integer). Admin-only access.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CFG-001 | Settings form: cliente_elige_mesa (toggle) + capacidad_total_local (number) | MUST |
| CFG-002 | Save updates the single `configuracion` row | MUST |
| CFG-003 | Admin-only: editor role blocked by permissions middleware | MUST |

### Requirement: CFG-001 — Settings Form

The system MUST render a form at `/cocina/configuracion` with two fields:

- **"Permitir que el cliente elija mesa"**: toggle/checkbox bound to `cliente_elige_mesa`
- **"Capacidad total del local"**: number input bound to `capacidad_total_local`, min=1, max=999

Form heading: **"Configuración del sistema"**. Save button: **"Guardar configuración"**.

#### Scenario: Form loads with current values

- GIVEN configuracion row has cliente_elige_mesa=false, capacidad_total_local=80
- WHEN admin visits `/cocina/configuracion`
- THEN toggle shows unchecked; number input shows 80

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

## Edge Cases

- **Missing config row**: if no configuracion row exists, form shows defaults (cliente_elige_mesa=false, capacidad_total_local=0) and first save creates the row
- **Concurrent edit**: last-write-wins (single-row table, low contention)
