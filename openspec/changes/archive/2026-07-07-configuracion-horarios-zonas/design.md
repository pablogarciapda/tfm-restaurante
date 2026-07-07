# Design: Configuración de Horarios, Zonas y Días Bloqueados

## Technical Approach

Extend the single-row `configuracion` table with 2 JSONB columns (`horarios_config`, `zonas_config`) + 1 enum (`cliente_elige_zona`), add a new `dias_bloqueados` table with CRUD API, and modify `reservas` (add `zona`). Replace the `<datetime-local>` input with a dynamic 15-min slot grid generated client-side from `horarios_config`. Add admin zone/mesa reassignment via `PATCH /api/reservas/[id]/mesa`.

Follows existing patterns: config API uses `serverSupabaseServiceRole` + handler functions; reservation form emits typed payload; API routes thin-wire handlers.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| JSONB for horarios/zonas vs separate tables | JSONB: simpler, single write. Tables: queryable, normalized. | **JSONB** — single-row config table; values change rarely, never queried relationally. Follows existing `secciones_config` JSONB pattern in `menu_diario_config`. |
| Annual MM-DD recurrence vs daily day_of_week | Annual: one row blocks every year. Weekly: blocks every Mon. | **Annual** — per spec BLO-002. Computed in query: `EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM today) AND EXTRACT(DAY FROM fecha) = EXTRACT(DAY FROM today)`. |
| Slot generation: server vs client | Server: single source of truth. Client: instant UI, no fetch per date. | **Both** — client generates grid from `horarios_config` for instant rendering; server validates slot membership (±5 min tolerance) + blocked days on submit. |
| dias_bloqueados GET: public vs admin-only | Public: client checks blocked dates. Admin: data is configuration. | **Public GET** — reservation page needs blocked-dates info. POST/DELETE admin-only. Follows same service-role bypass pattern as `GET /api/config`. |
| Zone CHECK constraint: dynamic vs remove | Dynamic: integrity enforced. Remove: simpler but no DB-level guard. | **Dynamic** — update CHECK on `zonas_config` save. Mesas rows auto-updated. Cost of occasional DDL is acceptable for config-level operation. |
| mesas.zona Privado→Reservado rename | Migration: UPDATE rows + ALTER CHECK. Risk: FK breakage (none exist; zona is TEXT not FK). | **Migration** — safe: `zona` is a text column, not a FK. Only CHECK constraint needs rewrite. |

## Data Flow

```
Client /reservas                          Server API
──────────────                            ──────────
┌──────┐    GET /api/config               ┌─────────────┐
│ Slot │───(horarios,zones,elige_zona)───▶│ config.get  │
│ Grid │                                   │ (already     │
│      │◀──config JSONB ◀────────────────│  public)     │
└──┬───┘                                   └─────────────┘
   │ date selected                          ┌──────────────┐
   ├── GET /api/dias-bloqueados ──────────▶│ dias.get     │
   │◀─ blocked dates ◀────────────────────│ (public)     │
   │                                        └──────────────┘
   │ slot + zona selected                   ┌──────────────┐
   └── POST /api/reservas ────────────────▶│ reservas.post│
      {fecha_hora, zona, ...}              │  validate:   │
                                           │  · slot match│
                                           │  · not blocked│
                                           │  · zone valid │
                                           └──────────────┘
```

