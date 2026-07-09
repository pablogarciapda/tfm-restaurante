# Test Failures Analysis — Pre-existentes

> Branch: `fix/tests-pre-existentes`
> Date: 2026-07-09
> Analysis of 50 test failures across 4 test files.

---

## 1. `test/unit/components/ConfiguracionForm.test.ts` — 34 failures

### Root Cause
The component `ConfiguracionForm.vue` was extended with image upload functionality in commit `e5eef34` (multi-tenant). The `<script setup>` now calls:

```ts
const { uploading, uploadFromFile } = useImageUpload({ bucket: 'config-images' })
const supabase = useSupabaseClient()
```

`useImageUpload` is a Nuxt auto-imported composable (`app/composables/useImageUpload.ts`). The test only mocks `useSupabaseClient` on `globalThis`, but does **not** mock `useImageUpload` or the `toProxyUrl` utility imported from `~/utils/image-url`.

All 34 tests fail with the **same error** at component setup (line 183):

```
ReferenceError: useImageUpload is not defined
```

Since the component never mounts, every single test fails identically — this is not 34 independent bugs, but one missing mock cascading across all tests.

### Is this a mock issue or a real bug?
**Mock issue only.** The component is correct in production (Nuxt auto-imports work at runtime). The tests just need to provide mocks for `useImageUpload` and `toProxyUrl`.

### Effort to Fix
**Low.** Add ~5 lines of global mocks:

```ts
g.useImageUpload = () => ({ uploading: ref(false), uploadFromFile: vi.fn() })
g.toProxyUrl = (url: string | null) => url
```

And extend the existing `useSupabaseClient` mock if needed for storage calls.

---

## 2. `test/unit/layouts/cocina.test.ts` — 6 failures

### Root Cause
The layout `cocina.vue` uses `ref()` in its `<script setup>` (line 10):

```ts
const showMobileMenu = ref(false)
```

In production/Nuxt, `ref` is auto-imported from Vue. But when the test mounts the component directly via `@vue/test-utils`, Nuxt's auto-import machinery is **not active**, and `ref` is not in scope unless the component explicitly imports it.

This was introduced in commit `e5eef34` (multi-tenant refactor), which added the line `const { nombre } = useRestaurantConfig()` and kept `const showMobileMenu = ref(false)`. The test relies on global mocks on `globalThis` for composables like `useAuth`, `useSupabaseUser`, etc., but `ref` is not mockable that way because it's a Vue API, not a Nuxt composable.

All 6 tests fail with:

```
ReferenceError: ref is not defined
  ❯ setup app/layouts/cocina.vue:10:24
```

### Is this a mock issue or a real bug?
**Both.** The fix is trivial: the real layout should `import { ref } from 'vue'` to be self-contained and testable without Nuxt auto-imports. This is actually a best practice for components that are unit-tested — don't rely on auto-imports for Vue APIs used in `<script setup>`.

Alternatively, the test file could add `import { ref } from 'vue'` and assign `g.ref = ref` so it's available globally. However, fixing the source file (`cocina.vue`) is the cleaner approach since the same issue would affect any other test mounting this layout.

### Effort to Fix
**Minimal.** Add one import to `cocina.vue`:

```ts
import { ref } from 'vue'
```

Or add `g.ref = ref` to the test file. Either takes 1 line.

---

## 3. `test/unit/composables/useMenuDiario.test.ts` — 4 failures

### Root Cause
The composable `useMenuDiario.ts` was changed in commit `e98fa4d` to use a new holiday-check approach via `categorias_eventos`:

```ts
const { data: festivoCat } = await client
  .from('categorias_eventos')
  .select('id')
  .ilike('nombre', 'festivo')   // ← `.ilike()` is new
  .maybeSingle()
```

The test's mock chain (`createSpyChain`) only knows these methods:
```ts
const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single',
  'maybeSingle', 'insert', 'update', 'delete', 'in']
```

It does **not** include `ilike`. When the composable calls `.ilike()`, the chain returns `undefined` instead of a further chainable object, causing:

```
TypeError: client.from(...).select(...).ilike is not a function
```

**Why 4 out of 5 tests fail:** The one passing test (`returns null config + items but fallback precio`) triggers an early return at line 61-67 in the composable (when `config` is `null`, it returns `{ config: null, items: null, ..., isHoliday: false }` before ever reaching the `.ilike()` call on line 83). The other 4 tests all have a `mockConfig` set, so execution reaches the holiday check and crashes.

