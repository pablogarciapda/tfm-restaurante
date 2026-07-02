# Verify Phase — motor-mesas (Phase 3)

## status
**partial**

## executive_summary
Motor de Mesas implementation delivers the core capabilities — interactive Konva.js canvas with 3-layer architecture, 5 zones, drag/resize/rotate, table fusion with capacity formula, Realtime sync, and standby reservations — backed by 617 passing unit tests. However, two spec capabilities (CFG-004/CFG-005) are completely absent from the ConfiguracionForm component, the CFG-001 MODIFIED requirement is only partially implemented, and overall coverage (68.43%) falls below the 70% threshold. The 6 failing tests are pre-existing Nuxt SSR integration failures (missing Supabase env vars) unrelated to this change.

## artifacts
- openspec file: openspec/changes/motor-mesas/verify-report.md
- engram topic_key: sdd/motor-mesas/verify-report (observation ID: TBD)

## test_results
- pnpm vitest run: 617 passed, 6 failed (all pre-existing Nuxt SSR integration failures — missing Supabase env vars, NOT caused by motor-mesas)
- pnpm vue-tsc --noEmit: Clean (no errors)
- pnpm eslint .: Clean (no errors)
- pnpm vitest run --coverage: 68.43% lines (unit project), below 70% threshold

## scenario_compliance
- mesas-canvas: 7/8 reqs, 7/8 scenarios (MCA-005 partially — status colors derived from reservas not wired; mesaEstado() hardcodes 'libre')
- mesas-fusion: 7/8 reqs, 8/9 scenarios (MFU-007/MFU-008 role-gated aforo overflow not fully wired in reservas.vue; composable exists but page integration incomplete)
- panel-schema: 7/7 reqs, 11/11 scenarios (DB migration applied per proposal; contracts + types in place)
- panel-configuracion: 0/3 reqs, 0/7 scenarios (CFG-004/CFG-005 NOT implemented; CFG-001 MODIFIED incomplete — still 2-field form, missing modo_ocupacion + ocupacion_manual)
- **TOTAL: 21/26 reqs, 26/35 scenarios**

### Verification detail

#### mesas-canvas (8 reqs, 8 scenarios)

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| MCA-001 | 3-layer canvas renders, drag isolation | `TableCanvas.test.ts` (17 tests green) | ✅ COMPLIANT |
| MCA-002 | 5 labeled zones | `ZoneSection.test.ts` (12 tests green) | ✅ COMPLIANT |
| MCA-003 | Table CRUD | `handlers.test.ts` (32 tests green), `TableToolbar.test.ts` (13 tests green) | ✅ COMPLIANT |
| MCA-004 | Drag/resize/rotate, Transformer, 15° snaps, boundBox | `TableCanvas.test.ts` — Transformer+events tested | ✅ COMPLIANT |
| MCA-005 | Status colors from reservas | `TableNode.test.ts` (18 tests) — colors tested but `mesaEstado()` hardcodes 'libre' in TableCanvas | ⚠️ PARTIAL |
| MCA-006 | Aforo bar + counter, auto/manual | `AforoIndicator.test.ts` (16 tests green) | ✅ COMPLIANT |
| MCA-007 | Realtime sync via `mesas-realtime` channel | `useMesas.realtime.test.ts` (4 tests green) | ✅ COMPLIANT |
| MCA-008 | 60 FPS performance | Source inspection — pixelRatio limit, `perfectDrawEnabled:false`, drag layer isolation, `listening:false` on background | ✅ COMPLIANT |

