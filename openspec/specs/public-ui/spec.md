# public-ui Specification

## Purpose

Shared design system and reusable UI components for all La Zíngara pages — public and admin. Establishes the visual identity (terracotta+cream+slate palette, serif+sans typography) and layout primitives consumed by `/`, `/carta`, `/menu-diario`, `/reservas`, `/eventos`, `/contacto`, and `/cocina/**`.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| PU-001 | Design tokens — terracotta (#C67B5C), cream (#FAF7F2), slate (#2D3748) via CSS custom properties or Tailwind `@theme` | MUST | Unit |
| PU-002 | Serif headings (Playfair/Cormorant) + sans body (Inter/Manrope) via `@nuxt/fonts`; fallback to Google Fonts `@import` | MUST | Integration |
| PU-003 | AppHeader — nav links + mobile hamburger collapse (<768px), sticky on scroll | MUST | Unit |
| PU-004 | AppFooter — name, address, phone, email, social links on every public page | MUST | Unit |
| PU-005 | BaseButton — variants: primary (terracotta bg), secondary (outlined), ghost; sizes: sm/md/lg; disabled state with aria-disabled | MUST | Unit |
| PU-006 | BaseCard — default slot, optional image prop (object-cover top), rounded shadow, cream bg | MUST | Unit |
| PU-007 | PageHero — title (h1), optional subtitle + background image | SHOULD | Unit |
| PU-008 | SectionDivider — horizontal rule with optional label, role="separator" | SHOULD | Unit |
| PU-009 | AdminSidebar — vertical navigation for `/cocina/**`, permission-aware link visibility, mobile collapsible | MUST | Unit |
| PU-010 | Admin layout shell — sidebar + topbar + main content for all `/cocina/**` pages | MUST | Unit |

### Requirement: PU-001 — Design Tokens

The system MUST define terracotta (#C67B5C), cream (#FAF7F2), and slate (#2D3748) as design tokens. All color contrast ratios MUST meet WCAG AA (4.5:1 for normal text).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Terracotta on button | BaseButton variant="primary" mounted | Inspect computed bg color | Resolves to terracotta; contrast >4.5:1 vs white |
| Cream page default | Any public page renders | Inspect layout background | Resolves to cream token |

### Requirement: PU-002 — Typography

The system MUST load serif (Playfair Display or Cormorant Garamond) for headings and sans (Inter or Manrope) for body via `@nuxt/fonts`. If the module fails, MUST fall back to Google Fonts `@import`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Serif on headings | Page loads with fonts resolved | Inspect `<h1>` font-family | Includes serif font name |
| Fallback on failure | `@nuxt/fonts` unavailable | Build completes | Google Fonts `@import` injected in main.css |

### Requirement: PU-003 — AppHeader

The system MUST render navigation in the default layout: Inicio, Carta, Menú, Reservas, Eventos, Contacto. Mobile (<768px): hamburger toggle. Sticky on scroll.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Desktop nav visible | Viewport >= 768px | AppHeader mounts | 6 links visible; hamburger hidden |
| Mobile collapsed | Viewport < 768px | AppHeader mounts | Hamburger visible; links hidden |
| Toggle opens menu | Mobile, nav hidden | Click hamburger | Links visible; click again hides |

### Requirement: PU-004 — AppFooter

The system MUST render AppFooter on every public page with restaurant name, address, phone, email, placeholder social links.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Footer present | Any public page renders | Inspect DOM post-content | Footer with name + contact info visible |

### Requirement: PU-005 — BaseButton

The system MUST provide BaseButton with props: `variant` (primary|secondary|ghost), `size` (sm|md|lg), `disabled`. Emits `click`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Primary variant | variant="primary" mounted | Inspect element | Terracotta bg, white text |
| Disabled blocks click | disabled mounted | Click button | No event emitted; aria-disabled="true" |

### Requirement: PU-006 — BaseCard

The system MUST provide BaseCard: default slot, optional `image` prop (top `object-cover`), rounded shadow, cream bg.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Slot content | `<p>Text</p>` in slot | Mount | "Text" visible inside styled card |
| Image above content | image="/img.jpg" | Mount | `<img>` with object-cover before slot content |

### Requirement: PU-007 — PageHero

The system SHOULD provide PageHero: `title` (h1), optional `subtitle`, optional `background` image.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Title as h1 | title="Nuestra Carta" | Mount | `<h1>` contains "Nuestra Carta" |

### Requirement: PU-008 — SectionDivider

The system SHOULD provide SectionDivider: horizontal rule with optional label text, `role="separator"`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Labeled divider | label="ENTRANTES" | Mount | Line with "ENTRANTES" visible; role="separator" |

### Requirement: PU-009 — Admin Sidebar Navigation

The system MUST provide an `AdminSidebar` component for all `/cocina/**` pages. It SHALL render a vertical navigation with links: **"Panel de Control"** (`/cocina/dashboard`), **"Carta"** (`/cocina/carta`), **"Menú Diario"** (`/cocina/menu-diario`), **"Eventos"** (`/cocina/eventos`), **"Reservas"** (`/cocina/reservas`), **"Configuración"** (`/cocina/configuracion`), **"Usuarios"** (`/cocina/usuarios`). Active link SHALL be highlighted. Links the user lacks permission for SHALL be hidden (not just disabled). The sidebar SHALL be collapsible on mobile (<768px) via hamburger toggle.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Admin sees all links | Admin user is authenticated | Viewing any `/cocina/**` page | Sidebar shows all 7 navigation links; current page highlighted |
| Editor sees permitted links only | Editor with only `carta`, `menu_diario`, `eventos` permissions | Viewing any `/cocina/**` page | Sidebar shows: Panel de Control, Carta, Menú Diario, Eventos, Reservas; Configuración and Usuarios hidden |
| Mobile sidebar collapses | Viewport < 768px | Hamburger toggled | Sidebar collapses/expands without page reload |

### Requirement: PU-010 — Admin Layout Shell

The system MUST provide an admin layout (`app/layouts/cocina.vue`) wrapping all `/cocina/**` pages. It SHALL include: `AdminSidebar` (left, fixed width), main content area (right, scrollable), and a top bar with user email + logout button **"Cerrar sesión"**. The layout MUST use the same design tokens as public pages (terracotta, cream, slate). Admin pages are SPA (`ssr: false`), so no SSR hydration applies.

(Previously: No admin layout existed — Phase 1 was public-only)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Admin layout renders | Authenticated user on any `/cocina/**` page | Page renders | Sidebar on left, content area fills remaining width; top bar shows user email and "Cerrar sesión" |
| Logout from admin layout | User is on `/cocina/carta` | User clicks "Cerrar sesión" in top bar | Session cleared; redirected to `/cocina` |

## Edge Cases

- **Mobile nav**: hamburger accessible via keyboard (Enter/Space), focus trapped when open
- **Color contrast**: terracotta-on-cream and slate-on-cream pass 4.5:1 AA
- **Font fallback**: if `@nuxt/fonts` fails, serif fallback = Georgia; sans fallback = system-ui
- **Button focus**: visible focus ring (outline or ring) on keyboard focus
- **Card image**: broken image → show placeholder gradient; alt text required
- **Admin sidebar**: permission-conditional rendering uses `v-if` so unauthorized links are excluded from DOM, not just hidden
