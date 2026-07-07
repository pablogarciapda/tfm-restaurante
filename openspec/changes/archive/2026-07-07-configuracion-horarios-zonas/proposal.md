# Propuesta: Configuración de Horarios, Zonas y Días Bloqueados

## Resumen del Cambio

Añadir configuración de horarios de servicio (comida/cena con intervalos de 15 min), capacidad por zona (5 zonas editables), toggle de habilitación por zona/día, y días bloqueados (fechas individuales + recurrencias semanales). El formulario de reservas usará slots dinámicos generados desde los horarios en lugar del `datetime-local` libre actual. El admin podrá reasignar zona/mesa de reservas existentes.

## Alcance

### Incluido
| # | Entregable | Descripción |
|---|-----------|-------------|
| 1 | `horarios-config` | Columnas JSONB en `configuracion`: `horarios_config` (almuerzo 13:30–15:30, cena 21:00–23:30, intervalo 15 min, editable) |
| 2 | `zonas-config` | Columna JSONB `zonas_config`: capacidad por zona (Principal:70, Reservado:14, Zíngaro:60, Terraza:100, Bar:20 = 264 total) + toggle `activa` por zona, editable. Columna `cliente_elige_zona` (enum: `none`/`zona`/`zona_mesa`) |
| 3 | `dias-bloqueados` | Nueva tabla `dias_bloqueados` (id, fecha DATE, recurrente BOOL, motivo TEXT). CRUD vía API `/api/dias-bloqueados`. Recurrencia semanal computada en query, no almacenada como filas individuales |
| 4 | `reservas-slots` | `ReservationForm.vue`: reemplazar `<input datetime-local>` por selector de slots de 15 min generados desde `horarios_config`. Validación server-side contra horarios y días bloqueados |
| 5 | `reservas-zona` | Selector de zona en formulario de reservas (condicional según `cliente_elige_zona`). Columna `zona` TEXT nullable en `reservas`. Sin selección de mesa individual en este cambio |
| 6 | `panel-configuracion` | 3 nuevas secciones en `ConfiguracionForm.vue`: Horarios (time inputs para inicio/fin + intervalo), Zonas (capacidad + toggle activa), Días bloqueados (tabla CRUD inline con date picker + toggle recurrente) |
| 7 | `admin-reasignar` | Endpoint `PATCH /api/reservas/[id]/mesa` para que admin cambie `mesa_id`, `zona` y `estado` de reservas existentes |

### No Incluido
- Selección de mesa individual por el cliente (requiere Konva integrado en vista pública — fase futura)
- Cálculo automático de `capacidad_total_local` desde suma de zonas (se actualiza el default a 264 manualmente)
- Integración con pasarela de pago o depósitos
- Notificaciones push/email por cambio de zona/mesa

## Capacidades

### Nuevas Capacidades
- `horarios-config`: configuración de turnos de servicio con intervalos para generación de slots
- `zonas-config`: capacidad y habilitación por zona del restaurante
- `dias-bloqueados`: gestión de fechas bloqueadas con soporte de recurrencia semanal
- `reservas-slots`: generación dinámica de slots de 15 min desde horarios configurados
- `reservas-zona`: selección de zona en flujo de reserva público
- `admin-reasignar`: reasignación de zona/mesa en reservas por el administrador

### Capacidades Modificadas
- `panel-configuracion`: 3 nuevas secciones (Horarios, Zonas, Días bloqueados) + campo `cliente_elige_zona`
- `reservas-flow`: datetime libre → slots dinámicos; campo `zona` opcional en payload
- `panel-schema`: 1 nueva tabla `dias_bloqueados`, 2 columnas JSONB + 1 columna enum en `configuracion`, columna `zona` TEXT en `reservas`
- `api-config`: nuevos campos en `ConfigData`/`ConfigUpdatePayload` + respuesta de endpoints

## Enfoque

Híbrido JSONB + tabla separada, siguiendo el patrón existente de `configuracion` como single-row. `horarios_config` y `zonas_config` como JSONB en `configuracion` (valores que rara vez cambian). `dias_bloqueados` como tabla independiente con CRUD propio (datos que crecen con el tiempo). La zona "Reservado" requiere renombrar el valor CHECK `Privado` → `Reservado` en `mesas.zona`.

## Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Migración: renombrar zona `Privado` → `Reservado` rompe CHECK constraint y datos existentes | Alta | Migración con ALTER TABLE + UPDATE de filas existentes + recreación de CHECK |
| `capacidad_total_local` default 80 no coincide con suma de zonas (264) | Alta | Actualizar default a 264 en migración; documentar relación con suma de zonas |
| Zona horaria: slots generados en CET/CEST vs `timestamptz` en DB | Media | Normalizar todo a Europe/Madrid; validar con tests de cambio horario |
| Día bloqueado recurrente + fecha individual en mismo día → colisión | Baja | Query de validación usa UNION y deduplica; fecha individual tiene prioridad |
| JSONB malformado por error de validación cliente | Media | Validación server-side con schema Zod antes de escribir en `configuracion` |

## Plan de Rollback

1. Revertir migración: `DROP TABLE dias_bloqueados`; eliminar columnas JSONB añadidas a `configuracion`; restaurar CHECK constraint original de `mesas.zona`
2. Revertir código: restaurar `<input datetime-local>` en `ReservationForm.vue`; eliminar secciones nuevas de `ConfiguracionForm.vue`
3. Los endpoints nuevos (`/api/dias-bloqueados`, `PATCH /api/reservas/[id]/mesa`) se desactivan eliminando los archivos de ruta

## Dependencias

- Cambio previo `retoques-reservas` completado (rama compartida `feat/retoques-reservas`)
- Supabase MCP disponible para `apply_migration`

## Criterios de Éxito

- [ ] Admin configura horarios, zonas y días bloqueados desde `/cocina/configuracion` con feedback toast
- [ ] Cliente ve solo slots disponibles de 15 min (no `datetime-local` libre) en `/reservas`
- [ ] Cliente selecciona zona cuando `cliente_elige_zona` != `none`
- [ ] Reserva rechazada (server-side) si fecha cae en día bloqueado o fuera de horario
- [ ] Admin reasigna zona/mesa desde detalle de reserva existente
- [ ] Todos los tests existentes actualizados + nuevos tests para horarios/zonas/bloqueos
