# menu-diario Specification

## Purpose

Classic Spanish "menú del día" page at `/menu-diario`. Fixed-price (~18€) daily menu with 5 sections: primer plato, segundo plato, postre, bebida, pan/cubiertos. Options rotate by day of week. Sourced from mock data.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| MD-001 | 5-section structure: Primer Plato, Segundo Plato, Postre, Bebida, Pan/Cubiertos. Each section lists 3-5 options. | MUST | Unit |
| MD-002 | Fixed price display: "Menú del día — 18€" (or mock price) prominently visible at top. | MUST | Unit |
| MD-003 | Day rotation: options change based on current day of week (L-V standard; S-D may differ or show "Consultar"). | MUST | Unit |
| MD-004 | Mock data from `shared/fixtures/menu-diario-mock.ts`. Structure: `MenuDiarioDia { dia: number, precio: string, secciones: { nombre, platos: { nombre, descripcion? }[] }[] }`. | MUST | Integration |

### Requirement: MD-001 — Five-Section Structure

The system MUST render the menú del día with 5 labeled sections in order. Each section SHALL list 3-5 dish names with optional descriptions. Section labels MUST be in Spanish: "Primer Plato", "Segundo Plato", "Postre", "Bebida", "Pan y Cubiertos".

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| All sections render | Mock data for current day has all 5 sections | Page loads at `/menu-diario` | 5 section headings visible with their dish lists |
| Section with no dishes | Section "Postre" has empty array | Page renders | Section heading still shown; "Consultar" fallback text |

### Requirement: MD-002 — Fixed Price Display

The system MUST display the fixed price prominently above the menu sections. Format: "Menú del día — 18€" (price from mock data). Price MAY include "IVA incluido" annotation.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Price visible | Page loads | Inspect hero or top section | "Menú del día — 18€" displayed in large text |
| Price from mock data | Mock precio = "20" | Page renders | "20€" shown, not hardcoded "18€" |

### Requirement: MD-003 — Day Rotation

The system MUST select the menu based on `new Date().getDay()`. Mon-Fri (1-5): standard menu. Sat (6) and Sun (0): MAY show weekend special or "Consultar menú fin de semana". Mock data MUST include entries for each day.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Weekday shows standard | Current day = Tuesday (2) | Page loads | Tuesday menu data rendered |
| Weekend shows special/fallback | Current day = Sunday (0) | Page loads, mock has weekend entry | Weekend menu OR "Menú de fin de semana — Consultar" |
| Day with no data | Current day has no mock entry | Page loads | Fallback: "Menú no disponible hoy. Consulte por teléfono." |

### Requirement: MD-004 — Mock Data

The system MUST source menu data from `shared/fixtures/menu-diario-mock.ts`. Structure MUST support per-day menus. If the mock file is empty or missing, the page SHALL show "Menú no disponible" error state.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Mock data loads | Fixture file exists with valid data | Page fetches menu for today | Menu renders correctly |
| Missing fixture | File doesn't exist or is empty | Page attempts to load | "Menú no disponible" message shown; no crash |

## Edge Cases

- **Public holiday**: treated as Sunday (day 0) for rotation
- **Section with single option**: renders normally, not an error
- **Browser clock mismatch**: client `Date` used for day selection; server SSR may render different day → wrap in `<ClientOnly>` or use server date
- **SSR**: menu rendered with server's current day; client hydrates and may correct if timezone mismatch