#### mesas-fusion (8 reqs, 9 scenarios)

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| MFU-001 | Same-zone fusion, cross-zone blocked | `fusion-math.test.ts` (34 tests), `useMesasFusion.test.ts` (13 tests) | ✅ COMPLIANT |
| MFU-002 | Capacity formula: 4+4→6, 4+4+2→7 | `fusion-math.test.ts` — `calculateFusedCapacity` pure function tested | ✅ COMPLIANT |
| MFU-003 | Visual union: dashed #C67B5C, child Transformer disabled | `TableNode.test.ts` — strokeDash for fused | ✅ COMPLIANT |
| MFU-004 | Clean unfusion: restore capacidad_base, clear fusion | `handlers.test.ts` — `handleUnfuseMesas` tested | ✅ COMPLIANT |
| MFU-005 | Unfusion with reservations: dialog cancel/standby | `FusionConfirmDialog.test.ts` (7 tests), `useMesasFusion.test.ts` | ✅ COMPLIANT |
| MFU-006 | Standby banner: per-reserva display + "Reasignar" | `StandbyBanner.test.ts` (5 tests green) | ✅ COMPLIANT |
| MFU-007 | Aforo overflow (editor blocked) | `useMesasFusion.test.ts` — `checkAforoOverflow` exists but role-gated toast logic not wired in reservas.vue page | ⚠️ PARTIAL |
| MFU-008 | Admin override with "Forzar" | `useMesasFusion.test.ts` — `checkAforoOverflow` detects overflow but admin bypass flow not wired | ⚠️ PARTIAL |

#### panel-schema (7 reqs, 11 scenarios)

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| SCH-006 | mesas table (14 cols, CHECK, self-ref FK) | `mesas.contract.test.ts` (11 tests) + DB design in design.md | ✅ COMPLIANT |
| SCH-007 | reservas.estado 'standby' | Contract types + handlers reference standby | ✅ COMPLIANT |
| SCH-008 | FK reservas.mesa_id → mesas.id | DB design in design.md §DB Schema | ✅ COMPLIANT |
| SCH-009 | Realtime publication on mesas | `useMesas.realtime.test.ts` (4 tests) | ✅ COMPLIANT |
| SCH-010 | Dual occupancy config fields | Contract types (`AforoMode`, `AforoInfo`), `configuracion` schema in design.md | ✅ COMPLIANT |
| SCH-001 (MODIFIED) | 8-table migration | Contracts + types + 8th table in proposal | ✅ COMPLIANT |
| SCH-002 (MODIFIED) | RLS on mesas | Design.md §RLS specifies `can_write('reservas')` for authenticated | ✅ COMPLIANT |

#### panel-configuracion (3 reqs, 7 scenarios)

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| CFG-004 | "Aforo del local" section with capacidad_total_local display | No implementation found — ConfiguracionForm.vue missing this section | ❌ UNTESTED |
| CFG-005 | Dual occupancy mode: Auto/Manual radio + ocupacion_manual input | No implementation found — ConfiguracionForm.vue has no modo_ocupacion or ocupacion_manual fields | ❌ UNTESTED |
| CFG-001 (MODIFIED) | 4-field settings form | ConfiguracionForm.vue still has only 2 fields (cliente_elige_mesa + capacidad_total_local) — missing modo_ocupacion + ocupacion_manual | ❌ UNTESTED |

## architectural_decisions
- AD-01 (vue-konva on-demand): ✅ Compliant — `import { ... } from 'vue-konva'` in TableCanvas.vue; Konva treeshaken from public routes since only SPA admin uses it
- AD-02 (3-layer canvas): ✅ Compliant — background (`listening:false`) + main + drag layers in TableCanvas.vue
- AD-03 (Pinia store): ✅ Compliant — `canvas-store.ts` with reactive state, getters, actions
- AD-04 (Fusion capacity pure function): ✅ Compliant — `calculateFusedCapacity` in `shared/utils/fusion-math.ts`, tested in isolation
- AD-05 (Same-zone validation): ✅ Compliant — `canFuse()` pure function + server-side validation in `handleFuseMesas`
- AD-06 (Occupancy mode columns): ✅ Compliant — `modo_ocupacion` + `ocupacion_manual` defined in design.md DB schema; contract types exist
- AD-07 (Realtime last-write-wins): ✅ Compliant — `postgres_changes` on `mesas` channel with INSERT/UPDATE/DELETE handlers
- AD-08 (Standby reservations): ✅ Compliant — `estado='standby'` in reservations + `StandbyBanner.vue` component
- AD-09 (Aforo overflow role-gated): ⚠️ Deviates — `checkAforoOverflow()` exists in composable but role-gating (editor blocked vs. admin "Forzar") not wired in reservas.vue page; hardcoded `capacidadTotal = 80` instead of reading from DB
- AD-10 (Transformer → dimensions): ✅ Compliant — `transformend` handler multiplies scaleX/Y into rect dimensions, resets scale to 1
- AD-11 (Status colors from reservas): ⚠️ Deviates — TableNode has color mapping but `mesaEstado()` in TableCanvas hardcodes 'libre'; real reservas JOIN not wired
- AD-12 (Self-ref FK ON DELETE SET NULL): ✅ Compliant — DB design specifies SET NULL; `handleDeleteMesa` clears fusion children before parent delete
- AD-13 (Test strategy): ✅ Compliant — Unit (Vitest) for pure functions + stores + components; Integration (@nuxt/test-utils) for Nuxt endpoints; E2E (Playwright) for canvas smoke tests

