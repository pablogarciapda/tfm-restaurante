# Reservation System — Complete Reference

> Comprehensive documentation of the La Zíngara reservation system for AI agents and developers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Turno System (Comida/Cena)](#3-turno-system-comidacena)
4. [Public Reservation Flow](#4-public-reservation-flow)
5. [Admin Reservation Management](#5-admin-reservation-management)
6. [Canvas System (Konva.js)](#6-canvas-system-konvajs)
7. [Table Fusion System](#7-table-fusion-system)
8. [Layout Persistence](#8-layout-persistence)
9. [Reassign Flow](#9-reassign-flow)
10. [Restore Original Design](#10-restore-original-design)
11. [Capacity / Aforo System](#11-capacity--aforo-system)
12. [Mesa State Derivation](#12-mesa-state-derivation)
13. [Key Files Reference](#13-key-files-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PUBLIC (SSR)                         │
│  /reservas → ReservationForm → POST /api/reservas      │
│  /cancelar → cancel by token                           │
└─────────────────────┬───────────────────────────────────┘
                      │ Supabase
┌─────────────────────┴───────────────────────────────────┐
│                  ADMIN (SPA, /cocina)                   │
│                                                         │
│  /cocina/reservas          /cocina/diseno               │
│  ┌──────────────────┐     ┌──────────────────┐         │
│  │ TableCanvas (Konva)│     │ TableCanvas (Konva)│         │
│  │ TableToolbar      │     │ TableToolbar      │         │
│  │ FusionDialog      │     │ Drawing tools     │         │
│  │ StandbyBanner     │     │ Background images │         │
│  │ AforoIndicator    │     │ Zoom controls     │         │
│  │ ReassignModal     │     │                   │         │
│  │ ReservationList   │     │                   │         │
│  └──────────────────┘     └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Stack:** Nuxt 4 (SSR public, SPA admin), Supabase (PostgreSQL + Realtime), Konva.js (Canvas 2D), Pinia stores.

**Key principle:** Reservations are **turn-scoped**. A mesa can have one reservation per turno (comida or cena) on the same date. The turno windows are configurable per restaurant.

---

## 2. Database Schema

### `reservas`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `fecha_hora` | timestamptz | Reservation datetime |
| `numero_comensales` | integer | Nullable |
| `estado` | text | `'pendiente'` \| `'confirmada'` \| `'cancelada'` \| `'completada'` \| `'standby'` |
| `mesa_id` | uuid | FK → mesas. Nullable = unassigned |
| `cliente_id` | uuid | FK → clientes |
| `zona_id` | text | Nullable. Zone name from `zonas_config` |
| `cancel_token` | uuid | Unique. For public cancellation link |
| `cancelado_en` | timestamptz | When cancelled |
| `cancelado_por` | text | `'camarero'` \| `'cliente'` |
| `created_at` | timestamptz | Default `now()` |

### `mesas`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `numero_mesa` | integer | Display number |
| `capacidad_base` | integer | Check 1..20 |
| `posicion_x` / `posicion_y` | numeric | Canvas coordinates |
| `ancho` / `alto` | numeric | Min 40 |
| `rotacion` | numeric | Degrees (0, 90, 180, 270) |
| `zona` | text | `'Principal'` \| `'Zíngaro'` \| `'Reservado'` \| `'Terraza'` \| `'Bar'` |
| `forma` | text | `'rectangular'` \| `'cuadrada'` \| `'redonda'` \| `'ovalada'` |
| `mesa_padre_id` | uuid | FK → mesas (self-ref). null = parent in fusion |
| `id_fusion` | uuid | Fusion group ID. null = not fused |
| `capacidad_actual` | integer | After fusion: fused capacity |

### `canvas_layouts`

| Column | Type | Notes |
|--------|------|-------|
| `fecha` | date | |
| `turno` | text | `'comida'` \| `'cena'` |
| `zona` | text | Zone name |
| `positions` | jsonb | `[{mesa_id, posicion_x, posicion_y, rotacion}]` |
| `fusions` | jsonb | `[{id_fusion, parent_id, capacity, mesa_ids[]}]` |
| **Unique** | | `(fecha, turno, zona)` — one layout per date+turn+zone |

### `configuracion` (reservation-relevant columns)

| Column | Type | Notes |
|--------|------|-------|
| `modo_reserva` | text | `'automatica'` (confirmed immediately) \| `'verificada'` (needs admin confirm) |
| `sms_verificacion` | boolean | Independent SMS toggle |
| `captcha_habilitado` | boolean | Cloudflare Turnstile |
| `notificacion_reserva` | text | `'email'` \| `'sms'` \| `'ambos'` |
| `horarios_config` | jsonb | `{comida_inicio, comida_fin, cena_inicio, cena_fin, intervalo_minutos}` |
| `zonas_config` | jsonb | `[{id, nombre, capacidad, enabled}]` |
| `modo_ocupacion` | text | `'auto'` \| `'manual'` |
| `ocupacion_manual` | integer | Manual occupancy override |
| `diseno_original` | jsonb | `{"Principal": [...], "Bar": [...]}` — original positions per zone |

### `clientes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `nombre` | text | |
| `telefono` | text | Unique (E.164 normalized) |
| `email` | text | Nullable |
| `gdpr_aceptado` | boolean | Default false |
| `gdpr_aceptado_at` | timestamptz | When accepted |

### `dias_bloqueados`

| Column | Type | Notes |
|--------|------|-------|
| `fecha` | date | Unique. Single blocked day |
| `recurrente` | boolean | Repeats yearly (MM-DD) |
| `fecha_fin` | date | Nullable. For date ranges |

---

## 3. Turno System (Comida/Cena)

### How Turnos Work

The restaurant has two service turns: **Comida** (lunch) and **Cena** (dinner). Each turno has configurable start/end times stored in `configuracion.horarios_config`:

```json
{
  "comida_inicio": "13:30",
  "comida_fin": "15:30",
  "cena_inicio": "21:00",
  "cena_fin": "23:00",
  "intervalo_minutos": 15
}
```

### TurnoWindow

`buildTurnoWindows(horariosConfig)` from `shared/utils/reserva-overlap.ts` converts times to minutes-from-midnight:

```typescript
{
  comida: { start: 810, end: 930 },   // 13:30 → 15:30
  cena:   { start: 1260, end: 1380 }  // 21:00 → 23:00
}
```

### reservationTurn(mins, comidaWindow, cenaWindow)

Determines which turno a reservation belongs to:

- Returns `'comida'` if within comida window
- Returns `'cena'` if within cena window
- Returns `null` if outside both
- Handles cena crossing midnight (e.g., 21:00 → 01:00): when `cenaWindow.end <= cenaWindow.start`, checks `>= start || < end`

### Booking Duration Model

**Critical:** Reservations do NOT block the entire turno. They use a **booking duration** model:

- **Comida:** 90 minutes default
- **Cena:** 120 minutes default

A reservation at 14:00 blocks the table until 15:30 (not until end of comida at 15:30). Two reservations at 13:30 and 15:00 CAN coexist on the same table if their booking windows don't overlap.

### Implications for Reassign

When filtering available tables for reassignment, the system checks occupancy **per turno**, not just per date. A table occupied at 21:00 (cena) is available for a 14:00 (comida) reservation.

---

## 4. Public Reservation Flow

> **Deprecated feature:** "Cliente elige mesa" (client picks individual table from web) was attempted but abandoned. Reason: impossible to guarantee real-time zone availability — a zone may be closed, have changed hours, or be at capacity without the client knowing. Table assignment is admin-only via `/cocina/reservas`.

### Steps (4-step wizard)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│ 1. Form  │───→│ 2. GDPR  │───→│ 3. SMS   │───→│ 4. Confirm   │
│ (slot    │    │ (if new  │    │ (if      │    │              │
│  grid)   │    │  client) │    │  enabled)│    │              │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘
```

### Step 1 — Form (`ReservationForm.vue`)

- **Fields:** nombre*, telefono* (mobile validated), email*, date picker, slot grid*, comensales (1-20)
- **Slot grid:** Generated from `HorarioConfig` via `shared/utils/slots.ts`. Grouped into COMIDA and CENA sections. Today's past slots disabled (now + 30min buffer).
- **CAPTCHA:** Cloudflare Turnstile shown when `captcha_habilitado = true`
- **Submit:** Builds `fecha_hora` as ISO string with timezone offset

### Step 2 — GDPR (conditional)

- Only shown if `texto_proteccion_datos` is configured AND phone hasn't accepted GDPR
- Checks `GET /api/clientes/gdpr-status?phone=...` to skip for returning customers
- On accept: `gdpr_aceptado = true` passed to final submit

### Step 3 — SMS Verification (conditional)

- Only shown if `sms_verificacion = true`
- Sends 4-digit code via `POST /api/sms/send`
- **Deferred SMS:** When both GDPR and SMS required, GDPR shown FIRST; SMS sent only after GDPR acceptance

### Step 4 — Confirmation

- Calls `POST /api/reservas`
- Shows confirmation (green) or pending (yellow) based on `modo_reserva`
- Reference via `generarReferencia(uuid, fecha)` — format `YYMMDD-XXXX`

### Server-Side Handler (`reservas.handlers.ts`)

1. Validate: nombre, telefono, email, fecha_hora (not past), comensales 1-20
2. Phone normalization: E.164 via `normalizePhone()`
3. Read config: modo_reserva, sms, notification, horarios, zonas, captcha
4. Gates: SMS (if enabled + not admin), Turnstile (if enabled + not SMS-verified + not admin)
5. Blocked days check: exact date + recurring (MM-DD) match
6. Slot validation: `isSlotInRange()` with 5-min tolerance
7. Zone validation: checks zona_id against enabled zones
8. Cliente upsert: by phone (unique). Syncs nombre/apellidos/email. Tracks GDPR.
9. Reserva creation: estado = `'confirmada'` (automatic) or `'pendiente'` (verificada)
10. Notifications: fire-and-forget email (with cancel link) and/or SMS

---

## 5. Admin Reservation Management

### Page: `/cocina/reservas`

**Available Operations:**

| Operation | Description |
|-----------|-------------|
| **List** | Loads reservations ±15 days, filterable by date range |
| **Quick filters** | "Hoy", "Mañana", "Fin de semana" buttons |
| **Sort** | Pax (numeric) and Nombre (string) columns |
| **Edit** | Date (slot grid), comensales, client data, optional re-send confirmation |
| **Cancel** | Sets estado → `'cancelada'`, tracks `cancelado_por: 'camarero'` |
| **Complete** | Sets estado → `'completada'`, mesa becomes free |
| **Reassign** | Change zona/mesa with turno-aware filtering |
| **Confirm** | For pending reservations, optional mesa assignment |
| **Create from panel** | Click-to-reserve with `admin_created: true` (bypasses SMS/CAPTCHA) |
| **Client popup** | Click name → shows phone (tel:) and email (mailto:) |

### Past Reservation Blocking

`esReservaPasada()` from `shared/utils/reserva-fecha.ts` blocks Edit/Cancel/Reassign/Complete for any reservation before today (local timezone comparison).

### Estado Badges

| Estado | Color | Notes |
|--------|-------|-------|
| `confirmada` | Green | Active reservation |
| `pendiente` | Yellow | Awaiting admin confirmation |
| `cancelada` | Red | + "admin" or "email" indicator |
| `completada` | Blue | Service finished |
| `standby` | Amber | Unassigned after unfusion |

---

## 6. Canvas System (Konva.js)

### 3-Layer Architecture

```
┌─────────────────────────────────────┐
│ Background Layer (listening: false) │ ← ZoneSection rects + background images
├─────────────────────────────────────┤
│ Wall Layer (listening: false)       │ ← Line drawings (freehand/straight)
├─────────────────────────────────────┤
│ Main Layer (interactive)            │ ← TableNode, FusionGroupNode, Transformer
└─────────────────────────────────────┘
```

### TableCanvas Component

**Props:**
- `reservas` — `[{mesa_id, estado, fecha_hora}]` for color derivation
- `reservasMap` — `mesa_id → reference string` for reserved table labels
- `reservasDetailMap` — `mesa_id → [{nombre_cliente, fecha_hora, pax, referencia}]` for tooltip
- `horariosConfig` — for turno window computation
- `zonasConfig` — zone images and configuration
- `designMode` — boolean, enables Transformer + drawing
- `selectedIds` — multi-select highlighting
- `selectedDate` — drives mesa estado derivation
- `canvasAnchoBase/canvasAltoBase` — reference dimensions (default 1400×900)

**Canvas Sizing:** Fills available width, grows to fit all visible mesas. Container provides scroll (`overflow-auto, max-h-[600px]`). `ResizeObserver` for responsive updates.

### TableNode Rendering

**Shapes:**
- Rect (rectangular), Rect+cornerRadius (cuadrada), Circle (redonda), Ellipse (ovalada)

**Colors (MCA-005):**
- Libre: `#22C55E` (green)
- Ocupada: `#EF4444` (red) — confirmada reservation in current turno
- Reservada: `#F59E0B` (amber) — pendiente reservation
- Selected: `#C67B5C`

**Turn overlays (when `activeTurno = 'todos'`):**
- Half-fill red indicators with M/T labels
- Top half (comida) + bottom half (cena)
- Round tables use Konva Wedge for semicircles
- When specific turno selected: full color, no overlay

**Text:** Counter-rotated group at shape center. Number (2× fontSize, bold) + capacity/client name. Small tables (<60px) show only number.

### FusionGroupNode

Single draggable `v-group` wrapping all member TableNodes at **relative** positions. Group `rotation: 0` — each TableNode handles its own rotation. Drag-end computes delta and persists to store.

### Tooltip (MCA-009)

HTML overlay (not Konva node). Shows: mesa number, fusion badge, capacity, zone, estado with color dot, reservation details (client, date, time, pax, reference, turno badge).

---

## 7. Table Fusion System

### Capacity Formula (AD-04)

```
1 table  → sum (no reduction)
2 tables → sum - 2   (e.g., 4+4=6, not 8)
3 tables → sum - 4   (e.g., 4+4+4=8, not 12)
4+ tables → sum - 6
```

Never reduces below the largest individual table's capacity.

### Fuse Flow (`fuseMesas`)

1. **Validate:** min 2 tables, same zone (`canFuse()`), none already fused
2. **Generate:** `id_fusion = crypto.randomUUID()`, `parentId = selectedIds[0]`
3. **Calculate capacity:** `calculateFusedCapacity(selectedMesas)`
4. **Calculate positions:** `calculateFusionPositions()` — children stacked **vertically below parent**, wrapping right if needed, collision detection
5. **DB update:** parent gets `id_fusion` + `capacidad_actual`; children get `id_fusion` + `mesa_padre_id` + `capacidad_actual` + new positions
6. **Store update:** atomic `batchUpdateMesas` (single operation to avoid incomplete renders)

### Unfuse Flow (`unfuseMesas`)

1. Find all mesas with the fusionId
2. Check for active reservations **on the specified date** (pendiente/confirmada)
3. If reservations exist → returns `{ hasReservations: true, reservations: [...] }` → triggers FusionConfirmDialog
4. If no reservations → performs unfusion directly

### Unfusion Options (FusionConfirmDialog)

| Option | Action |
|--------|--------|
| **Cancelar reservas** | Sets affected reservations to `'cancelada'`, then unfuses |
| **Mover a standby** | Sets affected reservations to `'standby'`, then unfuses |
| **No desfusionar** | Cancel operation |

### Standby System

- Standby reservations: `estado = 'standby'`, `mesa_id = null`
- `StandbyBanner`: persistent amber banner at top showing all standby reservations
- Reassignment: opens modal with available tables, calls `reassignStandbyReservation()` → `mesa_id` + `estado = 'confirmada'`

### Positioning Algorithm (`calculateFusionPositions`)

- Children stack **vertically below parent** (same x, increasing y)
- If doesn't fit vertically → wraps to **right of parent**
- Collision detection against existing tables (excluding fusion group members)
- `COLLISION_PAD = 4px` safety margin

---

## 8. Layout Persistence

### Layout per Date+Turn+Zone

Each combination of `(fecha, turno, zona)` has exactly one layout in `canvas_layouts`. Layouts store:
- `positions`: `[{mesa_id, posicion_x, posicion_y, rotacion}]`
- `fusions`: `[{id_fusion, parent_id, capacity, mesa_ids[]}]`

### Auto-Load on Date/Turn Change

When `guardarFecha` or `guardarTurno` changes (via `watch`):
1. Fetch layout from `GET /api/canvas/load-layout?fecha=...&turno=...&zona=...`
2. Restore positions to mesas via `updateMesa()`
3. Clear ALL fusion state globally
4. Apply saved fusions from layout
5. Reload mesas from DB

### Save Layout

Button: "Guardar layout" in toolbar. Saves current positions + fusions via `POST /api/canvas/save-layout`. Upserts by unique constraint.

### Original Design (`configuracion.diseno_original`)

**Format:** `{ "Principal": [...], "Bar": [...] }` — keyed by zone name. Each zone entry is an array of `{mesa_id, posicion_x, posicion_y, rotacion, ancho, alto, zona, forma}`.

**Legacy format handling:** If stored as flat array `[...]`, endpoints auto-migrate to keyed object on read/write.

**Save:** `POST /api/canvas/save-original` with `{zona, positions}` — saves current zone positions.

**Fetch:** `GET /api/canvas/original?zona=Principal` — returns `{exists, count, zona, positions[]}`.

**Restore:** `POST /api/canvas/restore-original` — updates mesas from saved original.

---

## 9. Reassign Flow

### UI Flow

1. Click "Reasignar" on reservation row (blocked for past/cancelled/completed)
2. Modal shows: client name, current date, current zona
3. **Zone dropdown:** all enabled zones
4. **Mesa dropdown (required):** turno-aware filtering (see below)
5. **Motivo** (optional): logged server-side
6. Click "Guardar" → `POST /api/admin/reasignar`

### Turno-Aware Mesa Filtering

**Critical:** Available tables are filtered by **same date + same turno**, not just same date.

```
Reserva being reassigned: 15:00 (comida)
Mesa with reservation at 21:00 (cena): AVAILABLE ✓
Mesa with reservation at 14:00 (comida): OCCUPIED ✗
```

Filtering logic in `reasignarMesasDisponibles`:
1. Determine turno of the reservation being reassigned via `reservationTurn()`
2. For each existing reservation on same date: check its turno via `reservationTurn()`
3. Only mark mesa as occupied if reservation is in the **same turno**
4. Also check: `capacidad_actual >= comensales`, zone is enabled

### Server-Side Validation (`reasignar.handlers.ts`)

1. Validate reserva exists
2. Validate zona against enabled zones in `zonas_config`
3. Validate mesa: FK exists, belongs to zone, capacity >= comensales
4. **Time-window conflict check:** `hasMesaConflict()` ensures no booking window overlap
5. Update `reservas.zona_id` and `reservas.mesa_id`

---

## 10. Restore Original Design

### Flow (`handleRestoreOriginal`)

1. **Gather info:**
   - Count active fusions in current zone
   - Count reservations for selected date+turno that have `mesa_id` assigned

2. **Confirmation dialog** (if fusions or affected reservations):
   - Lists affected reservations (up to 5 with references)
   - Shows fusion count
   - Explains consequences

3. **Execute restore:**
   a. **Unlink affected reservations:** `mesa_id = null, zona_id = null`
   b. **Desfuse all active fusion groups:** `unfuseMesas(fusionId, fecha)` for each
   c. **Fetch original design:** `GET /api/canvas/original?zona=...`
   d. **Save as layout:** `POST /api/canvas/save-layout` with original positions
   e. **Update mesas:** apply original positions via `updateMesa()`
   f. **Reload:** `loadReservas()` + `loadMesas()`

4. **Toast:** summary like "3 reserva(s) desvinculada(s), 1 fusión(es) eliminada(s), 16 mesas restaurada(s)"

---

## 11. Capacity / Aforo System

### Capacity Source

- **Primary:** `capacidadFromZonas(zonas_config)` — sums `capacidad` of all enabled zones
- **Deprecated:** `configuracion.capacidad_total_local` — fallback if zona sum is 0
- Default fallback: 80

### Auto vs Manual Mode

| Mode | Occupancy Source |
|------|-----------------|
| `auto` | Sum of `numero_comensales` of all reservations for selected date+turno+zone (pendiente/confirmada) |
| `manual` | `configuracion.occupacion_manual` (integer input) |

### AforoIndicator

Progress bar: green (<70%), yellow (70-90%), red (>90%). Overflow turns red-600.

### Overflow Enforcement

- **Editor role + overflow:** blocked with toast "Aforo completo. Libere mesas primero."
- **Admin role + overflow:** "Forzar / Cancelar" confirm dialog with projected occupancy

### Fusion and Aforo

Net capacity change = `fusedCapacity - sum(capacidad_base)` — always ≤ 0 (fusion reduces capacity), so fusion never triggers overflow.

---

## 12. Mesa State Derivation

### Priority: ocupada > reservada > libre

`calcularEstadoMesa(mesaId, reservas, ctx)` from `shared/utils/mesa-estado.ts`:

**Context:**
```typescript
{
  selectedDate: "YYYY-MM-DD",
  currentTurn: 'todos' | 'comida' | 'cena',
  turnos: { comida: { start, end }, cena: { start, end } }
}
```

**Logic per reserva:**
1. Skip if `mesa_id` doesn't match or estado is `'cancelada'`/`'standby'`
2. `sameDate`: reserva's local date === selectedDate
3. `inCurrentService`: depends on `currentTurn`:
   - `'todos'`: any same-date reserva counts
   - `'comida'`/`'cena'`: reservation's turn matches AND booking window overlaps turn window
4. **Confirmada:** marks `isOcupada` if `inCurrentService`
5. **Pendiente:** marks `isReservada` if strictly future date OR (sameDate AND inCurrentService)

### Boundary Handling

At exact turno boundaries (e.g., cena_fin = 23:00 and reservation at 23:00), `reservationTurn` returns `null` (half-open window). Fallback: if `mins >= window.start && mins <= window.end`, counts as occupied.

---

## 13. Key Files Reference

### Public

| File | Purpose |
|------|---------|
| `app/pages/reservas.vue` | Reservation wizard page |
| `app/components/ReservationForm.vue` | Form with slot grid |
| `app/components/SmsVerificationStep.vue` | SMS 4-digit code |
| `app/components/GdprConsentModal.vue` | GDPR consent |

### Admin

| File | Purpose |
|------|---------|
| `app/pages/cocina/reservas.vue` | Main admin page (~2300 lines) |
| `app/pages/cocina/diseno.vue` | Design editor (backgrounds, drawing, zoom) |

### Canvas Components

| File | Purpose |
|------|---------|
| `app/features/mesas/components/TableCanvas.vue` | Konva stage + layers |
| `app/features/mesas/components/TableNode.vue` | Single table shape |
| `app/features/mesas/components/FusionGroupNode.vue` | Fused group wrapper |
| `app/features/mesas/components/TableToolbar.vue` | Mode-specific controls |
| `app/features/mesas/components/ZoneSection.vue` | Zone background rects |
| `app/features/mesas/components/TableTooltip.vue` | Hover card |
| `app/features/mesas/components/FusionConfirmDialog.vue` | Unfusion confirmation |
| `app/features/mesas/components/StandbyBanner.vue` | Standby reservations |
| `app/features/mesas/components/AforoIndicator.vue` | Capacity bar |

### Composables

| File | Purpose |
|------|---------|
| `app/features/mesas/composables/useMesas.ts` | Mesa CRUD + Realtime |
| `app/features/mesas/composables/useMesasFusion.ts` | Fusion/unfusion DB operations |
| `app/features/mesas/composables/useFusionGroupDrag.ts` | Konva drag sync |
| `app/features/mesas/stores/canvas-store.ts` | Pinia store for canvas state |
| `app/composables/useDisenoConfig.ts` | Canvas dimensions |

### Shared Utils

| File | Purpose |
|------|---------|
| `shared/utils/reserva-overlap.ts` | `buildTurnoWindows`, `reservationTurn`, `reservaOverlaps`, `hasMesaConflict` |
| `shared/utils/mesa-estado.ts` | `calcularEstadoMesa` — turn-aware state derivation |
| `shared/utils/fusion-math.ts` | `canFuse`, `calculateFusedCapacity`, `calculateFusionPositions`, `unfuseTables` |
| `shared/utils/capacidad-from-zonas.ts` | Capacity from enabled zones |
| `shared/utils/slots.ts` | Time slot generation from HorarioConfig |
| `shared/utils/date.ts` | `toLocalDateString`, `buildFechaHora` |
| `shared/utils/referencia.ts` | `generarReferencia` — readable reservation ref |
| `shared/utils/reserva-fecha.ts` | `esReservaPasada` — past reservation detection |
| `shared/utils/phone.ts` | E.164 phone normalization |

### API Endpoints

| File | Purpose |
|------|---------|
| `server/api/reservas.post.ts` | Public reservation creation |
| `server/api/reservas.handlers.ts` | Core reservation logic |
| `server/api/cocina/reservas/confirmar.post.ts` | Admin confirm pending |
| `server/api/cocina/reservas/editar.post.ts` | Admin edit |
| `server/api/admin/reasignar.post.ts` | Admin reassign |
| `server/api/admin/reasignar.handlers.ts` | Reassign validation logic |
| `server/api/canvas/save-layout.post.ts` | Save layout per date+turn+zone |
| `server/api/canvas/load-layout.get.ts` | Load layout |
| `server/api/canvas/save-original.post.ts` | Save original design |
| `server/api/canvas/original.get.ts` | Fetch original design |
| `server/api/canvas/restore-original.post.ts` | Restore original design |
| `server/api/reservas/cancelar-info.get.ts` | Public cancel preview |
| `server/api/reservas/cancelar.post.ts` | Public cancel execution |

### Contracts

| File | Purpose |
|------|---------|
| `shared/contracts/mesas.contract.ts` | `Mesa`, `Zona`, `MesaEstado`, `AforoInfo` types |
| `shared/contracts/reservation.contract.ts` | `HorarioConfig`, `ZonaConfig`, `ConfigData` types |
