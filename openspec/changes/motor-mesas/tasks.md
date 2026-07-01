# Tasks: Motor de Mesas (Phase 3)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,000 across 4 slices |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 (feature-branch-chain) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + RLS + Realtime + contracts + fusion-math + deps | PR 1 | base: feature/motor-mesas; zero UI |
| 2 | Canvas core: 3-layer Konva, TableNode, ZoneSection, Pinia store | PR 2 | base: PR 1 branch |
| 3 | CRUD toolbar + Transformer + Drag bounds + Aforo + Nitro endpoints | PR 3 | base: PR 2 branch |
| 4 | Fusion/unfusion + standby + Realtime sync + E2E + config update + gate | PR 4 | base: PR 3 branch |

---

## 1. DB Foundation (PR 1 — ~450 lines)

- [x] 1.1 [DB] Migration: CREATE TABLE `mesas` (14 cols, self-ref FK `mesa_padre_id→mesas(id) ON DELETE SET NULL`). FK `reservas.mesa_id→mesas(id)`. `reservas.estado` CHECK add `'standby'`. `configuracion` ADD `modo_ocupacion` + `ocupacion_manual`. (SCH-006/007/008/010)
- [x] 1.2 [DB] RLS on `mesas`: `can_write('reservas')` for write, anon no access. `ALTER PUBLICATION supabase_realtime ADD TABLE mesas`. (SCH-002/009)
- [x] 1.3 [TDD:RED→GREEN] `shared/contracts/mesas.contract.ts`: `Mesa`, `Zona` (5-literal), `OcupacionMode`, `FusionGroup`. `test/unit/contracts/mesas.contract.test.ts`. (SCH-006)
- [x] 1.4 [TDD:RED→GREEN] `shared/utils/fusion-math.ts`: `calculateFusedCapacity(base[])`→`floor(sum×0.75)`, `canFuse(tables[])`→same-zone check, `getAforo(rootMesas)`. Test: 4+4→6, 4+4+2→7, cross-zone→false. (MFU-001/002)
- [x] 1.5 [SETUP] `pnpm add konva vue-konva pinia @pinia/testing`. `app/plugins/vue-konva.ts` (register globally, SPA-only route). (AD-01)
- [x] 1.6 [GATE] `pnpm vitest run` green; security advisor no RLS leaks.

## 2. Canvas Core (PR 2 — ~550 lines)

