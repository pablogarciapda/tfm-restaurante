# panel-clientes Specification

## Purpose
Admin CRUD page at `/cocina/clientes` for managing customers and viewing their reservation history. Protected by 'clientes' permission.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| PCL-001 | `/cocina/clientes` route: list all clientes (paginated if >50), search by name/phone/email | MUST |
| PCL-002 | Create new cliente: nombre (required), telefono (required, unique), email (optional) | MUST |
| PCL-003 | Edit existing cliente: nombre, email editable; telefono read-only (key identifier) | MUST |
| PCL-004 | Reservation history per cliente: `/cocina/clientes/[id]/reservas` inline table | MUST |
| PCL-005 | Route protected by 'clientes' permission in middleware | MUST |

### Requirement: PCL-001 — Clientes List

The system MUST render a searchable table at `/cocina/clientes` with columns: Nombre, Teléfono, Email, Reservas (count), Acciones (edit/view). Search input filters by nombre, telefono, email (client-side filter of fetched results). If >50 rows, MUST use server-side pagination via `limit`/`offset`.

#### Scenario: List loads with data
- GIVEN 5 clientes in DB
- WHEN admin visits /cocina/clientes
- THEN table shows all 5 rows with nombre, telefono, email, reservas count
- AND search input visible above table

#### Scenario: Search filters results
- GIVEN clientes "Ana", "Juan", "Antonio"
- WHEN admin types "an" in search
- THEN table shows only "Ana" and "Antonio"

#### Scenario: Empty state
- GIVEN 0 clientes in DB
- WHEN admin visits /cocina/clientes
- THEN "No hay clientes registrados" message displayed

### Requirement: PCL-002 — Create Cliente

A form (inline or modal) MUST accept: `nombre` (text, required), `telefono` (text, required, validated: Spanish mobile or E.164), `email` (email, optional). On submit: POST /api/cocina/clientes. Success: row added to table + toast "Cliente creado". Duplicate phone: error "Ya existe un cliente con ese teléfono".

#### Scenario: Create valid cliente
- GIVEN no cliente with telefono="600000000"
- WHEN admin fills nombre="Ana", telefono="600000000" and submits
- THEN new cliente row created
- AND success toast shown

#### Scenario: Duplicate phone rejected
- GIVEN existing cliente with telefono="600000000"
- WHEN admin tries to create with same phone
- THEN error: "Ya existe un cliente con ese teléfono"

### Requirement: PCL-003 — Edit Cliente

Edit form: `nombre` (editable), `email` (editable), `telefono` (read-only, displayed as text). PUT /api/cocina/clientes/[id] updates nombre and email only. Telefono immutable after creation.

#### Scenario: Edit nombre succeeds
- GIVEN cliente "Ana" with id="abc"
- WHEN admin changes nombre to "Ana María" and saves
- THEN PUT /api/cocina/clientes/abc → 200
- AND table reflects "Ana María"

### Requirement: PCL-004 — Reservation History

Clicking on a cliente row or "Ver reservas" button MUST expand/show a sub-table with columns: Fecha/Hora, Comensales, Estado, Acción (confirmar if pendiente). Data from GET /api/cocina/clientes/[id]/reservas. Confirm button calls POST /api/cocina/reservas/confirmar for estado='pendiente' reservations.

#### Scenario: History shows reservations
- GIVEN cliente has 3 reservas (2 confirmadas, 1 pendiente)
- WHEN admin clicks cliente row
- THEN sub-table shows 3 rows with dates, states, and confirm button on the pending one

#### Scenario: Confirm pending reservation
- GIVEN pendiente reserva displayed in history
- WHEN admin clicks "Confirmar"
- THEN POST /api/cocina/reservas/confirmar called
- AND estado updates to 'confirmada'
- AND confirmation email sent to cliente

### Requirement: PCL-005 — Permission Protection

`/cocina/clientes` route MUST use middleware chain `auth → role → permissions`. Editors without `clientes` permission (default false) SHALL be redirected to `/cocina/dashboard` with error: **"No tiene permisos para acceder a clientes"**.

#### Scenario: Editor blocked from clientes
- GIVEN editor with permissions.clientes=false
- WHEN navigating to /cocina/clientes
- THEN redirected to /cocina/dashboard with permissions error toast