### Is this a mock issue or a real bug?
**Mock issue only.** The production code is correct. The test spy chain needs to include `ilike` in its methods list.

### Effort to Fix
**Minimal.** Add `'ilike'` to the `methods` array at line 31 in the test file:

```ts
const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single',
  'maybeSingle', 'insert', 'update', 'delete', 'in', 'ilike']
```

---

## 4. `test/unit/utils/slots.test.ts` — 6 failures

### Root Cause
The function `generateTurnSlots` in `shared/utils/slots.ts` had its boundary condition changed in commit `e5eef34`:

**Before (correct at test time):**
```ts
while (current < finMinutes) {  // exclusive end
```

**After (current code):**
```ts
while (current <= finMinutes) {  // inclusive end
```

The JSDoc was also updated from `@param fin - End time "HH:MM" (exclusive)` to `@param fin - End time "HH:MM" (inclusive if aligned with interval)`.

This is a **deliberate behavior change**, but the tests were **not updated** to match. The change means the end time is now included when it aligns exactly with the interval boundary. For example:

| Input | Old (exclusive) | New (inclusive) |
|-------|-----------------|-----------------|
| `generateTurnSlots('13:00', '14:00', 30)` | `['13:00', '13:30']` (2) | `['13:00', '13:30', '14:00']` (3) |
| `generateSlots(15min)` | 18 total | 20 total (2 extra: `15:30`, `23:30`) |
| `generateSlots(30min)` | 9 total | 11 total (2 extra: `15:30`, `23:30`) |

The 6 failing tests are all **count and index assertion failures** caused by this 1-line change. The test expectations are stale — they test for the old exclusive-boundary behavior.

### 6 specific failures

| # | Test | Old expected | New actual | Why |
|---|------|-------------|------------|-----|
| 1 | `generateTurnSlots > excludes end time` | 2 slots | 3 slots | `14:00` now included |
| 2 | `generateTurnSlots > end time array` | `['13:00', '13:30']` | `['13:00', '13:30', '14:00']` | 14:00 included |
| 3 | `generateSlots > combines lunch and dinner` | 18 | 20 | `15:30` + `23:30` included |
| 4 | `generateSlots > orders lunch then dinner` | `slots[8]='21:00'` | `slots[8]='15:30'` | indexes shifted |
| 5 | `generateSlots > 30-min interval` | 9 | 11 | `15:30` + `23:30` included |
| 6 | `generateSlots > last dinner slot` | `slots[17]='23:15'` | `slots[17]='23:00'` | indexes shifted |

### Is this a mock issue or a real bug?
**Tests are stale.** The production code change was intentional (makes slots more useful: if closing is 15:30, you can book 15:30). The tests need to be updated to reflect the new inclusive-aligned-boundary behavior. This is **not a production bug**.

### Effort to Fix
**Low.** Update 6 test assertions:
- Fix counts: 2→3, 18→20, 9→11
- Fix expected arrays to include end time
- Fix index assertions (shifted by 1-2 positions)
- Update the test name from "excludes end time" to something like "includes end time when aligned with interval"

---

## Summary Table

| Test File | Failures | Root Cause Type | Is Source Bug? | Fix Lines | Effort |
|-----------|----------|----------------|---------------|-----------|--------|
| `ConfiguracionForm.test.ts` | 34 | Missing mocks `useImageUpload`, `toProxyUrl` | No (Nuxt auto-imports) | ~5 lines | Low |
| `cocina.test.ts` | 6 | Missing `import { ref }` in layout or test env | Debatable (auto-import vs explicit) | 1 line | Minimal |
| `useMenuDiario.test.ts` | 4 | Missing `'ilike'` in spy chain methods | No (test setup incomplete) | 1 char | Minimal |
| `slots.test.ts` | 6 | Stale expectations after intentional boundary change | No (tests not updated) | ~15 lines | Low |
| **Total** | **50** | **All tests, not production code** | **No production bugs** | **~22 lines** | **Low** |

## Key Finding

**None of the 50 failures reveal production bugs.** Every failure is either a missing/unupdated test mock or stale test expectations. The production code is correct in all 4 cases. Total fix effort is approximately 20-25 lines across 4 files, estimated at 30-45 minutes.
