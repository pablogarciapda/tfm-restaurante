# Delta for panel-permissions

## MODIFIED Requirements

### Requirement: PERM-003 — Default Editor Permissions

The default editor permissions jsonb MUST be: `{"carta": true, "menu_diario": true, "eventos": true, "clientes": false, "reservas": false, "configuracion": false, "usuarios": false}`.

(Previously: `{"carta": true, "menu_diario": true, "eventos": true, "reservas": false, "configuracion": false, "usuarios": false}` — no 'clientes' key.)

#### Scenario: Default editor cannot access clientes
- GIVEN a newly created editor with default permissions
- WHEN the editor navigates to `/cocina/clientes`
- THEN the permissions middleware redirects to `/cocina/dashboard` with permissions error

Migration: Existing profiles MUST be updated so `permissions` jsonb includes `"clientes": false` if key missing. RLS function `can_write('clientes')` MUST check this key.
