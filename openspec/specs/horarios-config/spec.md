# horarios-config Specification

## Purpose

Configuration of restaurant service hours (lunch/dinner turns) with configurable slot intervals for dynamic reservation time-slot generation. Stored as JSONB in `configuracion.horarios_config`. Every day uses the same schedule, editable by admin.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| HOR-001 | `configuracion.horarios_config` JSONB column: `{ comida_inicio, comida_fin, cena_inicio, cena_fin, intervalo_minutos }`. All times in `HH:MM` format (Europe/Madrid). Default: comida 13:30-15:30, cena 21:00-23:30, intervalo 15. | MUST |
| HOR-002 | Server-side Zod validation of `horarios_config` shape: all 5 keys required, times as `HH:MM` regex, `intervalo_minutos` as positive integer divisor of 60. comida_inicio < comida_fin, cena_inicio < cena_fin. Overlapping lunch/dinner turns MUST NOT be rejected (admin controls schedule). | MUST |
| HOR-003 | System MUST generate time slots from `horarios_config` by splitting each turn's range into `intervalo_minutos`-sized slots (inclusive start, exclusive end). Slots SHALL be in Europe/Madrid timezone. | MUST |

### Requirement: HOR-001 — horarios_config JSONB

The system MUST store restaurant hours in `configuracion.horarios_config` JSONB. Default values: `comida_inicio: "13:30"`, `comida_fin: "15:30"`, `cena_inicio: "21:00"`, `cena_fin: "23:30"`, `intervalo_minutos: 15`. Admin edits via `/cocina/configuracion` time inputs.

#### Scenario: Default horarios on new config

- GIVEN configuracion row exists with horarios_config=NULL
- WHEN migration applies default
- THEN horarios_config = `{"comida_inicio":"13:30","comida_fin":"15:30","cena_inicio":"21:00","cena_fin":"23:30","intervalo_minutos":15}`

#### Scenario: Admin edits lunch hours

- GIVEN comida_inicio="13:30"
- WHEN admin changes it to "13:00" and saves
- THEN horarios_config.comida_inicio updated to "13:00"
- AND slot generation reflects new start time

### Requirement: HOR-002 — Validation

The system MUST validate `horarios_config` on save: all 5 keys present, times match `/^([01]\d|2[0-3]):[0-5]\d$/`, intervalo_minutos ∈ {5,10,15,20,30,60}, comida_inicio < comida_fin, cena_inicio < cena_fin. Reject with Zod error on violation.

#### Scenario: Invalid time format rejected

- GIVEN admin enters comida_inicio="25:00"
- WHEN save attempted
- THEN validation error: "Formato de hora no válido (HH:MM)"
- AND existing horarios_config unchanged

#### Scenario: Intervalo not a divisor of 60

- GIVEN admin enters intervalo_minutos=45
- WHEN save attempted
- THEN validation error: "El intervalo debe ser divisor de 60 minutos"

### Requirement: HOR-003 — Slot Generation

The system SHALL generate an ordered array of time slots from `horarios_config.turnos` by dividing each turn's `[inicio, fin)` range into `intervalo_minutos` chunks. Example: comida 13:30-15:30, intervalo 15 → ["13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15"].

#### Scenario: Slots for lunch turn

- GIVEN comida_inicio="13:30", comida_fin="15:30", intervalo_minutos=15
- WHEN slots generated
- THEN 8 slots: ["13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15"]

#### Scenario: Combined lunch + dinner slots

- GIVEN lunch 13:30-15:30, dinner 21:00-23:30, intervalo=30
- WHEN slots generated
- THEN lunch: 4 slots (13:30,14:00,14:30,15:00), dinner: 5 slots (21:00,21:30,22:00,22:30,23:00)
- AND combined list is 9 slots ordered chronologically
