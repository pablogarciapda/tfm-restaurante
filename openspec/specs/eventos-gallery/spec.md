# eventos-gallery Specification

## Purpose

Events listing page at `/eventos`. Displays upcoming restaurant events (festive + music/show) sourced from Supabase `eventos` table. Each event card shows date, title, description, placeholder image, and a "Reservar" CTA button.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| EG-001 | Events sourced from Supabase `eventos` table via `useEventos()` composable. Upcoming events only (activo=true, fecha >= today). | MUST | Unit |
| EG-002 | Event card fields: `fecha` (date), `titulo`, `descripcion`, `imagen_url` (placeholder), `categoria` (festivo|espectaculo), CTA "Reservar". | MUST | Unit |
| EG-003 | Responsive grid: 1 col mobile, 2 tablet, 3 desktop. Cards equal height within row. | MUST | Unit |
| EG-004 | Categories: "Eventos Festivos" (Navidad, Nochevieja, San Valentín, verano) and "Espectáculos" (flamenco, mago, comedia + cena). Visual distinction via badge or section grouping. | SHOULD | Unit |

### Requirement: EG-001 — Events Listing

The system MUST source event data from Supabase `eventos` table via `useEventos()` composable using `useAsyncData`. Events MUST be filtered where `activo=true` and sorted by `fecha ASC` (upcoming first). Past events SHALL NOT appear (filtered by `fecha >= CURRENT_DATE`). The mock fixture `shared/fixtures/eventos-mock.ts` is retired as a data source; its data becomes DB seed. The page SHALL show **"Próximos eventos"** as heading. Empty state: **"No hay eventos programados"**.

(Previously: Sourced 4-6 mock events from `shared/fixtures/eventos-mock.ts` with past events marked "Evento pasado")

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Upcoming events from Supabase | `eventos` table has 3 future events with activo=true and 1 inactive event | `/eventos` page loads | 3 active future events rendered; inactive event hidden |
| No events available | `eventos` table returns empty or all events are inactive/past | `/eventos` loads | **"No hay eventos programados"** message shown |
| Supabase fetch error | Supabase is unreachable | `/eventos` attempts to fetch | Error state **"Error al cargar los eventos"** is shown; no crash |

### Requirement: EG-002 — Event Card Fields

The system MUST render each event as a card with: `fecha` (formatted as "DD de Mes" in Spanish), `titulo`, `descripcion` (truncated to 3 lines), `imagen_url` (placeholder with `object-cover`), and a "Reservar" CTA button. The CTA SHALL link to `/reservas`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Card renders all fields | Evento with date, title, desc, image | Mount EventCard | Date, title, truncated desc, placeholder image, "Reservar" button visible |
| CTA links to reservas | EventCard mounted | Click "Reservar" | Navigates to `/reservas` |
| Past event CTA | Event with date < today | Card renders | CTA disabled or hidden; "Evento pasado" shown |

### Requirement: EG-003 — Responsive Grid

The system MUST render events in a responsive CSS Grid: 1 column (<768px), 2 columns (768-1023px), 3 columns (≥1024px). Cards MUST have equal height within each row (flexbox or grid auto-rows).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Mobile single column | Viewport 375px | Page renders | Events in single column |
| Tablet 2 columns | Viewport 768px | Page renders | 2 columns visible |
| Desktop 3 columns | Viewport 1280px | Page renders | 3 columns; cards same height in row |

### Requirement: EG-004 — Categories

The system SHOULD distinguish event categories: "Eventos Festivos" (Navidad, Nochevieja, San Valentín, verano) and "Espectáculos" (flamenco, mago, comedia + cena). Category MAY be shown as a badge on the card or as section group headers.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Category badge visible | Evento with categoria="festivo" | Card renders | Badge "Festivo" shown on card |
| Section grouping | Multiple events of both categories | Page renders | Events grouped under category headers OR badge on each card |

## Edge Cases

- **Sold-out event**: if data includes `soldOut: true`, CTA disabled with "Agotado" text
- **Missing image**: imagen_url empty → show gradient placeholder + "Imagen no disponible" alt text
- **Long title**: title > 50 chars → truncated to 2 lines with ellipsis
- **Empty description**: descripcion missing → omit description line, don't leave empty space
- **SSR**: all events render on server; client hydrates with Supabase data
