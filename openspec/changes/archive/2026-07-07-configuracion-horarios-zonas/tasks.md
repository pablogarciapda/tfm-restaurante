# Tasks: Configuración de Horarios, Zonas y Días Bloqueados

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (size-exception, maintainer pre-approved) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

## Phase 1 — Foundation (DB + Types + Validation)

- [x] 1.1 **DB Migration** — `supabase-zingara_apply_migration` `add_horarios_zonas_bloqueados`: ADD `horarios_config`, `zonas_config`, `public_config` (jsonb) to `configuracion`. CREATE `dias_bloqueados` (id uuid PK, fecha date NOT NULL, recurrente bool DEFAULT false, fecha_fin date, motivo text, created_at timestamptz) with RLS. ADD `zona_id` TEXT NULL to `reservas`. ADD `zona_nombre` TEXT NULL to `mesas` (transitional). DROP `capacidad_total_local` default 80→NULL. `app/types/database.types.ts` regenerated. `zod` v4.4.3 installed.

- [x] 1.2 **Types & Contracts** — `shared/contracts/reservation.contract.ts`: added `HorarioConfig`, `ZonaConfig`, `DiaBloqueado`, `CreateDiaBloqueadoPayload`, `TimeSlot`, `PublicConfig`, `AdminReasignarPayload` interfaces. Extended `ReservationRequest` with `zona_id?`. Extended `ConfigData`/`ConfigUpdatePayload` with `horarios_config`, `zonas_config`, `public_config`. `shared/contracts/mesas.contract.ts`: changed `Zona` type from union literal to `string`. DB types regenerated.

- [x] 1.3 **Zod Schemas** — `server/utils/validation.ts`: `horarioConfigSchema` (5 keys, HH:MM regex, intervalo ∈ [5,60] integer divisor of 60, inicio<fin). `zonasConfigSchema` (array of {id, nombre, capacidad, enabled}, min 1 zone, ≥1 enabled, unique names). `createDiaBloqueadoSchema` (fecha YYYY-MM-DD, recurrente bool, fecha_fin optional, motivo optional). `publicConfigSchema` wrapping horarios+zonas+modo_reserva. Unit tests deferred (Standard Mode).

- [x] 1.4 **Slot Generation Utility** — `shared/utils/slots.ts`: `generateTurnSlots(inicio, fin, intervalo)` — splits a turn into intervalo-sized slots. `generateSlots(config)` — combines lunch+dinner turns. `generateDateSlots(fecha, config)` — date-scoped placeholder. `isSlotInRange(hora, config)` — ±5min tolerance validation. `formatSlotLabel(hora)` — 24h formatting. Auto-imported via Nuxt config. Unit tests deferred (Standard Mode).

## Phase 2 — Server Endpoints

- [x] 2.1 **GET /api/public-config** — `server/api/public-config.get.ts` + handler: returns `horarios_config`, enabled zones from `zonas_config`, `cliente_elige_zona`, `texto_proteccion_datos`, `modo_reserva`. PUBLIC (no auth). Uses service role to bypass RLS on configuracion only for reads. Write unit test: `test/unit/public-config.test.ts`.

- [x] 2.2 **GET /api/config — secure** — Verify `server/api/config.get.ts` requires auth (should already). Ensure response includes `horarios_config`, `zonas_config`, `cliente_elige_zona`. Exclude `smtp_password`. Update existing tests.

- [x] 2.3 **POST /api/config — validate JSONB** — `server/api/config.handlers.ts`: add `horarios_config` + `zonas_config` Zod validation in `handleUpdateConfig`. On `zonas_config` save, update `mesas` CHECK constraint to match new zone names. Update existing test: `test/unit/config-handlers.test.ts`.

- [x] 2.4 **CRUD /api/dias-bloqueados** — `server/api/dias-bloqueados.get.ts` (PUBLIC — list all ordered by fecha), `server/api/dias-bloqueados.post.ts` (ADMIN — validate not-past, Zod), `server/api/dias-bloqueados/[id].delete.ts` (ADMIN — 404 if missing). All use service role. Write tests: `test/unit/dias-bloqueados.test.ts` covering list, create, past-date reject, delete, auth guard.

- [x] 2.5 **POST /api/reservas — slot+block validation** — `server/api/reservas.handlers.ts`: before insert, check fecha_hora date against `dias_bloqueados` (individual + MM-DD recurrence). Validate time ∈ valid slots via `isValidSlot()`. Store `zona` from body. Reject: 409 blocked, 400 bad slot. Update tests: `test/unit/reservas-handlers.test.ts`.

- [x] 2.6 **PATCH /api/reservas/[id]/mesa** — `server/api/reservas/[id]/mesa.patch.ts` + handler: accept `{zona?, mesa_id?}`, validate zona ∈ zonas_config enabled names, validate mesa FK exists and belongs to zone. ADMIN only. Write tests: `test/unit/reservas-mesa-handlers.test.ts`.

## Phase 3 — UI (Components + Pages)

- [x] 3.1 **ConfiguracionForm — 3 new sections** — `app/components/ConfiguracionForm.vue`: Horarios section (4 time inputs + intervalo select), Zonas section (editable table: nombre, capacidad, enabled toggle, add/delete rows), Días Bloqueados (inline CRUD table: date picker, recurrente checkbox, motivo input, load from GET, save via POST, delete via DELETE). Add `cliente_elige_zona` radio group (none/zona/zona_mesa with "Próximamente" on mesa). Write unit tests covering render, edit, add/delete zone, blocked day CRUD.

- [x] 3.2 **ReservationForm — slot grid + zone selector** — `app/components/ReservationForm.vue`: replace datetime-local with SlotGrid component (date picker + grouped slot buttons by turn, disabled past slots on today, disabled when date blocked). Add zone dropdown (conditional on `cliente_elige_zona`). Extend validation: slot required, zone optional. Write tests: `test/unit/ReservationForm.slot-grid.test.ts`.

- [x] 3.3 **reservas.vue — wire public-config** — `app/pages/reservas.vue`: fetch `GET /api/public-config` + `GET /api/dias-bloqueados` on mount. Pass `horarios_config`, `zonas_config`, `cliente_elige_zona`, blocked dates to ReservationForm. Include `zona` in POST body. Update tests.

- [x] 3.4 **Admin reasignar modal** — `app/pages/cocina/reservas.vue`: add edit button per reservation row → inline zone dropdown (from zonas_config) + mesa dropdown (filtered by zone). On save, call `PATCH /api/reservas/[id]/mesa`. Toast success/error. Write component tests.

- [x] 3.5 **TDD integration tests** — `test/nuxt/reservation-slots.test.ts`: full flow (fetch config → render slots → select slot → pick zone → submit). `test/nuxt/config-horarios.test.ts`: save horarios/zonas → verify persisted. `test/e2e/reservas-slots.spec.ts`: Playwright — load /reservas, click slot, fill form, submit. Verify existing 652 tests still green.
