# panel-usuarios Specification

## Purpose

Admin-only user management at `/cocina/usuarios`. Create users via Nitro server routes (Supabase Auth admin API), assign roles, edit permissions JSON, deactivate, reset passwords. Service role key NEVER exposed to client.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| USR-001 | User list table: email, role, active status, permissions summary | MUST |
| USR-002 | Create user via Nitro endpoint `POST /api/admin/users` | MUST |
| USR-003 | Edit permissions JSON editor per user | MUST |
| USR-004 | Deactivate user (soft delete: set active=false) | MUST |
| USR-005 | Reset password via Nitro endpoint | MUST |
| USR-006 | Admin-only: editor blocked by permissions middleware + RLS | MUST |

### Requirement: USR-001 — User List

The system MUST render a table at `/cocina/usuarios` listing all profiles joined with `auth.users` email. Columns: email, role (badge: Admin|Editor), activo (badge), permissions summary (icons for carta/menu/eventos/reservas/config/usuarios). Empty state: **"No hay usuarios registrados"**.

#### Scenario: User list displays profiles

- GIVEN 2 admin and 3 editor users exist
- WHEN admin visits `/cocina/usuarios`
- THEN 5 rows display with email, role badges, and permission indicators

### Requirement: USR-002 — Create User

The system MUST provide a form to create a new user: email (required), password (required, min 8 chars), role (select: admin|editor). On submit, calls `POST /api/admin/users` (Nitro route using `serverSupabaseServiceRole`) to create auth user + profile. Success toast: **"Usuario creado correctamente"**.

#### Scenario: Create editor user

- GIVEN admin fills email, password, role=editor
- WHEN admin clicks **"Crear usuario"**
- THEN the auth user is created via server route
- AND a profiles row with default editor permissions is created by the DB trigger
- AND the new user appears in the list

#### Scenario: Duplicate email

- GIVEN an existing user with email "cook@lazingara.es"
- WHEN admin tries to create a user with the same email
- THEN error toast: **"Ya existe un usuario con ese email"**

### Requirement: USR-003 — Edit Permissions

The system MUST provide a permissions editor per user. Editor role: 6 toggle switches (carta, menu_diario, eventos, reservas, configuracion, usuarios). Admin role: all locked (implicit full access). Save updates `profiles.permissions` jsonb. Success toast: **"Permisos actualizados"**.

#### Scenario: Grant reservas permission to editor

- GIVEN admin opens editor user's permissions panel
- WHEN admin toggles reservas=true and saves
- THEN `profiles.permissions` updates with `reservas: true`

### Requirement: USR-004 — Deactivate User

The system MUST allow setting `active=false` on a profile. Deactivated users CANNOT log in (checked in `role.ts`). Soft delete: profile preserved, auth user NOT deleted. Button: **"Desactivar"**. Confirmation: **"¿Desactivar este usuario? No podrá acceder al panel."**.

#### Scenario: Deactivate editor

- GIVEN admin clicks "Desactivar" on an editor
- WHEN admin confirms in the dialog
- THEN profiles.active becomes false
- AND the user can no longer log in

### Requirement: USR-005 — Reset Password

The system MUST provide a reset password action via `POST /api/admin/users/[id]/reset-password` (Nitro server route using `serverSupabaseServiceRole`). Success toast: **"Se ha enviado un enlace de restablecimiento al usuario"**.

#### Scenario: Reset user password

- GIVEN admin clicks "Restablecer contraseña" on a user
- WHEN the Nitro endpoint is called
- THEN Supabase sends a password reset email to the user
- AND success toast appears

### Requirement: USR-006 — Admin-Only Access

The system MUST restrict `/cocina/usuarios` to admin role. Editor visiting SHALL be redirected to `/cocina/dashboard` with permissions error.

#### Scenario: Editor blocked from usuarios

- GIVEN an editor with `usuarios: false`
- WHEN navigating to `/cocina/usuarios`
- THEN redirected to `/cocina/dashboard` with error

## Edge Cases

- **Service role never client-side**: all auth API goes through Nitro endpoints
- **Deactivate self**: admin cannot deactivate own account → **"No puedes desactivar tu propia cuenta"**
- **Password min length**: 8 chars minimum → **"La contraseña debe tener al menos 8 caracteres"**