Admin zone reassignment: selects zone dropdown → mesas filtered by zone → `PATCH /api/reservas/[id]/mesa {zona, mesa_id}` → validates mesa FK + zone membership.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXX_horarios_zonas.sql` | Create | Migration: 3 new configuracion cols, dias_bloqueados table, reservas.zona, mesas CHECK update, default updates |
| `shared/contracts/reservation.contract.ts` | Modify | Add `HorarioConfig`, `ZonaConfigEntry`, `DiaBloqueado`, `TimeSlot` types. Extend `ConfigData`/`ConfigUpdatePayload` with new fields |
| `shared/contracts/mesas.contract.ts` | Modify | Change `Zona` type from union literal to `string` (zones now dynamic) |
| `server/api/config.handlers.ts` | Modify | Add Zod validation for horarios_config + zonas_config in `handleUpdateConfig`. Add new fields to redacted response |
| `server/api/reservas.handlers.ts` | Modify | Add slot validation, blocked-date check, zona field in body. Validate zona against zonas_config |
| `server/api/dias-bloqueados.get.ts` | Create | Public GET — list all blocked days |
| `server/api/dias-bloqueados.post.ts` | Create | Admin POST — create blocked day (validates not past) |
| `server/api/dias-bloqueados/[id].delete.ts` | Create | Admin DELETE — remove blocked day |
| `server/api/reservas/[id]/mesa.patch.ts` | Create | Admin PATCH — reasign zona/mesa |
| `server/api/reservas/[id]/mesa.handlers.ts` | Create | Handler: validate zona ∈ zonas_config, mesa FK + zone match |
| `server/utils/slots.ts` | Create | `generateTimeSlots(config: HorarioConfig): TimeSlot[]` shared utility |
| `server/utils/zod-schemas.ts` | Create | Zod schemas: `horariosConfigSchema`, `zonasConfigSchema` |
| `app/components/ConfiguracionForm.vue` | Modify | Add 3 sections: Horarios (time inputs + intervalo), Zonas (CRUD table with add/delete/toggle), Días Bloqueados (inline table via API). Add `cliente_elige_zona` radio group to Elección de mesa section |
| `app/components/ReservationForm.vue` | Modify | Replace datetime-local with SlotGrid (date picker + grouped slot buttons). Add zone dropdown (conditional). Extend `ReservationPayload` with `zona?`. Remove `fecha_hora` validation, add slot selection validation |
| `app/pages/reservas.vue` | Modify | Fetch `horarios_config`, `zonas_config`, `cliente_elige_zona`, `dias_bloqueados` on mount. Pass to ReservationForm. Include `zona` in POST body |

## Interfaces / Contracts

```ts
// New types in reservation.contract.ts
interface HorarioConfig {
  comida_inicio: string   // "HH:MM"
  comida_fin: string
  cena_inicio: string
  cena_fin: string
  intervalo_minutos: number
}

interface ZonaConfigEntry {
  id: string
  nombre: string
  capacidad: number
  enabled: boolean
}

interface DiaBloqueado {
  id: string
  fecha: string          // ISO date
  recurrente: boolean
  motivo: string | null
  created_at: string
}

interface TimeSlot {
  time: string           // "HH:MM"
  turno: 'comida' | 'cena'
}

// Extended ReservationPayload (adds)
zona?: string            // zone name from selector
```

## Zod Schemas (server-side)

```ts
// Shared utils — server/api/utils/zod-schemas.ts
const horariosConfigSchema = z.object({
  comida_inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  comida_fin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cena_inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cena_fin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  intervalo_minutos: z.union([z.literal(5),z.literal(10),z.literal(15),z.literal(20),z.literal(30),z.literal(60)]),
}).refine(d => d.comida_inicio < d.comida_fin, 'comida: inicio antes de fin')
  .refine(d => d.cena_inicio < d.cena_fin, 'cena: inicio antes de fin')

const zonasConfigSchema = z.array(z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  capacidad: z.number().int().min(0).max(999),
  enabled: z.boolean(),
})).min(1, 'Al menos una zona debe estar configurada')
  .refine(z => z.filter(x => x.enabled).length >= 1, 'Al menos una zona activa')
```

## Migration Plan

1. `ALTER TABLE configuracion` ADD `horarios_config JSONB DEFAULT '{...}'`, `zonas_config JSONB DEFAULT '[...]'`, `cliente_elige_zona TEXT DEFAULT 'none' CHECK IN ('none','zona','zona_mesa')`
2. `ALTER TABLE configuracion` ALTER `capacidad_total_local` DEFAULT 264
3. CREATE `dias_bloqueados` table (5 cols, RLS, admin-write policy)
4. `ALTER TABLE mesas` DROP CHECK → UPDATE zona='Privado' to 'Reservado' → ADD CHECK with new zone names
5. `ALTER TABLE reservas` ADD `zona TEXT NULL`
6. Update existing config row: SET defaults on new columns

Rollback: reverse DDL + revert ReservationForm to datetime-local.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit — contracts | Zod schemas: valid/invalid horarios, zonas | Vitest: validate/reject edge cases |
| Unit — utils | `generateTimeSlots()`: lunch, dinner, interval divisors | Pure function, no Supabase |
| Unit — components | ConfiguracionForm new sections, slot grid rendering, zone dropdown conditional | Existing `@vue/test-utils` + `vi.mock(#imports)` |
| Unit — API | Config handlers with JSONB validation, dias-bloqueados CRUD, reserva reasign | Mock supabase client, test handler functions |
| Integration | Slot generation → reservation submit → blocked-day rejection | Vitest with mock Supabase service role |
| E2E | Full reservation flow with slot selection + zone dropdown | Playwright: `/reservas` → slot click → submit |

## Open Questions

- [ ] `GET /api/dias-bloqueados` is public per proposal but admin-only per BLO-004 spec. Design resolves to **public** (client needs blocked dates). Confirm with stakeholder.
- [ ] Zone CHECK constraint update on every `zonas_config` save: DDL-in-transaction could lock mesas writes briefly. Acceptable for config-level operation?
