# menu-diario Specification

## Purpose

Classic Spanish "menú del día" page at `/menu-diario`. Variable per-day pricing sourced from Supabase `menu_diario_config` table (Mon-Fri 16€, Sat 25€, Sun optional). 5 sections: primer plato, segundo plato, postre, bebida, pan/cubiertos. Options rotate by day of week. Data sourced from Supabase via `useMenuDiario()` composable.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| MD-001 | 5-section structure: Primer Plato, Segundo Plato, Postre, Bebida, Pan/Cubiertos. Each section lists dishes from `menu_diario_items` for the current day. | MUST | Unit |
| MD-003 | Day rotation: options change based on current day of week (L-V standard; S-D may differ or show "Consultar"). | MUST | Unit |
| MD-004 | Data source — Supabase via `useMenuDiario()` composable joining `menu_diario_config` + `menu_diario_items`. | MUST | Integration |
| MD-005 | Variable per-day pricing: each day has its own `precio` from `menu_diario_config`. Inactive days show fallback. | MUST | Unit |

### Requirement: MD-001 — Five-Section Structure

The system MUST render the menú del día with 5 labeled sections in order. Each section SHALL list dishes from `menu_diario_items` for the current day. Section labels MUST be in Spanish: "Primer Plato", "Segundo Plato", "Postre", "Bebida", "Pan y Cubiertos".

(Previously: 5-section structure sourced from mock data with 3-5 dishes per section)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| All sections render from Supabase | `menu_diario_items` has dishes for today in all 5 sections | `/menu-diario` loads | 5 section headings visible with their dish lists from Supabase |
| Section with no dishes | Section "Postre" has no items for today | Page renders | Section heading still shown; **"Consultar"** fallback text |

### Requirement: MD-003 — Day Rotation

The system MUST select the menu based on `new Date().getDay()`. Mon-Fri (1-5): standard menu. Sat (6) and Sun (0): MAY show weekend special or "Consultar menú fin de semana". Data MUST include entries for each day.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Weekday shows standard | Current day = Tuesday (2) | Page loads | Tuesday menu data rendered |
| Weekend shows special/fallback | Current day = Sunday (0) | Page loads, data has weekend entry | Weekend menu OR "Menú de fin de semana — Consultar" |
| Day with no data | Current day has no data entry | Page loads | Fallback: "Menú no disponible hoy. Consulte por teléfono." |

### Requirement: MD-004 — Data Source

The system MUST source menu data from Supabase via `useMenuDiario()` composable using `useAsyncData`. The composable SHALL join `menu_diario_config` with `menu_diario_items` for the current day. The mock fixture `shared/fixtures/menu-diario-mock.ts` is retired as a data source; its data becomes DB seed.

(Previously: Sourced from `shared/fixtures/menu-diario-mock.ts` mock data)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Data fetches from Supabase | Supabase tables have seeded data | `/menu-diario` page loads (SSR) | `useAsyncData` fetches config + items for today's day-of-week |
| Supabase fetch error | Supabase is unreachable | `/menu-diario` attempts to fetch | Error state **"Error al cargar el menú"** is shown; no crash |

### Requirement: MD-005 — Variable Per-Day Pricing

The system MUST fetch menu pricing from `menu_diario_config` table. Each day SHALL have its own `precio` field. The price display SHALL show the corresponding day's price (e.g., Monday 16€, Saturday 25€). If a day is inactive (`activo=false`), the page SHALL show **"Menú no disponible hoy"**. Price format: **"Menú del día — {precio}€ (IVA incluido)"**.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Monday shows 16€ | `menu_diario_config` has Monday with precio=16 | `/menu-diario` loads on a Monday | **"Menú del día — 16€ (IVA incluido)"** is displayed |
| Sunday inactive shows fallback | `menu_diario_config` has Sunday with activo=false | `/menu-diario` loads on a Sunday | **"Menú no disponible hoy"** is displayed |

## Edge Cases

- **Public holiday**: treated as Sunday (day 0) for rotation
- **Section with single option**: renders normally, not an error
- **Browser clock mismatch**: client `Date` used for day selection; server SSR may render different day → wrap in `<ClientOnly>` or use server date
- **SSR**: menu rendered with server's current day; client hydrates and may correct if timezone mismatch