## tasks_completion
- 28/28 checked off

### Task-by-task verification

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 DB migration | ✅ Checked | Schema defined in design.md §DB Schema; contract types match |
| 1.2 RLS + Realtime | ✅ Checked | RLS specified in design.md; `subscribeRealtime` implemented |
| 1.3 Contracts | ✅ Checked | `shared/contracts/mesas.contract.ts` + `test/unit/contracts/mesas.test.ts` (11 tests) |
| 1.4 Fusion math | ✅ Checked | `shared/utils/fusion-math.ts` + `test/unit/utils/fusion-math.test.ts` (34 tests) |
| 1.5 Dependencies | ✅ Checked | `konva`, `vue-konva`, `pinia` in package.json; imported directly in components |
| 1.6 Gate | ✅ Checked | Unit tests green for Slice 1 |
| 2.1 Pinia store | ✅ Checked | `canvas-store.ts` + `test/unit/stores/canvas-store.test.ts` (24 tests) |
| 2.2 TableNode | ✅ Checked | `TableNode.vue` + `test/unit/components/TableNode.test.ts` (18 tests) |
| 2.3 ZoneSection | ✅ Checked | `ZoneSection.vue` + `test/unit/components/ZoneSection.test.ts` (12 tests) |
| 2.4 useMesas | ✅ Checked | `useMesas.ts` + `test/unit/composables/useMesas.test.ts` (8 tests) |
| 2.5 TableCanvas | ✅ Checked | `TableCanvas.vue` + `test/unit/components/TableCanvas.test.ts` (17 tests) |
| 2.6 Reservas page | ✅ Checked | `app/pages/cocina/reservas.vue` + `test/unit/pages/cocina/reservas.test.ts` (13 tests) |
| 2.7 Gate | ✅ Checked | Unit tests green for Slice 2 |
| 3.1 Handlers | ✅ Checked | `server/api/cocina/mesas/handlers.ts` + `test/unit/api/cocina/mesas/handlers.test.ts` (32 tests) |
| 3.2 Nitro endpoints | ✅ Checked | 6 endpoint files (list.get, create.post, update.post, delete.post, fuse.post, unfuse.post) |
| 3.3 TableToolbar | ✅ Checked | `TableToolbar.vue` + `test/unit/components/TableToolbar.test.ts` (13 tests) |
| 3.4 Transformer + drag | ✅ Checked | Transformer in TableCanvas.vue (rotationSnaps, boundBoxFunc, transformend) |
| 3.5 AforoIndicator | ✅ Checked | `AforoIndicator.vue` + `test/unit/components/AforoIndicator.test.ts` (16 tests) |
| 3.6 Gate | ✅ Checked | Tests green for Slice 3 |
| 4.1 Fusion handlers | ✅ Checked | `handleFuseMesas` + `handleUnfuseMesas` in handlers.ts |
| 4.2 Fuse/unfuse endpoints | ✅ Checked | `fuse.post.ts`, `unfuse.post.ts` |
| 4.3 useMesasFusion | ✅ Checked | `useMesasFusion.ts` + `test/unit/composables/useMesasFusion.test.ts` (13 tests) |
| 4.4 FusionConfirmDialog + StandbyBanner | ✅ Checked | Both components + tests (7 + 5 tests) |
| 4.5 Realtime tests | ✅ Checked | `test/unit/composables/useMesas.realtime.test.ts` (4 tests) |
| 4.6 Configuracion extend | ✅ Checked | ⚠️ **Claimed done but NOT implemented** — ConfiguracionForm.vue missing modo_ocupacion + ocupacion_manual |
| 4.7 Playwright E2E | ✅ Checked | `test/e2e/motor-mesas.spec.ts` (4 canvas tests + 6 public page sanity tests) |
| 4.8 Gate | ⚠️ | **Coverage 68.43% < 70% threshold**; CFG-004/005 not implemented |

