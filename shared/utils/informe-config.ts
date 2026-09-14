/**
 * shared/utils/informe-config.ts — Print report template configuration
 *
 * Stores the user-editable report template (font, size, column toggles) in
 * configuracion.informe_config (JSONB, default '{}'). Used by:
 *   - ConfiguracionForm (report section + live preview)
 *   - reservas.vue imprimirListado() when building the print document
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

export interface InformeConfig {
  /** Font family for the report body/table. */
  fuente: 'courier' | 'times' | 'georgia' | 'arial'
  /** Base table font size in px (clamped 8..16). */
  tamano: number
  /** Page orientation of the printed report. */
  orientacion: 'vertical' | 'apaisado'
  /** Include the Teléfono column. */
  mostrar_telefono: boolean
  /** Include the Ref column. */
  mostrar_referencia: boolean
  /** Include Zona and Mesa columns. */
  mostrar_zona_mesa: boolean
}

export const INFORME_FUENTES = {
  courier: { label: 'Courier (POS)', css: "'Courier New', 'Nimbus Mono PS', monospace" },
  times: { label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  georgia: { label: 'Georgia', css: "Georgia, 'Times New Roman', serif" },
  arial: { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
} as const

export type InformeFuente = keyof typeof INFORME_FUENTES

export const INFORME_TAMANO_MIN = 8
export const INFORME_TAMANO_MAX = 16

export const DEFAULT_INFORME_CONFIG: InformeConfig = {
  fuente: 'courier',
  tamano: 12,
  orientacion: 'vertical',
  mostrar_telefono: true,
  mostrar_referencia: true,
  mostrar_zona_mesa: true,
}

/** Resolve a fuente key to its CSS font-family (falls back on unknown key). */
export function informeFontCss(fuente: string): string {
  const entry = INFORME_FUENTES[fuente as InformeFuente]
  return entry ? entry.css : INFORME_FUENTES[DEFAULT_INFORME_CONFIG.fuente].css
}

const FUENTES_VALIDAS = new Set(Object.keys(INFORME_FUENTES))

/**
 * Normalize a raw informe_config JSONB value into a safe, complete config.
 * Unknown keys, wrong types and out-of-range sizes fall back to defaults.
 */
export function normalizeInformeConfig(raw: unknown): InformeConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_INFORME_CONFIG }
  }

  const r = raw as Record<string, unknown>
  const num = r.tamano
  const fuente = typeof r.fuente === 'string' && FUENTES_VALIDAS.has(r.fuente)
    ? (r.fuente as InformeConfig['fuente'])
    : DEFAULT_INFORME_CONFIG.fuente
  const toBool = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : fallback

  return {
    fuente,
    tamano: typeof num === 'number' && Number.isFinite(num)
      ? Math.min(INFORME_TAMANO_MAX, Math.max(INFORME_TAMANO_MIN, num))
      : DEFAULT_INFORME_CONFIG.tamano,
    orientacion: r.orientacion === 'apaisado' ? 'apaisado' : r.orientacion === 'vertical' ? 'vertical' : DEFAULT_INFORME_CONFIG.orientacion,
    mostrar_telefono: toBool(r.mostrar_telefono, DEFAULT_INFORME_CONFIG.mostrar_telefono),
    mostrar_referencia: toBool(r.mostrar_referencia, DEFAULT_INFORME_CONFIG.mostrar_referencia),
    mostrar_zona_mesa: toBool(r.mostrar_zona_mesa, DEFAULT_INFORME_CONFIG.mostrar_zona_mesa),
  }
}