- [ ] 2.1 [TDD:RED→GREEN] `app/stores/canvas-store.ts` (Pinia): `selectedId`, `fusionMode`, `occupancyMode`, `mesas[]`. `test/unit/stores/canvas-store.test.ts`. (AD-03)
- [ ] 2.2 [TDD:RED→GREEN] `app/features/mesas/components/TableNode.vue`: `v-group(Rect+Text(num,pax))`, status fill from reservas (#22C55E/#EF4444/#F59E0B). Test: color transitions. (MCA-005)
- [ ] 2.3 [TDD:RED→GREEN] `app/features/mesas/components/ZoneSection.vue`: 5 labeled zone rects, background layer (`listening:false`, `cache()`). Test: zones render. (MCA-002)
- [ ] 2.4 [TDD:RED→GREEN] `app/features/mesas/composables/useMesas.ts`: `useAsyncData` from `server/api/cocina/mesas/list`. Realtime skeleton. `test/integration/composables/useMesas.test.ts`.
- [ ] 2.5 [TDD:RED→GREEN] `app/features/mesas/components/TableCanvas.vue`: `v-stage` 3-layer (bg `listening:false` + main + drag), `v-for`→TableNode on main layer, `perfectDrawEnabled:false`, `batchDraw`. Test: renders tables. (MCA-001/008)
- [ ] 2.6 Replace `app/pages/cocina/reservas.vue` placeholder → `TableCanvas` + `canvas-store`, `ClientOnly` wrapper.
- [ ] 2.7 [GATE] `/cocina/reservas` renders zones + tables; vitest green.

## 3. CRUD + Toolbar + Aforo (PR 3 — ~500 lines)

- [ ] 3.1 [TDD:RED→GREEN] `server/api/cocina/mesas/handlers.ts`: `handleList`, `handleCreate` (aforo check), `handleUpdate`, `handleDelete` (SET NULL children). Pattern: `usuarios/handlers.ts`. (MCA-003)
- [ ] 3.2 [TDD:RED→GREEN] Nitro: `list.get.ts`, `create.post.ts`, `update.post.ts`, `delete.post.ts` → wire handlers + `serverSupabaseServiceRole`. `test/integration/server/mesas-crud.test.ts`.
- [ ] 3.3 [TDD:RED→GREEN] `app/features/mesas/components/TableToolbar.vue`: "Nueva mesa"/"Eliminar"/"Fusionar"/"Desfusionar" buttons, delete confirm dialog. Wire to `useMesas`. Test: CRUD trigger. (MCA-003)
- [ ] 3.4 [TDD:RED→GREEN] Transformer + drag in `TableCanvas.vue`: `v-transformer` `rotationSnaps`(15°), `boundBoxFunc`(min 40×40), `dragBoundFunc`. `transformend`→scale→dims→persist. Drag isolation to drag layer. Test: resize, rotate, drag. (MCA-004)
- [ ] 3.5 [TDD:RED→GREEN] `app/features/mesas/components/AforoIndicator.vue`: bar + counter. Auto: `SUM(capacidad_actual WHERE mesa_padre_id IS NULL)`. Manual: reads `ocupacion_manual`. Toggle "Automático"/"Manual". Test: dual mode. (MCA-006)
- [ ] 3.6 [GATE] Full CRUD + drag/resize/rotate persist; aforo updates live.

## 4. Fusion + Realtime + E2E (PR 4 — ~500 lines)

- [ ] 4.1 [TDD:RED→GREEN] `server/api/cocina/mesas/handlers.ts` add `handleFuse` (same-zone, calc capacity), `handleUnfuse` (standby/cancel). Aforo: editor blocked, admin warning. (MFU-001/004/005/007/008)
- [ ] 4.2 [TDD:RED→GREEN] Nitro: `fuse.post.ts`, `unfuse.post.ts`. `test/integration/server/mesas-fusion.test.ts`.
- [ ] 4.3 [TDD:RED→GREEN] `app/features/mesas/composables/useMesasFusion.ts`: `canFuse()`, `checkAforo()`, role-gated toast. `test/unit/composables/useMesasFusion.test.ts`. (MFU-001/007/008)
- [ ] 4.4 [TDD:RED→GREEN] `FusionConfirmDialog.vue`: "Hay reservas activas" → cancelar+notificar / mover a standby. `StandbyBanner.vue`: per-standby banner + "Reasignar". Tests. (MFU-003/005/006)
- [ ] 4.5 [TDD:RED→GREEN] Realtime: expand `useMesas.ts` with `postgres_changes` on `mesas`, sync ≤1s, channel cleanup. `test/unit/composables/useMesas.realtime.test.ts`. (MCA-007)
- [ ] 4.6 [TDD:RED→GREEN] `app/pages/cocina/configuracion.vue` extend: `modo_ocupacion` radio + `ocupacion_manual` input (max ≤ capacidad_total_local). (CFG-004/005, CFG-001 MODIFIED)
- [ ] 4.7 [TDD:RED→GREEN] Playwright E2E: `test/e2e/motor-mesas.spec.ts` — create+move+delete table, fuse 2 tables, unfuse→standby, editor blocked, admin override. (MCA-003/004, MFU-001/005/007/008)
- [ ] 4.8 [GATE] `pnpm vitest run --coverage` ≥70%; Playwright green; 26 reqs + 35 scenarios pass; canvas FPS manual verify.
