# Delta for panel-configuracion

## ADDED Requirements

### Requirement: CFG-011 — Horarios Section

ConfiguracionForm MUST render a new "Horarios" section with: time inputs for comida_inicio, comida_fin, cena_inicio, cena_fin (type=time, hh:mm format), and select for intervalo_minutos (options: 5, 10, 15, 20, 30, 60). Section heading: **"Horarios de servicio"**. Fields bound to `form.horarios_config.*`. Save via POST /api/config with Zod validation server-side.

#### Scenario: Horarios section renders with defaults

- GIVEN horarios_config has defaults (13:30-15:30, 21:00-23:30, 15min)
- WHEN admin visits /cocina/configuracion
- THEN "Horarios de servicio" section visible with correct time inputs
- AND intervalo select shows "15 minutos"

#### Scenario: Admin edits lunch end time

- GIVEN comida_fin="15:30"
- WHEN admin changes to "16:00" and clicks "Guardar configuración"
- THEN POST body includes updated horarios_config
- AND success toast: "Configuración actualizada"

#### Scenario: Invalid interval rejected

- GIVEN admin changes intervalo_minutos to 45
- WHEN saves
- THEN client-side validation error: "El intervalo debe dividir 60"
- OR server-side 400 with Zod error

### Requirement: CFG-012 — Zonas Section

ConfiguracionForm MUST render a "Zonas" section with a table showing each zone: nombre (editable text input), capacidad (number input, min 1, max 999), and enabled toggle (checkbox). Button "Añadir zona" appends new row. Button "Eliminar" (trash icon) removes zone row. Section heading: **"Zonas del restaurante"**. All changes saved together via POST /api/config.

#### Scenario: Zonas table renders 5 default zones

- GIVEN zonas_config has 5 default zones
- WHEN admin visits /cocina/configuracion
- THEN table shows 5 rows with nombre, capacidad, enabled toggle
- AND each row has edit/delete capability

#### Scenario: Admin renames a zone

- GIVEN zone "Privado" exists
- WHEN admin edits nombre to "Reservado" and saves
- THEN POST body includes updated zonas_config with new name
- AND mesas CHECK constraint updated server-side

#### Scenario: Admin adds new zone

- GIVEN 5 zones exist
- WHEN admin clicks "Añadir zona", fills nombre="VIP" and capacidad=10
- AND saves
- THEN zonas_config has 6 entries
- AND VIP zone appears in total capacity sum

#### Scenario: Admin deletes a zone

- GIVEN zone "Bar" exists with mesas assigned
- WHEN admin clicks delete on "Bar" row
- THEN warning shown: "Esta zona tiene X mesas asignadas"
- AND on confirm, zone removed from zonas_config
- AND mesas assigned to "Bar" retain the value (stored name, not FK)

### Requirement: CFG-013 — Días Bloqueados Section

ConfiguracionForm MUST render a "Días bloqueados" section with inline CRUD table: columns for fecha (date input), recurrente (checkbox with "Anual" label), motivo (optional text, placeholder "Motivo opcional"), acciones (delete button). "Añadir día bloqueado" button adds new row. Rows loaded from GET /api/dias-bloqueados. Saved individually via POST, deleted via DELETE. Server returns updated list after each operation. Section heading: **"Días bloqueados"**.

#### Scenario: Días bloqueados table loads

- GIVEN 2 blocked days exist in DB
- WHEN admin visits /cocina/configuracion
- THEN "Días bloqueados" section shows 2 rows
- AND recurrent rows show "Anual" badge

#### Scenario: Add blocked day

- GIVEN admin enters fecha="2026-12-25", checks "Anual", motivo="Navidad"
- WHEN clicks save
- THEN POST /api/dias-bloqueados succeeds
- AND row appears in table with "Anual" badge

#### Scenario: Cannot block past date

- GIVEN today is 2026-07-07
- WHEN admin enters fecha="2026-07-01"
- THEN save rejected: "No se pueden bloquear fechas pasadas"

#### Scenario: Delete blocked day

- GIVEN a blocked day row exists
- WHEN admin clicks delete icon
- THEN DELETE /api/dias-bloqueados/[id] called
- AND row removed from table

### Requirement: CFG-014 — Elección de Zona Selector

ConfiguracionForm MUST add a "Elección de zona" field to the "Elección de mesa" section: radio group bound to `cliente_elige_zona` with options: **"No permitir"** (none), **"Permitir elegir zona"** (zona), **"Permitir elegir mesa"** (zona_mesa, disabled with "Próximamente"). Changes the zone selector visibility in `/reservas`.

#### Scenario: Radio group renders with current value

- GIVEN cliente_elige_zona='none'
- WHEN admin visits /cocina/configuracion
- THEN "No permitir" radio selected
- AND zona_mesa radio shows disabled with "Próximamente" tooltip

#### Scenario: Admin enables zone selection

- GIVEN cliente_elige_zona='none'
- WHEN admin selects "Permitir elegir zona" and saves
- THEN cliente_elige_zona='zona' persisted
- AND /reservas shows zone dropdown
