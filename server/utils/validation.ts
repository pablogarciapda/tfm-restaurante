/**
 * server/utils/validation.ts — Zod schemas for configuracion-horarios-zonas
 *
 * Validates horarios_config, zonas_config, dias_bloqueados payloads,
 * and public_config structure before writing to the database.
 * Used by config and reservation handlers.
 */

import { z } from 'zod'

// ──────────────────────────── Horarios ────────────────────────────

export const horarioConfigSchema = z
  .object({
    comida_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    comida_fin: z.string().regex(/^\d{2}:\d{2}$/),
    cena_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    cena_fin: z.string().regex(/^\d{2}:\d{2}$/),
    intervalo_minutos: z.number().int().min(5).max(60),
  })
  .refine((data) => data.comida_inicio < data.comida_fin, {
    message: 'comida_inicio must be before comida_fin',
  })
  .refine((data) => data.cena_inicio < data.cena_fin, {
    message: 'cena_inicio must be before cena_fin',
  })
  .refine((data) => 60 % data.intervalo_minutos === 0, {
    message: 'intervalo_minutos must divide 60 evenly',
  })

export type HorarioConfigInput = z.infer<typeof horarioConfigSchema>

// ──────────────────────────── Zonas ───────────────────────────────

export const zonaConfigSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  capacidad: z.number().int().min(0),
  enabled: z.boolean(),
})

export type ZonaConfigInput = z.infer<typeof zonaConfigSchema>

export const zonasConfigSchema = z
  .array(zonaConfigSchema)
  .min(1, 'At least one zone required')
  .refine((zonas) => zonas.some((z) => z.enabled), {
    message: 'At least one zone must be enabled',
  })
  .refine(
    (zonas) => {
      const names = zonas.map((z) => z.nombre.toLowerCase().trim())
      return new Set(names).size === names.length
    },
    { message: 'Zone names must be unique' },
  )

export type ZonasConfigInput = z.infer<typeof zonasConfigSchema>

// ──────────────────────────── Días Bloqueados ─────────────────────

export const createDiaBloqueadoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  recurrente: z.boolean().default(false),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  motivo: z.string().nullish(),
})

export type CreateDiaBloqueadoInput = z.infer<typeof createDiaBloqueadoSchema>

// ──────────────────────────── Public Config ───────────────────────

export const publicConfigSchema = z.object({
  horarios: horarioConfigSchema,
  zonas: zonasConfigSchema,
  texto_proteccion_datos: z.string().nullable(),
  modo_reserva: z.enum(['automatica', 'verificada']),
})

export type PublicConfigInput = z.infer<typeof publicConfigSchema>
