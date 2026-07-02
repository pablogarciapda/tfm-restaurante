# mesas-canvas Specification

## Purpose

Konva.js table manager at `/cocina/reservas` (SPA). 5 zones, drag/resize/rotate, status colors, dual-mode aforo, Realtime sync, 60 FPS.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| MCA-001 | 3-layer Konva stage: background (cached zones, `listening:false`), main (tables + Transformer), drag (temporary) | MUST |
| MCA-002 | 5 labeled semi-transparent zones: Principal, Zingaro, Privado, Terraza, Bar. Each mesa assigned to one zona | MUST |
| MCA-003 | Table CRUD: create (default 100×100), edit (número, capacidad, zona), delete (confirm "¿Eliminar Mesa {n}?") | MUST |
| MCA-004 | Drag (bounded), resize (Transformer, min 40×40 via `boundBoxFunc`), rotate (Transformer, 15° snaps). `transformend`: apply scale→dimensions, reset scale, persist | MUST |
| MCA-005 | Status colors from reservas: Libre #22C55E (no reserva), Ocupada #EF4444 (confirmada, current), Reservada #F59E0B (pendiente, future) | MUST |
| MCA-006 | Aforo bar + counter. Auto: `SUM(capacidad_actual WHERE mesa_padre_id IS NULL)`. Manual: admin input. Default auto | MUST |
| MCA-007 | Realtime via `mesas-realtime` channel (`postgres_changes` on mesas). Sync ≤1s. Channel removed on unmount | MUST |
| MCA-008 | 60 FPS via `cache()`, `listening:false`, `perfectDrawEnabled:false`, `batchDraw`, drag layer isolation | SHOULD |

### Requirement: MCA-001 — Canvas Architecture

3-layer `Stage`: background (cached zones, `listening:false`), main (table groups + Transformer), drag layer (holds shape during drag to avoid re-rendering all tables).

#### Scenario: Layers render, drag isolation

- GIVEN admin at `/cocina/reservas`
- WHEN page mounts → 3-layer Stage renders with zones and table shapes from DB
- AND when dragging a table → shape moves to drag layer, returns to main on `dragend`

### Requirement: MCA-002 — Five Zones

Each mesa has `zona` text (CHECK IN 5 values). Zones rendered as labeled semi-transparent rectangles on background layer.

#### Scenario: Zone placement

- GIVEN mesas with zona values
- WHEN canvas renders → 5 labeled zone rectangles appear
- AND each table renders inside its assigned zone area

### Requirement: MCA-003 — Table CRUD

Create: **"+ Nueva mesa"**. Delete: confirm dialog. Edit: número, capacidad, zona.

#### Scenario: Create/delete

- "+ Nueva mesa" → new mesa inserted (100×100, Libre, current zone), aforo recalculates
- Delete Mesa 5 → confirm "¿Eliminar Mesa 5?" → row deleted, Realtime broadcasts

### Requirement: MCA-004 — Interaction

`dragBoundFunc` keeps table in stage. Transformer: `boundBoxFunc` rejects <40×40, `rotationSnaps` at 15° increments. On `transformend`: multiply `scaleX/Y` into rect dims, reset scale to 1, persist.

#### Scenario: Drag/resize/rotate

- GIVEN drag Mesa 3 to x=200,y=150 → persisted, synced ≤1s
- GIVEN resize below 40×40 → `boundBoxFunc` returns oldBox
- GIVEN rotate table → snaps to nearest 15°

### Requirement: MCA-005 — Status Colors

| Status | Condition | Fill |
|--------|-----------|------|
| Libre | No active reserva | #22C55E |
| Ocupada | `estado='confirmada'` current service | #EF4444 |
| Reservada | `estado='pendiente'` future | #F59E0B |

Colors refresh on Realtime reservation changes.

#### Scenario: Color transition

- GIVEN Mesa 2 green → confirmada reserva created → fill #EF4444 across all sessions

### Requirement: MCA-006 — Aforo Indicator

Bar + counter ("45 / 80"). Toggle: **"Automático"** / **"Manual"**. Manual label: **"Ocupación manual"**.

#### Scenario: Auto vs manual

- GIVEN auto mode, aforo=30 → add 4-pax table → aforo shows 34
- GIVEN admin switches to manual, sets 50 → aforo shows 50 regardless of mesas

### Requirement: MCA-007 — Realtime Sync

Supabase channel `mesas-realtime`. On `postgres_changes` events (INSERT/UPDATE/DELETE), update local state without triggering unrelated re-renders.

#### Scenario: Cross-session sync

- GIVEN two sessions → Session A drags Mesa 1 → Session B sees movement ≤1s
- GIVEN admin leaves page → channel removed

### Requirement: MCA-008 — Performance

`cache()` on background, `listening:false` on static, `perfectDrawEnabled:false`, `batchDraw()`.

#### Scenario: 50-table at ≥55 FPS

- GIVEN 50 mesas loaded → pan/drag → no visible stutter

## Edge Cases

- Empty canvas: zones render, no tables, aforo "0 / N"
- Reconnect: full refetch on WebSocket reconnect
