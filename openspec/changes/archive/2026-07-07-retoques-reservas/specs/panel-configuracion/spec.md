# Delta for panel-configuracion

## ADDED Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| CFG-006 | Configuration page reorganized into labeled sections with visual dividers | MUST |
| CFG-007 | SMTP section: smtp_host, smtp_port, smtp_user, smtp_from_email (editable), smtp_password (write-only: masked input, placeholder dots on load, sent on change only) | MUST |
| CFG-008 | Protección de datos section: texto_proteccion_datos (textarea, nullable) | MUST |
| CFG-009 | Reservas section: modo_reserva (radio: Automática / Verificada) | MUST |
| CFG-010 | Test email button in SMTP section: POST /api/cocina/smtp/test → success/error toast | MUST |

### Requirement: CFG-006 — Section Layout

The configuration page MUST display fields grouped into labeled sections with `<h3>` headers and visual separators: **General** (capacidad_total_local, modo_ocupacion, ocupacion_manual), **Elección de mesa** (cliente_elige_mesa), **Precios** (precio_menu_diario, precio_menu_sabado), **Recomendados** (mostrar_recomendados, titulo_recomendados), **Imágenes** (max_ancho_imagen, calidad_imagen, max_peso_imagen, auto_comprimir_imagen), **Correo saliente** (SMTP fields), **Protección de datos** (texto_proteccion_datos), **Reservas** (modo_reserva).

#### Scenario: Sections render with headers
- GIVEN admin visits /cocina/configuracion
- WHEN page loads
- THEN 8 section headers displayed
- AND fields grouped under respective sections
- AND sections visually separated (borders/backgrounds)

### Requirement: CFG-007 — SMTP Section

SMTP fields: `smtp_host` (text), `smtp_port` (number, 1-65535), `smtp_user` (text), `smtp_from_email` (email), `smtp_password` (password input). On load, password field SHALL show placeholder dots (not real value). Sending an empty password field MUST NOT overwrite the stored password. Only non-empty submissions update the stored value.

#### Scenario: Password masked on load
- GIVEN smtp_password='secret123' in DB
- WHEN config form loads
- THEN password input shows placeholder "••••••••"
- AND actual value not rendered in DOM or network response

#### Scenario: Empty password preserves existing
- GIVEN stored smtp_password='secret123'
- WHEN admin saves config with password field unchanged (placeholder)
- THEN smtp_password remains 'secret123' in DB

### Requirement: CFG-008 — Protección de Datos Section

The system MUST render a `<textarea>` for `texto_proteccion_datos` under "Protección de datos" section. Null value = empty textarea. Placeholder: "Texto de protección de datos que se muestra en el popup GDPR...".

#### Scenario: GDPR text saved
- GIVEN texto_proteccion_datos=NULL
- WHEN admin enters text and saves
- THEN texto_proteccion_datos updated in configuracion

### Requirement: CFG-009 — Reservas Section

Radio group for `modo_reserva`: "Automática" (value='automatica'), "Verificada" (value='verificada'). Default: 'automatica'. Description: "Automática: reserva confirmada tras SMS. Verificada: pendiente hasta confirmación manual."

#### Scenario: Select verificada mode
- GIVEN modo_reserva='automatica'
- WHEN admin selects "Verificada" and saves
- THEN modo_reserva='verificada' persisted
- AND new reservations default to 'pendiente' state

### Requirement: CFG-010 — Test Email Button

A "Enviar correo de prueba" button in SMTP section MUST call POST /api/cocina/smtp/test with current form SMTP values (including password if changed). Success → green toast "Correo de prueba enviado". Failure → red toast with error message.

#### Scenario: Test email succeeds
- GIVEN valid SMTP config in form
- WHEN admin clicks "Enviar correo de prueba"
- THEN POST /api/cocina/smtp/test called
- AND "Correo de prueba enviado" toast shown

#### Scenario: Test email with missing config
- GIVEN smtp_host is empty
- WHEN admin clicks "Enviar correo de prueba"
- THEN red toast: "Configure los datos SMTP primero"

## MODIFIED Requirements

### Requirement: CFG-001 — Settings Form

The system MUST render a section-based form at `/cocina/configuracion` organized into 8 sections (see CFG-006). Save button: **"Guardar configuración"**. Sections: General, Elección de mesa, Precios, Recomendados, Imágenes, Correo saliente, Protección de datos, Reservas.

(Previously: single flat form with toggle, capacity, price, image fields.)

(All original CFG-001 scenarios preserved: Form loads, Toggle, Invalid capacidad — now rendered within their respective section groups.)
