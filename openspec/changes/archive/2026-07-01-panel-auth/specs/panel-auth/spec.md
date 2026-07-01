# panel-auth Specification

## Purpose

Blind-route `/cocina` authentication via Supabase Auth (email/password). Staff must authenticate before accessing any `/cocina/**` page. No public navigation links to `/cocina`.

## Requirements

| ID | Requirement | RFC 2119 |
|----|------------|----------|
| AUTH-001 | Login page at `/cocina` with email + password form | MUST |
| AUTH-002 | Supabase Auth session persistence via cookie | MUST |
| AUTH-003 | Unauthenticated access to `/cocina/**` redirects to `/cocina` | MUST |
| AUTH-004 | Logout clears session and redirects to `/cocina` | MUST |
| AUTH-005 | Authenticated user visiting `/cocina` is redirected to `/cocina/dashboard` | MUST |

### Requirement: AUTH-001 — Login Page

The system MUST render a login form at `/cocina` with email (type=email) and password (type=password) inputs and a submit button labeled **"Entrar"**. Error state: invalid credentials show inline message **"Credenciales incorrectas"**.

#### Scenario: Successful login

- GIVEN a valid staff user exists in Supabase Auth
- WHEN the user enters valid email and password and clicks "Entrar"
- THEN the user is redirected to `/cocina/dashboard`
- AND the session cookie is set

#### Scenario: Invalid credentials

- GIVEN the login form at `/cocina`
- WHEN the user enters wrong email or password and clicks "Entrar"
- THEN the error **"Credenciales incorrectas"** is displayed
- AND no redirect occurs

### Requirement: AUTH-002 — Session Persistence

The system MUST persist the Supabase Auth session via cookie. On page reload, the session SHALL be restored without re-login. The `useSupabaseUser()` composable SHALL reflect the current user state.

#### Scenario: Session survives page reload

- GIVEN a user is authenticated
- WHEN the user reloads `/cocina/dashboard`
- THEN the page loads without redirecting to `/cocina`
- AND `useSupabaseUser()` returns the authenticated user

### Requirement: AUTH-003 — Route Protection

The system MUST redirect unauthenticated requests to `/cocina/**` routes to `/cocina`. This includes direct URL access and client-side navigation.

#### Scenario: Direct access without session

- GIVEN no active Supabase session
- WHEN the user navigates to `/cocina/dashboard`
- THEN the user is redirected to `/cocina`

### Requirement: AUTH-004 — Logout

The system MUST provide a logout action that clears the Supabase session and redirects to `/cocina`. UI label: **"Cerrar sesión"**. After logout, accessing protected routes MUST redirect to `/cocina`.

#### Scenario: Logout clears session

- GIVEN a user is authenticated and on any `/cocina/**` page
- WHEN the user clicks "Cerrar sesión"
- THEN the session is cleared
- AND the user is redirected to `/cocina`

### Requirement: AUTH-005 — Redirect If Authenticated

The system MUST redirect already-authenticated users who visit `/cocina` directly to `/cocina/dashboard`.

#### Scenario: Auth user visits login page

- GIVEN a user has an active session
- WHEN the user navigates to `/cocina`
- THEN the user is redirected to `/cocina/dashboard`

## Edge Cases

- **Network error**: Supabase unavailable → show **"Error de conexión. Inténtelo de nuevo."**
- **Session expiry**: stale session → next `/cocina/**` navigation triggers redirect to `/cocina`
- **SSR**: `/cocina/**` is SPA-only (`ssr: false`), so auth check runs client-side only
