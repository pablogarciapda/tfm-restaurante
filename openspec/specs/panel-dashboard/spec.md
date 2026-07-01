# panel-dashboard Specification

## Purpose

Admin dashboard at `/cocina/dashboard` displaying read-only restaurant metrics: total platos, today's reservations count, and active events count.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| DASH-001 | `/cocina/dashboard` page with 3 metric cards | MUST |
| DASH-002 | Metric: "Total platos" — count of `platos` where `disponible=true` | MUST |
| DASH-003 | Metric: "Reservas hoy" — count of `reservas` where `fecha_hora::date = today` | MUST |
| DASH-004 | Metric: "Eventos activos" — count of `eventos` where `activo=true` and `fecha >= today` | MUST |
| DASH-005 | Read-only display; no edit actions on dashboard | MUST |

### Requirement: DASH-001 — Dashboard Page

The system MUST render `/cocina/dashboard` as the default landing page after login. It SHALL display the admin sidebar layout and 3 metric cards. UI heading: **"Panel de Control"**.

#### Scenario: Dashboard renders after login

- GIVEN an authenticated admin user
- WHEN navigating to `/cocina/dashboard`
- THEN "Panel de Control" heading is visible
- AND 3 metric cards are displayed
- AND the sidebar navigation shows the current page as active

### Requirement: DASH-002 — Total Platos Metric

The system MUST query `platos` where `disponible=true` and display the count. Label: **"Platos en carta"**.

#### Scenario: Plato count displays

- GIVEN the platos table has 12 active dishes
- WHEN the dashboard loads
- THEN the card shows **"12"** with label "Platos en carta"

#### Scenario: Zero active platos

- GIVEN all platos have `disponible=false`
- WHEN the dashboard loads
- THEN the card shows **"0"**

### Requirement: DASH-003 — Today's Reservations Metric

The system MUST count `reservas` where `fecha_hora` falls on the current date. Label: **"Reservas hoy"**.

#### Scenario: Reservations count for today

- GIVEN 5 reservations exist for today
- WHEN the dashboard loads
- THEN the card shows **"5"** with label "Reservas hoy"

### Requirement: DASH-004 — Active Events Metric

The system MUST count `eventos` where `activo=true` and `fecha >= CURRENT_DATE`. Label: **"Eventos activos"**.

#### Scenario: Active events count

- GIVEN 3 future events are active
- WHEN the dashboard loads
- THEN the card shows **"3"** with label "Eventos activos"

### Requirement: DASH-005 — Read-Only

The dashboard SHALL NOT include CRUD actions. It is purely a metrics display surface with no edit buttons, forms, or mutation controls.

#### Scenario: No edit actions on dashboard

- GIVEN the dashboard is rendered
- WHEN inspecting the page
- THEN no "Crear", "Editar", or "Eliminar" buttons are present

## Edge Cases

- **Query failure**: Supabase unavailable → each card shows **"--"** with tooltip "Error al cargar"
- **Empty DB**: all metrics show 0 (not an error state)
- **Date boundary**: reservations spanning midnight counted by `fecha_hora::date = CURRENT_DATE`
