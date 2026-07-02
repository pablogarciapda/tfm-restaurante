# Proposal: Motor de Mesas (Phase 3)

## Intent

Provide the restaurant staff with an interactive visual table manager at `/cocina/reservas` to replace manual paper/whiteboard tracking. The admin must be able to see, move, resize, merge, and unmerge tables on a live canvas, with capacity constraints enforced automatically. Real-time sync across multiple admin sessions prevents double-booking and stale views.

## Scope

### In Scope
- **Mesas DB table**: `mesas` (self-ref FK, `id_fusion`, `zona`, `capacidad_actual`) + RLS + Realtime publication
- **5 fixed zones**: Principal, Zingaro, Privado, Terraza, Bar — rendered as labeled semi-transparent sections
- **CRUD tables**: create, edit, delete, drag & drop, resize (40×40 min), rotate (15° snaps)
- **Fusion**: N tables (same zone) → shared `id_fusion` + `mesa_padre_id`, capacity = `floor(sum(capacidad_base) × 0.75)`
- **Unfusion**: restore capacidad_base + clear fusion fields; if reservations exist → confirm dialog (cancel + notify, or move to standby)
- **New `reservas.estado` value**: `standby` — unfused reservations awaiting reassignment, shown as floating banner on canvas
- **Aforo enforcement**: block add/unfusion when `capacidad_total_local` exceeded; toast "Aforo completo. Libere mesas primero." — **editor** is blocked; **admin** can override with warning (admin decides if desfusion is needed and finds a solution)
- **Dual occupancy calculation**: Mode 1 (auto) = `sum(capacidad_actual WHERE mesa_padre_id IS NULL)` from mesas; Mode 2 (manual) = admin input field with total occupation number, overrides auto calculation. Default is auto; admin can switch to manual.
- **Table status colors**: Libre (#22C55E), Ocupada (#EF4444), Reservada (#F59E0B) — derived from `reservas` state
- **Aforo indicator**: live progress bar + numeric counter
- **Canvas (Konva.js)**: 3-layer (background/main/drag), cached zones, 60 FPS
- **Realtime sync**: Supabase channel `mesas-realtime`
- **Route**: `/cocina/reservas` (SPA, client-only, middleware-protected)

### Out of Scope
- Drag-to-select multiple tables for bulk operations
- Zone CRUD (fixed 5 zones; configurable deferred)
- Client-facing table selector (`cliente_elige_mesa` — gated behind CFG-001 toggle, deferred)
- SMS/email notification implementation (interface only; actual transport deferred)
- Table snap-to-grid alignment
- Undo/redo history

## Capabilities

### New Capabilities
- `mesas-canvas`: Interactive Konva.js table manager — 5 zones, drag/resize/rotate, status colors, realtime sync at `/cocina/reservas`
- `mesas-fusion`: Table fusion/unfusion with same-zone constraint, capacity formula, standby reservations, floating banner, aforo overflow enforcement

### Modified Capabilities
- `panel-schema`: Add `mesas` table (8th table), add `standby` to `reservas.estado` domain, RLS policies + Realtime publication
- `panel-configuracion`: Read `capacidad_total_local` for aforo overflow enforcement

## Approach

- **DB first**: Migration creates `mesas` table, updates `reservas.estado` CHECK constraint, enables Realtime
- **Konva on-demand**: `konva@10.3.0` + `vue-konva@3.4.0` loaded client-only (SPA route)
- **Vertical slice**: `app/features/mesas/` — composables (`useMesasCanvas`, `useMesasFusion`), stores (Pinia), components (Canvas, Zone, TableNode, AforoIndicator)
- **Contracts in `shared/`**: `mesas.contract.ts`, `fusion.types.ts`
- **TDD**: unit tests (Vitest) for fusion math, aforo calc, zone constraint; integration (@nuxt/test-utils) for store ↔ DB; e2e (Playwright) for canvas interaction
- **3-layer canvas**: background (cached zones, non-interactive), main (tables, interactive), drag (temporary)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| DB | New | `mesas` table + RLS + Realtime; `reservas.estado` CHECK constraint |
| `app/features/mesas/` | New | Vertical slice: composables, stores, components |
| `shared/contracts/` | New | `mesas.contract.ts`, `fusion.types.ts` |
| `app/pages/cocina/reservas.vue` | Modified | Replace placeholder with canvas + controls |
| `nuxt.config.ts` | Modified | Add Konva/vue-konva Vite externals if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fusion capacity miscalculation causes real-world overbooking | Medium | Pure-function tested; formula locked in spec |
| Realtime race condition: two admins fuse same tables simultaneously | Medium | Supabase Realtime last-write-wins; optimistic UI + server-side validation |
| Canvas perf < 60 FPS with 50+ tables | Low | 3-layer architecture; `perfectDrawEnabled: false`; `listening: false` on background; batchDraw |
| Standby reservations forgotten (no reassignment) | Medium | Floating banner on canvas persists until admin resolves |

## Rollback Plan

1. Delete `mesas` table migration (revert script)
2. Remove `standby` from `reservas.estado` CHECK constraint
3. Remove Konva/vue-konva dependencies from `package.json`
4. Revert `/cocina/reservas` page to placeholder
5. Remove `app/features/mesas/` slice

## Dependencies

- `panel-auth` (Change #3) — Supabase Auth + middleware chain established
- `panel-schema` (Change #3) — 7 tables + RLS foundation
- `panel-configuracion` (Change #3) — `capacidad_total_local` available

## Success Criteria

- [ ] Admin can create/edit/delete/move/resize/rotate tables on canvas
- [ ] Fusion: N tables (same zone) with correct capacity formula and visual union
- [ ] Unfusion: restores original tables; standby reservations shown on canvas
- [ ] Aforo enforcement blocks add/unfusion when capacity exceeded (editor blocked, admin can override)
- [ ] Dual occupancy: auto-calculate from mesas OR manual input from admin
- [ ] Realtime sync: change in one session visible in another within 1s
- [ ] 60 FPS canvas rendering
- [ ] All tests pass with ≥ 70% coverage (TDD)
