# Plan: Refactorización del Sistema de Fusión

## Objetivo

Cambiar el modelo de fusión de **auto-posicionamiento** a **posicionamiento manual**. El camarero mueve las mesas donde quiera unirlas, las selecciona y fusiona. El bloque queda en esa posición.

---

## Modelo Actual (a eliminar)

```
Camarero selecciona mesas → Clic "Fusionar" → Sistema calcula posiciones automáticamente
→ Mesas se mueven a posiciones calculadas (vertical debajo del padre)
→ Botón "Rotar 90°" para girar el grupo
→ Botón "Guardar" para persistir posiciones rotadas
```

**Problemas:**
- El cálculo automático de posiciones falla con 3+ mesas
- La rotación es compleja y propensa a bugs
- El camarero no controla dónde quedan las mesas

## Modelo Nuevo (a implementar)

```
Camarero mueve mesas manualmente → Las junta visualmente → Las selecciona (Shift+Click)
→ Clic "Fusionar" → Mesas quedan EN SU POSICIÓN ACTUAL → Se vuelven un bloque
→ Se mueven juntas como bloque
→ Input de ocupación forzada donde estaba el botón de rotar
```

---

## Cambios Requeridos

### 1. ELIMINAR — Cálculo automático de posiciones en fusión

**Archivo:** `app/features/mesas/composables/useMesasFusion.ts`

Eliminar de `fuseMesas()`:
- Líneas 75-84: cálculo de `positions` via `calculateFusionPositions`
- Líneas 97-108: aplicar posiciones a children en DB
- Líneas 125-132: incluir posiciones en `batchUpdates` del store

**Resultado:** `fuseMesas()` solo actualiza `id_fusion`, `mesa_padre_id`, `capacidad_actual` — NO toca `posicion_x/y/rotacion`.

**Archivo:** `shared/utils/fusion-math.ts`

Eliminar:
- `calculateFusionPositions()` completa (~65 líneas)
- `rotateGroupAroundCentroid90CW()` completa
- `applyGroupTransformToSiblings()` completa
- Tipos auxiliares: `Rect`, `rectsOverlap`, `mesaBounds`, `mesaExtents`, `COLLISION_PAD`

Conservar:
- `canFuse()` — validación zona
- `calculateFusedCapacity()` — fórmula de ocupación
- `fuseTables()` — metadata
- `unfuseTables()` — desfusión
- `getAforoDisponible()` — capacidad

### 2. ELIMINAR — Botón de rotar y toolbar de grupo fusionado

**Archivo:** `app/pages/cocina/reservas.vue`

Eliminar:
- `selectedFusedParent` computed (líneas 65-73)
- `rotateSelectedGroup90()` function (líneas 75-77)
- `saveSelectedFusedPositions()` function (líneas 79-100)
- Template del toolbar de rotación (líneas 1478-1504): el div con "Grupo fusionado", botón "Rotar 90°" y botón "Guardar"

**Archivo:** `app/features/mesas/components/TableCanvas.vue`

Eliminar:
- `import { rotateGroupAroundCentroid90CW }` (línea 34)
- `rotateSelectedGroup90CW()` function (líneas 769-795)
- `rotateSelectedGroup90CW` del `defineExpose` (línea 806)

**Archivo:** `app/features/mesas/composables/useFusionGroupDrag.ts`

Eliminar:
- `rotateGroup90CW()` function completa

### 3. AGREGAR — Input de ocupación forzada

**Archivo:** `app/pages/cocina/reservas.vue`

Donde estaba el toolbar de rotación, agregar:

```html
<div v-if="selectedFusedParent" class="mb-2 flex items-center gap-3 ...">
  <span class="text-xs font-medium text-slate">
    Grupo fusionado: {{ selectedFusedParent.numero_mesa }}
  </span>
  <div class="flex items-center gap-1">
    <label class="text-xs text-slate">Ocupación forzada:</label>
    <input 
      type="number" 
      :value="selectedFusedParent.capacidad_actual"
      :min="1"
      :max="20"
      class="w-16 rounded border px-2 py-1 text-sm"
      @change="handleForceCapacity($event)"
    />
  </div>
</div>
```

