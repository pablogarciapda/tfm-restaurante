/**
 * useDisenoConfig — Canvas design configuration composable
 *
 * Loads/saves canvas base dimensions (width/height) from the
 * file-backed /api/diseno-config endpoint.
 *
 * Cachea el resultado en useState para evitar re-fetches.
 */
import { ref, type Ref } from 'vue'

export interface DisenoConfig {
  canvas_ancho_base: number
  canvas_alto_base: number
}

/**
 * Reactive diseño config — returns the current values and a save function.
 *
 * Config is fetched on first call and cached in a useState (SSR-safe).
 */
export function useDisenoConfig() {
  const config = useState<DisenoConfig>('diseno-config', () => ({
    canvas_ancho_base: 1400,
    canvas_alto_base: 900,
  }))

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<DisenoConfig>('/api/diseno-config')
      config.value = {
        canvas_ancho_base: data.canvas_ancho_base ?? config.value.canvas_ancho_base,
        canvas_alto_base: data.canvas_alto_base ?? config.value.canvas_alto_base,
      }
    } catch (e: any) {
      error.value = e?.message || 'Error al cargar configuración de diseño'
    } finally {
      loading.value = false
    }
  }

  async function save(values: { canvas_ancho_base: number; canvas_alto_base: number }) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch<DisenoConfig & { success: boolean }>('/api/diseno-config', {
        method: 'POST',
        body: values,
      })
      config.value = {
        canvas_ancho_base: result.canvas_ancho_base,
        canvas_alto_base: result.canvas_alto_base,
      }
      return true
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Error al guardar'
      return false
    } finally {
      loading.value = false
    }
  }

  return { config, loading, error, load, save }
}
