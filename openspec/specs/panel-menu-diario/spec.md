# panel-menu-diario Specification

## Purpose

Admin interface at `/cocina/menu-diario` for managing the daily menu: day configuration with variable pricing (Mon-Fri 16€, Sat 25€, Sun optional), and 5-section dish assignment per day.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CMD-001 | Day list showing all 7 days with active toggle and price | MUST |
| CMD-002 | Edit day: toggle active, set custom price per day | MUST |
| CMD-003 | 5-section dish manager: Primer Plato, Segundo Plato, Postre, Bebida, Pan y Cubiertos | MUST |
| CMD-004 | Add/remove dishes per section per day | MUST |
| CMD-005 | Default prices: Mon-Fri 16€, Sat 25€, Sun disabled (active=false) | SHOULD |

### Requirement: CMD-001 — Day List

The system MUST render a list of 7 days (Lunes–Domingo) at `/cocina/menu-diario`. Each row SHALL show: day name, active badge (Activo/Inactivo), price (€). Clicking a day opens its detail editor.

#### Scenario: Day list renders

- GIVEN the menu_diario_config table has entries for all 7 days
- WHEN admin visits `/cocina/menu-diario`
- THEN 7 day rows are visible with labels: **"Lunes"** through **"Domingo"**
- AND each shows active status and price

### Requirement: CMD-002 — Edit Day Config

The system MUST allow editing each day: toggle `activo` (checkbox), set custom `precio` (numeric input). Save updates `menu_diario_config`. UI: **"Guardar cambios"** button with success toast **"Configuración guardada"**.

#### Scenario: Update Sunday to active with price

- GIVEN Sunday is inactive (default)
- WHEN admin sets active=true, price=30 and clicks "Guardar cambios"
- THEN `menu_diario_config` row for Sunday updates with activo=true, precio=30

### Requirement: CMD-003 — 5-Section Dish Manager

The system MUST display 5 sections for the selected day: **"Primer Plato"**, **"Segundo Plato"**, **"Postre"**, **"Bebida"**, **"Pan y Cubiertos"**. Each section SHALL list its assigned dishes with drag-to-reorder support.

#### Scenario: Sections render with dishes

- GIVEN a day has dishes in all 5 sections
- WHEN admin opens the day detail
- THEN 5 section headers are visible with their dish lists

### Requirement: CMD-004 — Add/Remove Dishes

The system MUST allow adding a dish to a section: input fields for `nombre` and optional `descripcion`, assigned to a section via select. Remove: delete button with confirmation **"¿Quitar este plato del menú?"**. Adds insert into `menu_diario_items`; removes delete from it.

#### Scenario: Add dish to section

- GIVEN admin opens a day's "Primer Plato" section
- WHEN admin fills "Gazpacho andaluz" in the nombre field and clicks add
- THEN a new row appears in "Primer Plato" section
- AND the dish is persisted in `menu_diario_items`

### Requirement: CMD-005 — Default Pricing

The system SHOULD seed default prices: Lunes–Viernes = 16€, Sábado = 25€, Domingo = inactive. These are defaults; admin can override per day.

#### Scenario: Default Monday price

- GIVEN a fresh seed migration has run
- WHEN viewing Monday's config
- THEN precio = 16 and activo = true

## Edge Cases

- **Day with 0 dishes**: sections show **"Sin platos asignados"** placeholder
- **Duplicate dish name in same section**: warn **"Este plato ya está en esta sección"**
- **Section limit**: SHOULD warn if > 8 dishes per section (UI performance)
- **Shared dishes**: same dish can appear in multiple days (separate rows in menu_diario_items)
