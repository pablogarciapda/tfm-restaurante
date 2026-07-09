/**
 * mesas.contract.ts — Motor de Mesas core types (SCH-006, MFU-001)
 *
 * Defines Mesa, Zona, FusionGroup, AforoInfo interfaces and
 * MesaEstado, AforoMode union types for the table manager.
 * Lives in shared/ for client + server visibility.
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/contracts'].
 */

/** Dynamic zone names (configuracion-horarios-zonas — editable by admin) */
export type Zona = string

/** Table occupancy state derived from reservas (MCA-005) */
export type MesaEstado = 'libre' | 'ocupada' | 'reservada'

/** Table shape (SCH-011, AD-14) */
export type FormaMesa = 'rectangular' | 'cuadrada' | 'redonda' | 'ovalada'

/** Single table row matching the mesas DB table (SCH-006) */
export interface Mesa {
  id: string
  numero_mesa: number
  capacidad_base: number
  posicion_x: number
  posicion_y: number
  ancho: number
  alto: number
  rotacion: number
  zona: Zona
  forma: FormaMesa
  mesa_padre_id: string | null
  id_fusion: string | null
  capacidad_actual: number
  created_at: string
  updated_at: string
}

/** Logical group of fused tables (MFU-001) */
export interface FusionGroup {
  /** Shared fusion identifier (crypto.randomUUID) */
  id_fusion: string
  /** First selected table becomes the parent */
  mesa_padre_id: string
  /** All mesas sharing this fusion group */
  mesas: Mesa[]
  /** Calculated capacity: floor(sum(capacidad_base) × 0.75) (MFU-002) */
  capacidad_actual: number
}

/** Occupancy calculation mode (SCH-010, CFG-005) */
export type AforoMode = 'auto' | 'manual'

/** Aforo state for the occupancy bar (MCA-006) */
export interface AforoInfo {
  modo: AforoMode
  capacidad_total: number
  /** Auto-calculated: SUM(capacidad_actual WHERE mesa_padre_id IS NULL) */
  ocupacion_auto: number
  /** Manual override: ocupacion_manual from configuracion */
  ocupacion_manual: number
  /** Available spots: capacidad_total - (auto or manual) */
  disponible: number
}
