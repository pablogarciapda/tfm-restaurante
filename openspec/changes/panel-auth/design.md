# Design: Panel & Auth (Phase 2)

## Technical Approach

Install `@nuxtjs/supabase` module → auto-import composables (`useSupabaseClient`, `useSupabaseUser`, `serverSupabaseServiceRole`). `/cocina/**` stays SPA (`ssr: false`, already configured). 3-tier middleware (`auth.ts` → `role.ts` → `permissions.ts`) guards all admin routes. Nitro server routes (`server/api/cocina/usuarios/`) handle admin Auth API calls using `serverSupabaseServiceRole` (never client-side). Public pages (`/carta`, `/menu-diario`, `/eventos`) cut over from mock → Supabase via `useAsyncData` composables. 7-table DB migration + RLS + trigger + seed from mock fixtures. All in one phase deploying as a cohesive change.

## Architecture Decisions

| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | **Supabase integration** | `@nuxtjs/supabase` module | Manual `@supabase/supabase-js` + custom plugin; `nuxt-supabase` | Auto-imports, SSR cookie relay, `serverSupabaseServiceRole` in Nitro, first-party Nuxt module. Fallback: manual client if version incompatibility at install |
| 2 | **Middleware chain** | 3 files: `auth.ts` (session)→ `role.ts` (profile load)→ `permissions.ts` (jsonb check) | Single middleware; inline checks per page | Separation of concerns; each middleware independently testable; clear failure boundaries per PERM-005 |
| 3 | **Permissions storage** | `jsonb` on `profiles` with boolean-per-resource keys | Separate `permissions` table (many-to-many); `text[]` array of resource names | Single row load in `role.ts` middleware; flexible schema without migrations; JSON operator in Postgres RLS (`->>`) efficient for boolean checks |
| 4 | **RLS enforcement** | `can_write(resource)` Postgres `SECURITY DEFINER` function called by all RLS policies | Inline RLS checks per table; app-level enforcement only | Single source of truth for permission logic; RLS enforced at DB level regardless of client; admin bypass via `role='admin'` check in SQL |
| 5 | **Profile auto-creation** | Postgres trigger on `auth.users` INSERT calling `handle_new_user()` | Webhook on `auth.users`; app-level post-signup hook | Atomic with user creation; no external dependency; runs with `SECURITY DEFINER` to bypass RLS |
| 6 | **Admin layout** | `app/layouts/cocina.vue` (sidebar + top bar + main) with `AdminSidebar` component | Inline sidebar per page; `<NuxtLayout>` with named slots | Nuxt layout auto-applies to `/cocina/**`; sidebar component isolated for permission-aware nav; follows existing `default.vue` pattern |
| 7 | **CRUD component pattern** | Per-resource: `{Resource}Form` + `{Resource}Table` + confirmation dialog | Generic `<CrudPage>` with render props; inline forms | Explicit contracts per resource type allow tailored validation and UX (e.g., `PlatoForm` has alergenos multi-select, `EventoForm` has date picker) |
| 8 | **Menu diario pricing** | Two tables: `menu_diario_config` (day config + price) + `menu_diario_items` (dishes per section per day) | Single `menu_diario` table with JSON columns; `platos` FK for menu items | Config-per-day enables variable pricing (Mon-Fri 16€, Sat 25€). Free-text dish names allow specials not in carta. `seccion` CHECK constraint enforces 5-section structure |
| 9 | **Public page migration** | `usePlatos()`, `useMenuDiario()`, `useEventos()` composables wrapping `useAsyncData`; mock fixtures → DB seed | Gradual feature-flag migration; keep mock as fallback | Clean cutover per spec CN-006, MD-004, EG-001; `useAsyncData` preserves SSR; seed data ensures backward-compatible content |
| 10 | **Service role isolation** | `serverSupabaseServiceRole` only in Nitro `server/api/` routes; `.env` key never in `runtimeConfig.public` | `NUXT_SUPABASE_SERVICE_ROLE_KEY` via module; manual supabaseAdmin client | `@nuxtjs/supabase` strips service role from client bundle automatically; Nitro routes are server-only by definition; verified at build per AR-006 |

## Sequence Diagrams

### Login Flow
```
User        /cocina page    auth middleware   Supabase Auth
 │               │               │                │
 │─GET /cocina──▶│               │                │
 │               │─check session────────────────▶│
 │               │◀──null (no session)──────────│
 │               │ redirect /cocina              │
 │◀──login form──│                               │
 │─submit email+password─────────────────────────▶│
 │◀──session cookie + redirect /cocina/dashboard─│
```

### Middleware Chain
```
Request  →  auth.ts  →  role.ts  →  permissions.ts  →  Page
          check session  load profile    map route→resource
          no→/cocina     no→logout       denied→/cocina/dashboard
                                    admin?→pass (skip jsonb check)
```

