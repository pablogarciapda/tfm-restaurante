# Delta for panel-configuracion

## ADDED Requirements

### Requirement: CFG-004 — Aforo Connection Display

The system MUST display on `/cocina/configuracion` an informational section showing that `capacidad_total_local` is used as the capacity ceiling for the table manager at `/cocina/reservas`. Section heading: **"Aforo del local"**. Description text: **"Este valor se usa como límite máximo de ocupación en el gestor de mesas."** Displays current `capacidad_total_local` value from DB.

#### Scenario: Aforo connection info visible

- GIVEN configuracion has capacidad_total_local=80
- WHEN admin visits `/cocina/configuracion`
- THEN section "Aforo del local" shows "80"
- AND description explains the connection to the table manager

### Requirement: CFG-005 — Dual Occupancy Mode

The system MUST provide a dual occupancy mode selector on `/cocina/configuracion`:

- **Modo de ocupación**: radio group with options **"Automático"** and **"Manual"** bound to `modo_ocupacion`
- **Ocupación manual**: number input (visible only when Manual is selected), bound to `ocupacion_manual`, label: **"Número de ocupantes"**, min=0, max=capacidad_total_local

When mode is "Automático", aforo on `/cocina/reservas` is calculated as `SUM(capacidad_actual) FROM mesas WHERE mesa_padre_id IS NULL`. When "Manual", `ocupacion_manual` overrides the calculation. Default SHALL be "Automático".

#### Scenario: Select Manual mode and set value

- GIVEN modo_ocupacion='auto'
- WHEN admin selects "Manual" radio
- THEN "Ocupación manual" number input appears
- WHEN admin enters 45 and saves
- THEN modo_ocupacion='manual', ocupacion_manual=45 persisted
- AND `/cocina/reservas` aforo bar shows 45 regardless of actual mesas sum

#### Scenario: Switch back to Auto mode

- GIVEN modo_ocupacion='manual', ocupacion_manual=50
- WHEN admin selects "Automático" radio and saves
- THEN modo_ocupacion='auto' persisted
- AND `/cocina/reservas` aforo bar recalculates from mesas

#### Scenario: Manual value exceeds capacity

- GIVEN capacidad_total_local=80
- WHEN admin enters ocupacion_manual=100
- AND clicks save
- THEN validation error: **"La ocupación manual no puede superar la capacidad total del local"**

## MODIFIED Requirements

### Requirement: CFG-001 — Settings Form
(Previously: 2-field form — cliente_elige_mesa toggle + capacidad_total_local number)

The system MUST render a form at `/cocina/configuracion` with four fields:

- **"Permitir que el cliente elija mesa"**: toggle bound to `cliente_elige_mesa`
- **"Capacidad total del local"**: number input bound to `capacidad_total_local`, min=1, max=999
- **"Modo de ocupación"**: radio group (Automático / Manual) bound to `modo_ocupacion`
- **"Ocupación manual"**: number input bound to `ocupacion_manual`, visible when Manual selected, min=0, max=capacidad_total_local

Form heading: **"Configuración del sistema"**. Save button: **"Guardar configuración"**.

#### Scenario: Form loads with current values (updated)

- GIVEN configuracion row has cliente_elige_mesa=false, capacidad_total_local=80, modo_ocupacion='auto', ocupacion_manual=NULL
- WHEN admin visits `/cocina/configuracion`
- THEN toggle shows unchecked; number input shows 80
- AND "Automático" radio is selected
- AND "Ocupación manual" input is hidden

#### Scenario: Toggle cliente_elige_mesa (unchanged)

- GIVEN cliente_elige_mesa is false
- WHEN admin checks the toggle and clicks "Guardar configuración"
- THEN the configuracion row updates with cliente_elige_mesa=true
- AND success toast appears

#### Scenario: Invalid capacidad_total_local (unchanged)

- GIVEN admin enters capacidad_total_local=0
- WHEN admin clicks "Guardar configuración"
- THEN validation error: **"La capacidad debe ser al menos 1"**
