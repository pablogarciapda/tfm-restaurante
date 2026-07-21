# zonas-config Specification

## Purpose

Configurable restaurant zones with editable names, individual capacity, and enable/disable toggle. Stored as JSONB array in `configuracion.zonas_config`. Replaces the fixed CHECK constraint on `mesas.zona` with editable zone names. Zone assignment to reservations is admin-only.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| ZON-001 | `configuracion.zonas_config` JSONB array: each entry `{ id: string, nombre: string, capacidad: number, enabled: boolean }`. Default: 5 zones (Principal:70, Reservado:14, Zíngaro:60, Terraza:100, Bar:20). Names editable. | MUST |
| ZON-002 | Zone enabled/disabled toggle: when disabled, zone MUST be excluded from capacity calculation and zone selector in reservation form. | MUST |
| ZON-003 | `mesas.zona` CHECK constraint MUST be updated from 5 fixed values to match `zonas_config` entries. Migration: ALTER CHECK, UPDATE existing rows (Privado→Reservado). | MUST |

### Requirement: ZON-001 — zonas_config JSONB

The system MUST store zone definitions in `configuracion.zonas_config` as JSONB array. Default: `[{ "id":"principal", "nombre":"Principal", "capacidad":70, "enabled":true }, { "id":"reservado", "nombre":"Reservado", "capacidad":14, "enabled":true }, { "id":"zingaro", "nombre":"Zíngaro", "capacidad":60, "enabled":true }, { "id":"terraza", "nombre":"Terraza", "capacidad":100, "enabled":true }, { "id":"bar", "nombre":"Bar", "capacidad":20, "enabled":true }]`. Zone `nombre` and `capacidad` are editable by admin.

#### Scenario: Default zones after migration

- GIVEN migration applied with default zonas_config
- WHEN querying configuracion.zonas_config
- THEN 5 zones present with default names and capacities
- AND all enabled=true

#### Scenario: Admin edits zone name

- GIVEN zone "Privado" with id="privado" (legacy)
- WHEN admin renames it to "Reservado" and saves
- THEN zonas_config entry nombre="Reservado"
- AND mesas.zona CHECK constraint and values updated to match

#### Scenario: Admin edits zone capacity

- GIVEN zone "Principal" with capacidad=70
- WHEN admin changes to 80 and saves
- THEN zonas_config Principal.capacidad=80
- AND capacidad_total_local default updated to reflect sum (264→274)

### Requirement: ZON-002 — Zone Toggle

Each zone entry MUST have an `enabled` boolean. When `enabled=false`: zone excluded from `SUM(enabled_zones.capacidad)`, zone hidden in floor plan. Existing mesas in disabled zone remain in DB but are visually dimmed in canvas.

#### Scenario: Disable a zone

- GIVEN all zones enabled
- WHEN admin toggles "Terraza" to disabled and saves
- THEN Terraza excluded from capacity sum; total drops by 100
- AND Terraza NOT shown in reservation zone selector

#### Scenario: Re-enable zone

- GIVEN Terraza disabled
- WHEN admin toggles back to enabled and saves
- THEN Terraza reappears in capacity sum and zone selector

### Requirement: ZON-003 — mesas CHECK Migration

The system MUST replace the `mesas.zona` CHECK constraint from `IN ('Principal','Zingaro','Privado','Terraza','Bar')` to a constraint derived from `zonas_config.nombre` values. Migration MUST: drop old CHECK, update existing rows where `zona='Privado'` → `zona='Reservado'`, add new CHECK with current zone names from zonas_config.

#### Scenario: Privado renamed to Reservado

- GIVEN mesas rows with zona='Privado' exist
- WHEN migration applied
- THEN all zona='Privado' rows now zona='Reservado'
- AND CHECK constraint accepts 'Reservado'
- AND CHECK rejects 'Privado'

#### Scenario: Zone names editable post-migration

- GIVEN migration applied with 5 zones
- WHEN admin renames "Principal" → "Salón" in zonas_config
- THEN ALTER TABLE mesas DROP + ADD CHECK to accept "Salón"
- AND existing mesas rows updated from "Principal" → "Salón"

## Edge Cases

- **Disabled zone with mesas**: mesas remain in DB but are visually dimmed in canvas
- **All zones disabled**: system rejects save — at least one zone must be enabled
- **Zone rename cascades**: renaming a zone updates mesas.zona CHECK and existing rows
