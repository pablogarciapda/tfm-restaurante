# mesas-fusion Specification

## Purpose

Table fusion/unfusion: same-zone constraint, realistic capacity, standby reservations on unfusion, aforo overflow enforcement with admin override.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| MFU-001 | Fusion: N≥2 tables, same zone → shared `id_fusion` + `mesa_padre_id` (first selected). Cross-zone rejected | MUST |
| MFU-002 | Capacity: `floor(sum(capacidad_base) × 0.75)`. 4+4→6, 4+4+2→7. Pure function | MUST |
| MFU-003 | Visual: dashed #C67B5C outline + overlay on fused tables. Transformer disabled on children | MUST |
| MFU-004 | Unfusion (no reservas): restore `capacidad_base`, clear `id_fusion`/`mesa_padre_id` | MUST |
| MFU-005 | Unfusion (with reservas): dialog "Hay reservas activas en esta fusión" → cancelar+notificar OR mover a standby | MUST |
| MFU-006 | Standby banner per reserva: "Reserva en espera: {nombre} — {fecha} — {n} pax". Button "Reasignar" | MUST |
| MFU-007 | Aforo overflow (editor): BLOCKED → "Aforo completo. Libere mesas primero." Check before DB mutation | MUST |
| MFU-008 | Aforo overflow (admin): warning "Aforo excedido..." → "Forzar" allows overflow, bar turns red | MUST |

### Requirement: MFU-001 — Same-Zone Fusion

Fuse N≥2 tables only when all share same `zona`. Cross-zone rejected: **"Solo se pueden fusionar mesas de la misma zona"**. All get shared `id_fusion`, `mesa_padre_id=first_selected_id`.

#### Scenario: Same-zone OK, cross-zone blocked

- GIVEN Mesa 1+2 (Principal) selected → fusion succeeds, both get shared `id_fusion`
- GIVEN Mesa 1 (Principal) + Mesa 5 (Terraza) → toast "Solo se pueden fusionar mesas de la misma zona"

### Requirement: MFU-002 — Capacity Formula

`floor(sum(capacidad_base) × 0.75)`. Stored as parent's `capacidad_actual`.

#### Scenario: 4+4→6, 4+4+2→7

- GIVEN two 4-pax → `floor(8 × 0.75) = 6`
- GIVEN 4+4+2 → `floor(10 × 0.75) = 7`

### Requirement: MFU-003 — Visual Union

Dashed #C67B5C outline + overlay. Child tables non-transformable.

#### Scenario: Visual on canvas

- GIVEN Mesa 1+2 fused → both dashed #C67B5C, child Transformer disabled

### Requirement: MFU-004 — Clean Unfusion

Restore each `capacidad_actual = capacidad_base`, clear fusion fields. No dialog.

#### Scenario: Unfuse without reservations

- GIVEN fused Mesa 1+2, no reservas → unfuse → both `id_fusion=NULL`, capacity restored, aforo recalculated

### Requirement: MFU-005 — Unfusion With Reservations

Dialog: **"Hay reservas activas en esta fusión"** → **"Cancelar y notificar al cliente"** (delete reservas, unfuse, toast "Reservas canceladas") OR **"Mover a espera"** (set `estado='standby'`, unfuse, show banner).

#### Scenario: Move to standby

- GIVEN fused tables with reserva #42 → unfuse → "Mover a espera" → `estado='standby'`, banner appears

#### Scenario: Cancel and notify

- GIVEN reserva #42 → unfuse → "Cancelar y notificar" → reserva cancelled, toast "Reservas canceladas"

### Requirement: MFU-006 — Standby Banner

Per `estado='standby'` reserva: **"Reserva en espera: {nombre} — {fecha_hora} — {n} pax"** with **"Reasignar"** button. Persists until resolved.

#### Scenario: Banner lifecycle

- GIVEN "Ana García" moved to standby → banner shows detail
- WHEN admin clicks "Reasignar" → sets mesa_id, estado='confirmada' → banner removed

### Requirement: MFU-007 — Aforo Overflow (Editor Blocked)

`SUM(capacidad_actual of root mesas) + new > capacidad_total_local`: block editor. Toast: **"Aforo completo. Libere mesas primero."**

#### Scenario: Editor blocked

- GIVEN capacidad=30, aforo=29, editor adds 4-pax table → toast, no INSERT

### Requirement: MFU-008 — Admin Override

Admin sees warning: **"Aforo excedido. La capacidad del local está superada."** → **"Cancelar"** / **"Forzar"**. "Forzar": operation proceeds, aforo bar red.

#### Scenario: Admin overrides

- GIVEN capacidad=30, aforo=29, admin adds 4-pax (→33) → warning → "Forzar" → table added, bar 33/30 red

## Edge Cases

- Fuse already-fused: reject → **"Alguna mesa ya está fusionada. Desfusione primero."**
- Solo table unfusion: disabled unless `id_fusion IS NOT NULL`
- Standby, no free tables: banner persists indefinitely
