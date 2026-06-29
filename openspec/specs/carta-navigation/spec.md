# carta-navigation Specification

## Purpose

La Zíngara carta (menu) page at `/carta`. Category-based browsing with sticky scroll-spy navigation, responsive product grid, and product cards sourced from `shared/fixtures/carta-mock.ts`. Dividers ("— CARNES —") render as sub-headers, NOT product cards.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| CN-001 | CategorySelector — horizontal scrollable bar; desktop: carousel arrows; mobile: native touch scroll; active category indicator (underline/color) | MUST | Unit |
| CN-002 | Scroll-spy — IntersectionObserver updates active category on vertical scroll; sticky after hero (top-0 z-50); SSR-safe (guard process.client) | MUST | Unit |
| CN-003 | ProductGrid — responsive CSS Grid: 1-2 cols mobile, 2-3 tablet, 3-4 desktop | MUST | Unit |
| CN-004 | ProductCard — image (aspect-square object-cover), name, truncated description (2 lines), price, allergen icons; lazy loading images | MUST | Unit |
| CN-005 | Divider platos — dishes with empty precio render as category sub-headers, NOT ProductCards | MUST | Unit |
| CN-006 | Data source — `shared/fixtures/carta-mock.ts` (MockCategoria[], MockPlato[]) | MUST | Integration |
| CN-007 | Image lazy loading — native `loading="lazy"` or `@nuxt/image`; placeholder on load error | MUST | Unit |

### Requirement: CN-001 — CategorySelector

The system MUST render a horizontal scrollable category bar. Desktop: left/right arrow buttons when categories overflow. Mobile: native touch scroll (`overflow-x-auto scrollbar-hide`). Active category MUST have a visible indicator (underline or color change).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Desktop arrows appear | Desktop viewport, categories overflow | CategorySelector mounts | Left/right arrow buttons visible |
| Arrow scrolls categories | Desktop, arrows visible | Click right arrow | Categories scroll right; left arrow becomes enabled |
| Mobile touch scroll | Mobile viewport | CategorySelector mounts | Bar scrolls via touch; no visible scrollbar |
| Active indicator | Category "ENSALADAS" selected | Inspect active item | Underline or color change distinguishes it from others |

### Requirement: CN-002 — Scroll-spy

The system MUST use IntersectionObserver to detect which category section is visible during vertical scroll. The CategorySelector MUST reflect the active category. Sticky positioning (`top-0 z-50`) MUST engage after the PageHero scrolls past. MUST guard IntersectionObserver with `process.client` for SSR safety.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Scroll updates active | Page scrolled to "PESCADOS" section | Observer fires intersection | CategorySelector highlights "PESCADOS" |
| Sticky after hero | CategorySelector is below hero | Scroll past hero | Selector sticks to top (top-0) |
| SSR-safe render | Server renders `/carta` | No IntersectionObserver on server | Page renders without error; observer initializes on client mount |

### Requirement: CN-003 — ProductGrid

The system MUST render products in a responsive CSS Grid: 1 column (<640px), 2 columns (640-1023px), 3 columns (1024-1279px), 4 columns (≥1280px). Products are grouped under their category sub-heading.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Mobile 1-col | Viewport 375px | Grid renders | Products in single column |
| Tablet 2-3 col | Viewport 768px | Grid renders | 2-3 columns visible |
| Desktop 4-col | Viewport 1440px | Grid renders | 4 columns visible |

### Requirement: CN-004 — ProductCard

The system MUST render each dish as a ProductCard: image (top, `aspect-square`, `object-cover`), name, description (max 2 lines, truncated with ellipsis), price, allergen icons. Images MUST lazy-load.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Card renders all fields | Plato with image, name, desc, price, alergenos | Mount ProductCard | Image, name, truncated desc, price, allergen icons visible |
| Truncated long description | Descripción > 80 chars | Mount | Text truncated to 2 lines with ellipsis |
| Image load error | Image URL 404s | Image fails to load | Placeholder gradient shown; alt text remains |
| Price "/Pers." format | Precio = "33/Pers." | Mount | "33€ / persona" displayed (or original format preserved) |

### Requirement: CN-005 — Divider Platos as Sub-headers

The system MUST detect dishes with empty `precio` field (e.g., "— CARNES —") and render them as category sub-headers with SectionDivider styling, NOT ProductCards.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Divider renders as header | Plato with precio="" ("— CARNES —") | ProductGrid renders that item | Sub-header styled divider, no image/price card |
| Normal dish unaffected | Plato with precio="22" | ProductGrid renders | Renders as normal ProductCard |

### Requirement: CN-006 — Data Source

The system MUST source carta data from `shared/fixtures/carta-mock.ts`. Structure: `MockCategoria[]` with nested `platos[]`. Categories sorted by `puesto`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Data imports correctly | Import mockCarta from fixtures | Map categories to ProductGrid | All categories render with their platos |
| Empty category | Category has no platos | ProductGrid processes | Category header renders; no cards below |

### Requirement: CN-007 — Image Lazy Loading

The system MUST lazy-load product images using native `loading="lazy"` or `@nuxt/image`. A placeholder gradient MUST appear during load and on error. Alt text MUST be present.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Lazy attribute present | ProductCard with image mounts | Inspect `<img>` | `loading="lazy"` attribute is set |
| Slow load shows placeholder | Image loads slowly (>500ms) | During load | Placeholder gradient visible until image ready |

## Edge Cases

- **Empty carta**: if `mockCarta` is empty, page shows "Carta no disponible" message
- **Single dish in category**: grid still renders correctly (1 column, no overflow)
- **Price format variants**: "33/Pers.", "75€/kg", "CONSULTAR" — all render as text without breaking layout
- **Missing optional fields**: dish without `descripcion` → omit description line; without `alergenos` → omit allergen icons
- **Scroll-spy on fast scroll**: debounce observer updates to avoid flicker (300ms throttle)
- **SSR mismatch**: CategorySelector initial active state set from first category; client hydrates and corrects on mount
