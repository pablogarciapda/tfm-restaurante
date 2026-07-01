# Delta for menu-diario

## ADDED Requirements

### Requirement: MD-005 — Variable Per-Day Pricing

The system MUST fetch menu pricing from `menu_diario_config` table. Each day SHALL have its own `precio` field. The price display SHALL show the corresponding day's price (e.g., Monday 16€, Saturday 25€). If a day is inactive (`activo=false`), the page SHALL show **"Menú no disponible hoy"**. Price format: **"Menú del día — {precio}€ (IVA incluido)"**.

#### Scenario: Monday shows 16€

- GIVEN `menu_diario_config` has Monday with precio=16
- WHEN `/menu-diario` loads on a Monday
- THEN **"Menú del día — 16€ (IVA incluido)"** is displayed

#### Scenario: Sunday inactive shows fallback

- GIVEN `menu_diario_config` has Sunday with activo=false
- WHEN `/menu-diario` loads on a Sunday
- THEN **"Menú no disponible hoy"** is displayed

## MODIFIED Requirements

### Requirement: MD-001 — Five-Section Structure

The system MUST render the menú del día with 5 labeled sections in order. Each section SHALL list dishes from `menu_diario_items` for the current day. Section labels MUST be in Spanish: "Primer Plato", "Segundo Plato", "Postre", "Bebida", "Pan y Cubiertos".

(Previously: 5-section structure sourced from mock data with 3-5 dishes per section)

#### Scenario: All sections render from Supabase

- GIVEN `menu_diario_items` has dishes for today in all 5 sections
- WHEN `/menu-diario` loads
- THEN 5 section headings visible with their dish lists from Supabase

#### Scenario: Section with no dishes

- GIVEN section "Postre" has no items for today
- WHEN page renders
- THEN section heading still shown; **"Consultar"** fallback text

### Requirement: MD-004 — Data Source

The system MUST source menu data from Supabase via `useMenuDiario()` composable using `useAsyncData`. The composable SHALL join `menu_diario_config` with `menu_diario_items` for the current day. The mock fixture `shared/fixtures/menu-diario-mock.ts` is retired as a data source; its data becomes DB seed.

(Previously: Sourced from `shared/fixtures/menu-diario-mock.ts` mock data)

#### Scenario: Data fetches from Supabase

- GIVEN the Supabase tables have seeded data
- WHEN `/menu-diario` page loads (SSR)
- THEN `useAsyncData` fetches config + items for today's day-of-week
- AND the 5-section menu renders correctly

#### Scenario: Supabase fetch error

- GIVEN Supabase is unreachable
- WHEN `/menu-diario` attempts to fetch
- THEN error state **"Error al cargar el menú"** is shown
- AND no crash occurs

## REMOVED Requirements

### Requirement: MD-002 — Fixed Price Display

(Reason: Replaced by MD-005 variable per-day pricing sourced from `menu_diario_config` table)
(Migration: Public `/menu-diario` page now reads price from Supabase per current day)