**Nueva function `handleForceCapacity`:**
```typescript
async function handleForceCapacity(event: Event) {
  const val = parseInt((event.target as HTMLInputElement).value)
  if (!selectedFusedParent.value || isNaN(val) || val < 1) return
  
  const fusedMesas = store.mesas.filter(m => m.id_fusion === selectedFusedParent.value!.id_fusion)
  for (const mesa of fusedMesas) {
    await client.from('mesas').update({ capacidad_actual: val }).eq('id', mesa.id)
    store.updateMesa(mesa.id, { capacidad_actual: val })
  }
  showToast(`Ocupación forzada a ${val} pax`, 'success')
}
```

### 4. ACTUALIZAR — Drag de grupo fusionado

**Archivo:** `app/features/mesas/composables/useFusionGroupDrag.ts`

El drag de grupo YA funciona correctamente (las mesas se mueven juntas desde su posición actual). Solo hay que eliminar `rotateGroup90CW` y mantener el resto.

### 5. ACTUALIZAR — Tests

**Archivo:** `test/unit/utils/fusion-math.test.ts`

Eliminar tests de:
- `calculateFusionPositions` (3 tests)
- `rotateGroupAroundCentroid90CW` (si existen)

Conservar tests de:
- `canFuse`
- `calculateFusedCapacity`
- `unfuseTables`
- `getAforoDisponible`

**Archivo:** `test/unit/composables/useMesasFusion.test.ts`

Actualizar test de `fuseMesas` para verificar que NO cambia posiciones.

---

## Archivos Afectados

| Archivo | Acción | Líneas approx a eliminar |
|---------|--------|--------------------------|
| `shared/utils/fusion-math.ts` | Eliminar cálculo posiciones + rotación | ~150 |
| `app/features/mesas/composables/useMesasFusion.ts` | Eliminar auto-posicionamiento | ~50 |
| `app/pages/cocina/reservas.vue` | Eliminar toolbar rotar, agregar input capacidad | ~40 eliminar, ~20 agregar |
| `app/features/mesas/components/TableCanvas.vue` | Eliminar rotateSelectedGroup90CW | ~30 |
| `app/features/mesas/composables/useFusionGroupDrag.ts` | Eliminar rotateGroup90CW | ~30 |
| `test/unit/utils/fusion-math.test.ts` | Eliminar tests de posicionamiento | ~30 |
| `test/unit/composables/useMesasFusion.test.ts` | Actualizar test fuseMesas | ~10 |

**Total estimado:** ~340 líneas eliminadas, ~20 agregadas

---

## Orden de Ejecución

1. **Crear rama** `fusion` ✅ (ya hecha)
2. **Eliminar** `calculateFusionPositions` y helpers de `fusion-math.ts`
3. **Eliminar** auto-posicionamiento de `useMesasFusion.ts`
4. **Eliminar** `rotateSelectedGroup90CW` de `TableCanvas.vue`
5. **Eliminar** `rotateGroup90CW` de `useFusionGroupDrag.ts`
6. **Eliminar** toolbar de rotación de `reservas.vue`
7. **Agregar** input de ocupación forzada en `reservas.vue`
8. **Actualizar** tests
9. **Correr** `pnpm test` y verificar 0 regressions nuevas
10. **Commit** y PR

---

## Verificación

- [ ] Fusionar 3 mesas: quedan en su posición actual, se mueven como bloque
- [ ] No hay botón de rotar
- [ ] Input de ocupación forzada funciona (cambia capacidad_actual de todas las mesas del grupo)
- [ ] Desfusionar funciona igual que antes
- [ ] Layout save/load funciona (posiciones se guardan tal cual)
- [ ] Tests pasan (excepto pre-existing TableCanvas MCA-005)
