# Delta for carta-navigation

## MODIFIED Requirements

### Requirement: CN-006 — Data Source

The system MUST source carta data from Supabase `platos` table via `usePlatos()` composable. The composable SHALL use `useAsyncData` for SSR-safe fetching. The existing mock fixture `shared/fixtures/carta-mock.ts` is retired as a data source but retained as reference; its data becomes DB seed. Structure: categories derived from `platos.categoria`, sorted by `puesto` (if the column exists) or alphabetically. Platos grouped under their category.

(Previously: Sourced from `shared/fixtures/carta-mock.ts` mock data with MockCategoria[] and nested platos[])

#### Scenario: Data fetches from Supabase

- GIVEN the Supabase `platos` table has seeded data from mock fixtures
- WHEN `/carta` page loads (SSR)
- THEN `useAsyncData` fetches platos grouped by `categoria`
- AND the ProductGrid renders all categories with their dishes

#### Scenario: Empty Supabase response

- GIVEN the `platos` table returns an empty array
- WHEN `/carta` page loads
- THEN the page shows **"Carta no disponible"** message

#### Scenario: Supabase fetch error

- GIVEN Supabase is unreachable
- WHEN `/carta` attempts to fetch
- THEN the page shows error state **"Error al cargar la carta"**
- AND no crash occurs
