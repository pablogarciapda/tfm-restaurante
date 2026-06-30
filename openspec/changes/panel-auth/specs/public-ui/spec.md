# Delta for public-ui

## ADDED Requirements

### Requirement: PU-009 — Admin Sidebar Navigation

The system MUST provide an `AdminSidebar` component for all `/cocina/**` pages. It SHALL render a vertical navigation with links: **"Panel de Control"** (`/cocina/dashboard`), **"Carta"** (`/cocina/carta`), **"Menú Diario"** (`/cocina/menu-diario`), **"Eventos"** (`/cocina/eventos`), **"Reservas"** (`/cocina/reservas`), **"Configuración"** (`/cocina/configuracion`), **"Usuarios"** (`/cocina/usuarios`). Active link SHALL be highlighted. Links the user lacks permission for SHALL be hidden (not just disabled). The sidebar SHALL be collapsible on mobile (<768px) via hamburger toggle.

#### Scenario: Admin sees all links

- GIVEN an admin user is authenticated
- WHEN viewing any `/cocina/**` page
- THEN the sidebar shows all 7 navigation links
- AND the current page link is highlighted

#### Scenario: Editor sees permitted links only

- GIVEN an editor with only `carta`, `menu_diario`, `eventos` permissions
- WHEN viewing any `/cocina/**` page
- THEN sidebar shows: Panel de Control, Carta, Menú Diario, Eventos, Reservas
- AND Configuración and Usuarios links are hidden

#### Scenario: Mobile sidebar collapses

- GIVEN viewport < 768px
- WHEN the sidebar hamburger is toggled
- THEN sidebar collapses/expands without page reload

### Requirement: PU-010 — Admin Layout Shell

The system MUST provide an admin layout (`app/layouts/cocina.vue`) wrapping all `/cocina/**` pages. It SHALL include: `AdminSidebar` (left, fixed width), main content area (right, scrollable), and a top bar with user email + logout button **"Cerrar sesión"**. The layout MUST use the same design tokens as public pages (terracotta, cream, slate). Admin pages are SPA (`ssr: false`), so no SSR hydration applies.

(Previously: No admin layout existed — Phase 1 was public-only)

#### Scenario: Admin layout renders

- GIVEN an authenticated user on any `/cocina/**` page
- WHEN the page renders
- THEN the sidebar is on the left, content area fills the remaining width
- AND the top bar shows the user's email and "Cerrar sesión" button

#### Scenario: Logout from admin layout

- GIVEN user is on `/cocina/carta`
- WHEN user clicks "Cerrar sesión" in the top bar
- THEN session is cleared and user is redirected to `/cocina`
