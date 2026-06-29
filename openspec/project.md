# La Zíngara — tfm-restaurant

## Description

Restaurant platform for **Restaurante La Zíngara** (Santa María del Páramo, León, Spain; www.lazingara.es). Two surfaces:

- **Public website** (SSR, SEO): home, carta, menú diario, reservas, eventos, contacto.
- **Admin panel** at `/cocina/**` (SPA, auth-protected): dashboard, CRUD platos/menús/eventos, and a Konva.js Canvas table manager with table-fusion logic + Realtime sync.

## Stack

| Layer        | Tech                                                       |
| ------------ | ---------------------------------------------------------- |
| Frontend     | Nuxt 4.4.8 (`srcDir: app/`), Vue 3 Composition API + `<script setup>` + TypeScript |
| Styling      | Tailwind CSS v4 (CSS-first `@theme` tokens in `app/assets/css/main.css`) |
| Graphics     | `konva` + `vue-konva` (Canvas 2D, 60 FPS) — admin only     |
| BaaS         | Supabase (PostgreSQL, Realtime, Auth, Storage)             |
| Deploy       | VPS dedicated, Nuxt in persistent Node mode                |
| Tests        | Vitest 4.1.0 (unit/integration), Playwright 1.61.0 (e2e)   |
| Package mgr  | **pnpm** (mandatory; never npm/yarn)                       |

## Architecture

- **Nuxt 4 `srcDir: app/`**: pages, components, composables, layouts, middleware, plugins, stores, utils, assets, app.vue live under `app/`. Root keeps `server/`, `public/`, `shared/`, `nuxt.config.ts`.
- **File-based routing**: `app/pages/**` → public SSR routes; `/cocina/**` guarded by Nuxt middleware with `routeRules: { '/cocina/**': { ssr: false } }` for SPA mode.
- **Modular by domain**: each module has single responsibility + low coupling. Cross-module interaction only via interfaces/contracts/events — never via internal references.
- **Shared contracts**: `shared/` is auto-imported on both client and server in Nuxt 4. Contracts (`shared/contracts/`), types (`shared/types/`), utils (`shared/utils/`), fixtures (`shared/fixtures/`).
- **Server routes over separate backend**: Nuxt Nitro handles API; Supabase handles auth/data.

## Data Model (PostgreSQL / Supabase)

- `configuracion` (`cliente_elige_mesa`, `capacidad_total_local`)
- `platos` (`nombre`, `descripcion`, `precio`, `categoria`, `tipo_menu`, `imagen_url`, `disponible`, `calorias`, `alergenos text[]`)
- `mesas` (`numero_mesa`, `capacidad_base`, `posicion_x/y`, `ancho`, `alto`, `rotacion`, `zona`, `mesa_padre_id` FK, `id_fusion`, `capacidad_actual`)
- `reservas` (`nombre_cliente`, `telefono`, `email`, `fecha_hora`, `numero_comensales`, `estado`, `mesa_id` FK)

**Table fusion**: two+ tables join logically → shared `id_fusion` + `mesa_padre_id`. Realistic capacity: two 4-seat tables fused seat 6 (not 8). Occupation subtracts from configurable `capacidad_total_local`.

## Conventions

- **Vue 3**: Composition API with `<script setup>` + TypeScript. NEVER Options API.
- **Tailwind**: utility-first; avoid custom CSS except justified cases (Tailwind v4 `@theme` for tokens).
- **Supabase**: access via `@supabase/supabase-js`; never expose `service_role` key on the client.
- **DB migrations**: always via Supabase migration tool; never hardcode generated IDs.
- **RLS**: required on ALL Supabase tables. Run `supabase_get_advisors(type=security)` after schema changes.
- **Testing**: TDD (Test-Driven Development). Tests written before or alongside implementation. `strict_tdd: true` in `openspec/config.yaml`.
- **Commits**: conventional commits, no AI attribution.

## Language Policy

- **Technical artifacts** (code, identifiers, comments, commit messages, PR descriptions): English by default.
- **UI copy** (user-facing strings, labels, error messages): Spanish (es-ES, neutral) unless explicitly requested otherwise.
- **Conversation**: matches the user's language.

## Guiding Principles

- **Concepts over code**: understand fundamentals before implementing.
- **SOLID foundations**: design patterns, clean/hexagonal architecture, atomic design, container-presentational.
- **Security first**: OWASP Top 10 (2025), RLS everywhere, HTTPS mandatory.
- **No shortcuts**: real learning and quality take effort and time.

## Roadmap

- **Phase 1 — MVP Usuario** (current): public frontend, SEO local, carta/menú read, form reservations.
- **Phase 2 — Panel & Auth**: blind route `/cocina`, Supabase Auth, navigation, CRUDs.
- **Phase 3 — Motor de Mesas**: Konva.js table plan, fusion logic in DB, Realtime sync.

## SDD Status

- **Change #1** `bootstrap-nuxt-app` — ARCHIVED 2026-06-28 (Nuxt 4.4.8 scaffold + TDD tooling foundation).
- **Change #2** `public-pages-design` — ARCHIVED 2026-06-29 (6 public pages + SMS verification module + mock data, 202 vitest tests + 14 playwright, 87.86% coverage, 38/38 reqs + 104/104 scenarios verified).
