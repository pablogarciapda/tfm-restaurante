# panel-permissions Specification

## Purpose

Role-based access control with 2 roles (admin/editor), permissions stored as `jsonb` in the `profiles` table, enforced by a 3-tier Nuxt middleware chain (auth → role → permissions) and Postgres RLS via a `can_write(resource)` function.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| PERM-001 | Profiles table with `role` (admin|editor) and `permissions` (jsonb) | MUST |
| PERM-002 | Auth trigger: new `auth.users` row auto-creates `profiles` row | MUST |
| PERM-003 | Default editor permissions: `{carta,menu_diario,eventos}` = true; `{reservas,configuracion,usuarios}` = false | MUST |
| PERM-004 | `can_write(resource)` Postgres function for RLS policy enforcement | MUST |
| PERM-005 | 3-tier middleware: auth.ts → role.ts → permissions.ts | MUST |

### Requirement: PERM-001 — Profiles Table

The system MUST maintain a `profiles` table with columns: `id` (uuid, PK, FK→auth.users), `role` (text, 'admin'|'editor'), `permissions` (jsonb). Admin role has implicit full permissions; editor permissions are checked from the jsonb field.

#### Scenario: Admin has full access

- GIVEN a profiles row with role='admin'
- WHEN the permissions middleware checks any resource
- THEN access is granted without consulting the permissions jsonb

#### Scenario: Editor access determined by jsonb

- GIVEN a profiles row with role='editor' and permissions='{"carta":true,"usuarios":false}'
- WHEN the user requests `/cocina/carta`
- THEN access is granted
- WHEN the user requests `/cocina/usuarios`
- THEN access is denied with error **"No tiene permisos para acceder a esta sección"**

### Requirement: PERM-002 — Auth Trigger

The system MUST create a Postgres trigger on `auth.users` INSERT that auto-creates a corresponding `profiles` row with role='editor' and the default permissions jsonb. The trigger MUST run with `SECURITY DEFINER`.

#### Scenario: New signup auto-creates profile

- GIVEN a new user is created in auth.users
- WHEN the trigger fires on INSERT
- THEN a profiles row is created with role='editor' and default permissions

### Requirement: PERM-003 — Default Editor Permissions

The default editor permissions jsonb MUST be: `{"carta": true, "menu_diario": true, "eventos": true, "reservas": false, "configuracion": false, "usuarios": false}`.

#### Scenario: Default editor cannot access usuarios

- GIVEN a newly created editor with default permissions
- WHEN the editor navigates to `/cocina/usuarios`
- THEN the permissions middleware redirects to `/cocina/dashboard` with error

### Requirement: PERM-004 — can_write() Function

The system MUST provide a Postgres function `can_write(resource text)` returning boolean. It SHALL check `profiles.role` (admin=true) or `profiles.permissions->>resource` for editors. RLS policies SHALL call this function for INSERT/UPDATE/DELETE.

#### Scenario: Editor can write to permitted table

- GIVEN editor permissions include "carta"=true
- WHEN an INSERT is attempted on `platos` table
- THEN `can_write('carta')` returns true and the RLS policy allows the write

### Requirement: PERM-005 — Middleware Chain

The system MUST register 3 middleware files executed in order: `auth.ts` (session check → redirect /cocina), `role.ts` (load profile, set `useNuxtApp().$role`), `permissions.ts` (check route vs permissions jsonb, block if denied). Editor blocked from a route MUST redirect to `/cocina/dashboard` with error toast: **"No tiene permisos para esta sección"**.

#### Scenario: Editor blocked from configuracion

- GIVEN an editor with `configuracion: false` in permissions
- WHEN navigating to `/cocina/configuracion`
- THEN redirect to `/cocina/dashboard`
- AND toast shows the error message

#### Scenario: Admin passes all middleware

- GIVEN an admin user with active session
- WHEN navigating to any `/cocina/**` route
- THEN all 3 middleware checks pass and the page renders

## Edge Cases

- **Missing profile**: `role.ts` encounters no profile → force logout + redirect to `/cocina`
- **Corrupt jsonb**: permissions field unparseable → treat as no permissions (editor blocked from all except dashboard)
- **Service role bypass**: `serverSupabaseServiceRole` on Nitro routes ignores RLS for admin user management