### CRUD Plato (Editor)
```
Editor    PlatoForm    useSupabaseClient    RLS(can_write)    DB
 │            │              │                    │             │
 │─fill form─▶│              │                    │             │
 │            │─insert()────▶│                    │             │
 │            │              │─INSERT────────────▶│             │
 │            │              │                    │─can_write('carta')→true
 │            │              │◀──row─────────────│─────────────│
 │            │◀──data──────│                    │             │
 │◀──toast──│                                   │             │
```

### User Creation (Admin via Nitro)
```
Admin    UsuarioForm    POST /api/cocina/usuarios/create    serverSupabaseServiceRole    Supabase Admin API
 │           │                        │                              │                          │
 │─fill────▶│                        │                              │                          │
 │           │─$fetch────────────────▶│                              │                          │
 │           │                        │─createUser(email,pass)──────▶│                          │
 │           │                        │                              │─auth.admin.createUser()─▶│
 │           │                        │◀──user──────────────────────│◀─────────────────────────│
 │           │                        │ (trigger→profiles row)      │                          │
 │           │◀──{success}───────────│                              │                          │
 │◀──toast──│                                                       │                          │
```

### Public Page SSR Data Fetch
```
Browser     Nuxt SSR      usePlatos()      useSupabaseClient    Supabase    RLS
 │              │              │                   │               │          │
 │─GET /carta──▶│              │                   │               │          │
 │              │─useAsyncData─▶│                   │               │          │
 │              │              │─from('platos')────▶│               │          │
 │              │              │                   │─SELECT────────▶│          │
 │              │              │                   │               │─anon read✓│
 │              │              │                   │◀──rows────────│          │
 │              │◀──data──────│                   │               │          │
 │◀──HTML──────│                                                      │
```

## DB Schema

### Migration Order (Supabase MCP `apply_migration`)

1. **`profiles`**: `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor'))`, `permissions jsonb NOT NULL DEFAULT '{"carta":true,"menu_diario":true,"eventos":true,"reservas":false,"configuracion":false,"usuarios":false}'`, `activo boolean NOT NULL DEFAULT true`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`

2. **`platos`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `nombre text NOT NULL UNIQUE`, `descripcion text`, `precio numeric(6,2) NOT NULL`, `categoria text NOT NULL`, `tipo_menu text DEFAULT 'carta'`, `imagen_url text`, `disponible boolean DEFAULT true`, `calorias int`, `alergenos text[]`, `puesto int DEFAULT 0`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`. Index: `idx_platos_categoria` on `categoria`.

3. **`eventos`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `titulo text NOT NULL`, `descripcion text`, `fecha timestamptz NOT NULL`, `categoria text NOT NULL CHECK (categoria IN ('festivo','espectaculo'))`, `imagen_url text`, `capacidad int`, `estado text DEFAULT 'programado'`, `activo boolean DEFAULT true`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`. Index: `idx_eventos_fecha_activo` on `(fecha, activo)`.

4. **`menu_diario_config`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `day_of_week int NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6)`, `precio text NOT NULL`, `activo boolean DEFAULT false`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`

5. **`menu_diario_items`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `config_id uuid NOT NULL REFERENCES menu_diario_config(id) ON DELETE CASCADE`, `seccion text NOT NULL CHECK (seccion IN ('primer','segundo','postre','bebida','pan'))`, `plato_nombre text NOT NULL`, `descripcion text`, `puesto int DEFAULT 0`. Index: `idx_menu_items_config` on `config_id`.

6. **`configuracion`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `cliente_elige_mesa boolean DEFAULT false`, `capacidad_total_local int DEFAULT 80 CHECK (capacidad_total_local >= 1 AND capacidad_total_local <= 999)`, singleton enforced by app (single row, upsert-only)

7. **`reservas`**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `nombre_cliente text NOT NULL`, `telefono text`, `email text`, `fecha_hora timestamptz NOT NULL`, `numero_comensales int`, `estado text DEFAULT 'pendiente'`, `mesa_id uuid`, `created_at timestamptz DEFAULT now()`

## RLS Policies

### `can_write()` Function
```sql
CREATE OR REPLACE FUNCTION can_write(resource text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR (role = 'editor' AND (permissions->>resource)::boolean))
  );
END; $$;
```

### Policy Matrix

| Table | Operation | Policy |
|-------|-----------|--------|
| `platos`, `eventos`, `menu_diario_config`, `menu_diario_items` | SELECT | `true` (anon read) |
| `platos` | INSERT/UPDATE/DELETE | `can_write('carta')` |
| `eventos` | INSERT/UPDATE/DELETE | `can_write('eventos')` |
| `menu_diario_config`, `menu_diario_items` | INSERT/UPDATE/DELETE | `can_write('menu_diario')` |
| `configuracion` | SELECT | `(auth.role() = 'authenticated')` |
| `configuracion` | INSERT/UPDATE/DELETE | `can_write('configuracion')` |
| `reservas` | SELECT | `true` (anon read) |
| `reservas` | INSERT | `true` (public reservation form) |
| `reservas` | UPDATE/DELETE | `can_write('reservas')` |
| `profiles` | SELECT/UPDATE | `auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')` |

