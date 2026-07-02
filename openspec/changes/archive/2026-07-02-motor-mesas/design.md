# Design: Motor de Mesas (Phase 3)

## Technical Approach

Konva.js 3-layer canvas replaces `/cocina/reservas` placeholder. Vertical slice `app/features/mesas/` with on-demand vue-konva import (SPA-only route, no SSR concern). Pinia store holds canvas state (selected mesa, fusion mode, occupancy mode). Nitro server routes proxy CRUD/fusion via `serverSupabaseServiceRole`. Supabase Realtime `mesas-realtime` channel syncs across admin sessions. DB migration adds `mesas` table (self-ref FK ON DELETE SET NULL), `standby` estado on reservas, dual-occupancy config columns. TDD: pure functions in Vitest, store↔DB in @nuxt/test-utils, canvas in Playwright.

## Architecture Decisions

| # | Decision | Choice | Tradeoff | Rationale |
|---|----------|--------|----------|-----------|
| AD-01 | **vue-konva loading** | On-demand import in `TableCanvas.vue` | Global plugin simpler but bloats bundle for non-admin routes | Only `/cocina/reservas` needs Konva; tree-shaking preserves public-page perf |
| AD-02 | **Canvas architecture** | 3-layer: background (`listening:false`, cached) + main (interactive) + drag (temporary) | 3 layers add one canvas vs 2-layer approach | 60 FPS requirement (MCA-008). Drag layer avoids re-rendering all tables during drag; standard vue-konva pattern |
| AD-03 | **Canvas state** | Pinia store (`canvas-store.ts`) | `useState` simpler but no devtools or actions | Interactive editor with fusion mode and multi-select justifies devtools debugging surface |
| AD-04 | **Fusion capacity** | Pure function `floor(sum(capacidad_base) × 0.75)` in `shared/utils/fusion-math.ts` | DB trigger enforces server-side but is opaque and untestable | TDD-first; pure function tested in isolation per MFU-002 scenarios |
| AD-05 | **Same-zone enforcement** | DB CHECK IN(5 zones) + composable pre-check with toast | App-only validation is fragile against direct DB access | Defense-in-depth; `canFuse()` composable rejects cross-zone before mutation (MFU-001) |
| AD-06 | **Occupancy mode** | Two columns on singleton `configuracion`: `modo_ocupacion` + `ocupacion_manual` | Separate table normalizes but adds join | Already-singleton table; single fetch covers all config (SCH-010) |
| AD-07 | **Realtime strategy** | Supabase `postgres_changes` last-write-wins | CRDT correct but complex overkill | Low-contention restaurant; optimistic UI + server validation mitigates races per proposal |
| AD-08 | **Standby reservations** | `reservas.estado='standby'` + floating `StandbyBanner.vue` component | Separate `reservas_standby` table cleaner but migration-heavy | Single table + CHECK constraint update (SCH-007); banner queries `WHERE estado='standby'` |
| AD-09 | **Aforo overflow** | Composables `checkAforo()` checks role before blocking | Middleware uniform but cannot show UI feedback | Editor=blocked toast, admin=warning+"Forzar" per MFU-007/008; composable reads `useState('cocina-role')` |
| AD-10 | **Transformer → dimensions** | `transformend`: multiply scaleX/Y into rect width/height, reset scale to 1 | Tracking scale in reactive state creates dual-source-of-truth bugs | Konva standard approach; pattern from `vue-konva-patterns.md` §5 |
| AD-11 | **Status colors** | Derived from reservas JOIN on render, refreshed via Realtime | Stored column on mesas faster but drifts | Always-fresh guarantees MCA-005 Libre→Ocupada→Reservada transitions across sessions |
| AD-12 | **Self-ref FK** | `mesa_padre_id REFERENCES mesas(id) ON DELETE SET NULL` | CASCADE destroys children on parent delete | SET NULL preserves orphaned tables on unfusion; matches MFU-004 restore semantics |
| AD-13 | **Test strategy** | Unit (Vitest) + Integration (@nuxt/test-utils) + E2E (Playwright) + Manual (Realtime) | — | Pure functions→Vitest. Store↔DB/Nitro→@nuxt/test-utils. Canvas→Playwright. Realtime→manual per MCA-007 |

## Sequence Diagrams

### Fusion + Unfusion
```
Admin       TableCanvas     useMesasFusion    Nitro /fuse|unfuse    DB      Realtime
 │              │                 │                  │               │          │
 │─select N───▶│                 │                  │               │          │
 │─"Fusionar"─▶│──canFuse()─────▶│ same-zone?✓      │               │          │
 │              │                 │─calc=floor(Σ×0.75)              │          │
 │              │$fetch─────────────────────────────▶│──UPDATE────▶│          │
 │              │                 │                  │◀──ok────────│          │
 │◀────────────────────broadcast postgres_changes─────────────────────────────│
 │              │                 │                  │               │          │
 │─"Desfusionar"▶───hasReservas? │                  │               │          │
 │              │─dialog────────▶│ cancel/standby   │               │          │
 │              │$fetch─────────────────────────────▶│──UPDATE────▶│          │
```