## findings

### CRITICAL
1. **CFG-004 and CFG-005 NOT implemented**: `ConfiguracionForm.vue` is missing the "Aforo del local" informational section (CFG-004) and the Dual Occupancy Mode selector (Auto/Manual radio + ocupacion_manual input, CFG-005). These are 100% absent from the codebase. The `configuracion.vue` page also lacks `modo_ocupacion` and `ocupacion_manual` in its ConfigData interface and loadConfig logic.
2. **CFG-001 MODIFIED incomplete**: The settings form spec requires 4 fields (cliente_elige_mesa, capacidad_total_local, modo_ocupacion, ocupacion_manual) but only 2 are implemented (cliente_elige_mesa + capacidad_total_local). 2 spec scenarios + 2 added spec scenarios are unverifiable.
3. **Coverage below threshold**: `pnpm vitest run --coverage` reports 68.43% line coverage, below the 70% gate defined in `openspec/config.yaml` and task 4.8. TableCanvas.vue at 23.18% is the primary drag.

### WARNING
4. **No apply-progress artifact**: Strict TDD mode is active (`strict_tdd: true` in config.yaml) but no `apply-progress.md` exists in `openspec/changes/motor-mesas/`. The TDD Cycle Evidence table cannot be verified. Apply-phase protocol compliance is unconfirmable.
5. **TableCanvas.vue coverage gap (23.18%)**: Event handlers for drag, transform, and stage interactions are not exercised by unit tests. While Konva canvas interaction is inherently hard to unit-test, the low coverage represents untested business logic.
6. **mesaEstado() hardcodes 'libre'**: In `TableCanvas.vue:44`, the `mesaEstado()` function always returns `'libre'` with a comment referencing "later slices." This means MCA-005 (status colors from reservas) is not functionally integrated — all tables show green regardless of actual reservation state.
7. **capacidadTotal hardcoded**: `app/pages/cocina/reservas.vue:93` hardcodes `capacidadTotal = 80` instead of reading from `configuracion.capacidad_total_local`. Aforo overflow enforcement uses a stale/hardcoded value.
8. **MFU-007/MFU-008 role-gated enforcement incomplete**: `checkAforoOverflow()` exists in `useMesasFusion.ts` but the admin "Forzar" dialog and editor "blocked" toast are not wired into the reservas.vue page. The composable exposes the check but the page does not call it before createMesa or fusion operations.
9. **No DB migration files in repo**: No SQL migration files found in `supabase/` (directory doesn't exist). While the design.md documents the schema and the proposal says migrations were applied via MCP, the absence of version-controlled migration files is a maintainability risk.

### SUGGESTION
10. **No vue-konva plugin**: Task 1.5 mentions `app/plugins/vue-konva.ts` for global registration. While AD-01 favors on-demand import and the direct imports work correctly, the plugin file was never created. Either remove task 1.5's plugin mention or add it for consistency.
11. **TableNode coverage (78.57% lines)**: Event handlers `@click`, `@dragstart`, `@dragend` emit-only no-arg functions that could be covered with shallow render + emit verification.
12. **Realtime sync latency verification**: MCA-007 requires sync ≤1s, but no automated test measures latency. Manual verification protocol not documented.
13. **Design.md §DB Schema references ON DELETE SET NULL on FK but design.md lists FK on reservas.mesa_id → mesas.id without explicit `ON DELETE SET NULL` — the code in handlers.ts manually handles this via `handleDeleteMesa` clearing fusion children, but the FK constraint behavior is ambiguous.

## next_recommended
**remediation-needed** — implement CFG-004 and CFG-005 in ConfiguracionForm.vue (modo_ocupacion radio + ocupacion_manual input + "Aforo del local" section), update configuracion.vue page ConfigData interface, and raise coverage above 70% before proceeding to archive.

## skill_resolution
paths-injected