### Auth Trigger
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, permissions)
  VALUES (NEW.id, 'editor', '{"carta":true,"menu_diario":true,"eventos":true,"reservas":false,"configuracion":false,"usuarios":false}');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Component Architecture

### New Components

| Component | Responsibility | Path |
|-----------|---------------|------|
| `Cocina` layout | Sidebar + top bar + main slot for all `/cocina/**` | `app/layouts/cocina.vue` |
| `AdminSidebar` | Permission-aware nav: hide links user lacks permission for | `app/components/AdminSidebar.vue` |
| `PlatoForm` | Create/edit plato form with alergenos multi-select | `app/components/PlatoForm.vue` |
| `PlatosTable` | Sortable table: nombre, categoria, tipo_menu, precio, disponible toggle | `app/components/PlatosTable.vue` |
| `EventoForm` | Event form with date picker, categoria select | `app/components/EventoForm.vue` |
| `EventosTable` | Event list sorted fecha DESC | `app/components/EventosTable.vue` |
| `MenuDiarioEditor` | Day selector + 5-section dish manager + add/remove per section | `app/components/MenuDiarioEditor.vue` |
| `UsuarioForm` | Create user: email, password, role select | `app/components/UsuarioForm.vue` |
| `UsuariosTable` | User list: email, role badge, activo badge, permission summary | `app/components/UsuariosTable.vue` |
| `PermissionsEditor` | 6 toggle switches per resource (admin-only) | `app/components/PermissionsEditor.vue` |
| `MetricCard` | Simple: label + value + icon, used 3× on dashboard | `app/components/MetricCard.vue` |
| `ConfiguracionForm` | Toggle + number input for sistema settings | `app/components/ConfiguracionForm.vue` |

### New Composables

| Composable | Source | Pattern |
|------------|--------|---------|
| `usePlatos()` | `app/composables/usePlatos.ts` | `useAsyncData('platos', () => client.from('platos').select('*').order('puesto'))` |
| `useMenuDiario()` | `app/composables/useMenuDiario.ts` | `useAsyncData` joining `menu_diario_config` + `menu_diario_items` for current day |
| `useEventos()` | `app/composables/useEventos.ts` | `useAsyncData('eventos', () => client.from('eventos').select('*').eq('activo', true).gte('fecha', now).order('fecha'))` |
| `useAuth()` | `app/composables/useAuth.ts` | Wraps `useSupabaseClient().auth` for signIn/signOut/onAuthStateChange |
| `useDashboard()` | `app/composables/useDashboard.ts` | Parallel `useAsyncData` for 3 metrics (DASH-002/-003/-004) |

### New Pages

`app/pages/cocina/`: `index.vue` (login), `dashboard.vue`, `carta.vue`, `menu-diario.vue`, `eventos.vue`, `configuracion.vue`, `usuarios.vue`

## Nitro Endpoints

`server/api/cocina/usuarios/` — all use `serverSupabaseServiceRole` (RLS bypass):
- `create.post.ts` — `auth.admin.createUser()` then insert profiles
- `update.post.ts` — update `profiles.role` and `profiles.permissions`
- `deactivate.post.ts` — set `profiles.activo = false`
- `reset-password.post.ts` — `auth.admin.generateLink({type:'recovery'})`
- `list.get.ts` — join `auth.users` + `profiles` for user management table

## Migration Plan

1. `pnpm add @nuxtjs/supabase` (verify Nuxt 4.4.8 compat)
2. Run 7 `apply_migration` calls in order: profiles → platos → eventos → menu_diario_config → menu_diario_items → configuracion → reservas
3. Run `can_write()` function + `handle_new_user()` trigger + RLS enable/policies via `apply_migration`
4. Seed from fixtures: transform `mockCarta` → `platos` INSERTs, `mockMenuDiario` → `menu_diario_config` + `menu_diario_items`, `mockEventos` → `eventos`
5. Run `supabase_get_advisors(type=security)` — must return no new issues
6. Revert scripts stored at `shared/db/revert/` per proposal rollback plan

## Open Questions

- [ ] `@nuxtjs/supabase` version compatibility with Nuxt 4.4.8 — verify at install; fallback: manual `@supabase/supabase-js` + custom plugin
- [ ] `menu_diario_items.plato_nombre`: free text or FK to `platos`? Free text allows daily specials not in carta (chosen for now per CMD-004 scenarios), but loses referential integrity

## File Changes Summary

| Action | Count | Key Files |
|--------|-------|-----------|
| Create | ~30 | 7 pages, 12 components, 5 composables, 3 middleware, 5 Nitro endpoints, design.md |
| Modify | ~4 | `nuxt.config.ts` (+module), `app/pages/carta.vue` (→usePlatos), `app/pages/menu-diario.vue` (→useMenuDiario), `app/pages/eventos.vue` (→useEventos) |
| Delete | 0 | Mock fixtures retained as reference; imports removed from pages |
