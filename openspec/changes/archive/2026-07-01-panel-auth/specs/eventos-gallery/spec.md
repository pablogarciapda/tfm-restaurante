# Delta for eventos-gallery

## MODIFIED Requirements

### Requirement: EG-001 — Events Listing

The system MUST source event data from Supabase `eventos` table via `useEventos()` composable using `useAsyncData`. Events MUST be filtered where `activo=true` and sorted by `fecha ASC` (upcoming first). Past events SHALL NOT appear (filtered by `fecha >= CURRENT_DATE`). The mock fixture `shared/fixtures/eventos-mock.ts` is retired as a data source; its data becomes DB seed. The page SHALL show **"Próximos eventos"** as heading. Empty state: **"No hay eventos programados"**.

(Previously: Sourced 4-6 mock events from `shared/fixtures/eventos-mock.ts` with past events marked "Evento pasado")

#### Scenario: Upcoming events from Supabase

- GIVEN `eventos` table has 3 future events with activo=true and 1 inactive event
- WHEN `/eventos` page loads
- THEN 3 active future events rendered; inactive event hidden

#### Scenario: No events available

- GIVEN `eventos` table returns empty or all events are inactive/past
- WHEN `/eventos` loads
- THEN **"No hay eventos programados"** message shown

#### Scenario: Supabase fetch error

- GIVEN Supabase is unreachable
- WHEN `/eventos` attempts to fetch
- THEN error state **"Error al cargar los eventos"** is shown
- AND no crash occurs