### Drag & Real-time Sync
```
Session A    Drag Layer    Main Layer    Nitro /update     DB     Session B
 │              │              │              │            │          │
 │─dragstart───▶│ moveTo()     │              │            │          │
 │─dragend─────▶│ moveTo()────▶│              │            │          │
 │              │              │─$fetch──────▶│─UPDATE────▶│          │
 │              │              │              │            │─pg_changes────────▶│
 │              │              │              │            │          canvas update
```

### Aforo Overflow (role-gated)
```
User    useMesasFusion    roleState    Toast/Overlay
 │           │                │              │
 │─add mesa─▶│                │              │
 │           │─SUM(actual)+new > capacidad?   │
 │           │  role=editor?──▶│──────────────▶ "Aforo completo"
 │           │  role=admin?───▶│──────────────▶ warning→"Forzar"→continue
```

## Component Architecture

```
app/pages/cocina/reservas.vue        ← Main page (replaces placeholder)
app/features/mesas/
├── components/
│   ├── TableCanvas.vue              Stage + 3 layers + event wiring
│   ├── TableToolbar.vue             Add/fuse/unfuse/delete buttons + aforo
│   ├── TableNode.vue                Single table: Group(Rect+Text+status fill)
│   ├── ZoneSection.vue              Zone bg rectangle + label
│   ├── AforoIndicator.vue           Progress bar + counter (dual-mode label)
│   ├── StandbyBanner.vue            Per-standby reserva floating banner
│   └── FusionConfirmDialog.vue      Unfusion confirmation (cancel/standby)
├── composables/
│   ├── useMesas.ts                  CRUD + Realtime subscription on mesas
│   └── useMesasFusion.ts            Fusion math + unfusion + standby + aforo check
└── stores/
    └── canvas-store.ts              Pinia: selectedId, fusionMode, occupancyMode
shared/contracts/mesas.contract.ts   Mesa, FusionGroup, Zona (5-literal union)
shared/utils/fusion-math.ts          calculateFusedCapacity, canFuse, getAforoDisponible
```

## Nitro Endpoints

All under `server/api/cocina/mesas/` using `serverSupabaseServiceRole`:

| File | Method | Handler |
|------|--------|---------|
| `list.get.ts` | GET | Fetch all mesas rows |
| `create.post.ts` | POST | Insert mesa (validate zone, aforo) |
| `update.post.ts` | POST | Update position/size/rotation/capacity/zona |
| `delete.post.ts` | POST | Delete (SET NULL on children if fusion parent) |
| `fuse.post.ts` | POST | Validate same-zone, compute capacity, UPDATE id_fusion+mesa_padre_id |
| `unfuse.post.ts` | POST | Check reservas, move to standby or cancel, clear fusion fields |
| `handlers.ts` | — | Pure handler functions (testable, following existing `usuarios/handlers.ts` pattern) |

## DB Schema

```sql
CREATE TABLE mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_mesa int NOT NULL,
  capacidad_base int NOT NULL CHECK (capacidad_base >= 1),
  posicion_x float NOT NULL DEFAULT 0,  posicion_y float NOT NULL DEFAULT 0,
  ancho float NOT NULL DEFAULT 100,     alto float NOT NULL DEFAULT 100,
  rotacion float NOT NULL DEFAULT 0,
  zona text NOT NULL CHECK (zona IN ('Principal','Zingaro','Privado','Terraza','Bar')),
  mesa_padre_id uuid REFERENCES mesas(id) ON DELETE SET NULL,
  id_fusion uuid,  capacidad_actual int NOT NULL DEFAULT capacidad_base,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
ALTER TABLE reservas ADD FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL;
ALTER TABLE configuracion ADD COLUMN modo_ocupacion text DEFAULT 'auto' CHECK (modo_ocupacion IN ('auto','manual'));
ALTER TABLE configuracion ADD COLUMN ocupacion_manual int CHECK (ocupacion_manual >= 0);
```

RLS: `can_write('reservas')` for INSERT/UPDATE/DELETE on mesas; anon=no access (SCH-008). `reservas.estado` CHECK constraint updated to include `'standby'`.

## Open Questions

- **Canvas responsive?** Fixed 1200×800 recommended for MVP. Responsive resize deferred.
- **Realtime on configuracion?** Currently only on page load. Syncing `capacidad_total_local` changes requires a second channel or polling — deferred.
