/**
 * useMenuDiario — Daily menu data composable (MD-004, MD-005)
 *
 * Fetches today's menu_diario_config + menu_diario_items grouped by seccion.
 * Uses useAsyncData for SSR-safe caching with dynamic key per day.
 */
export function useMenuDiario() {
  const client = useSupabaseClient()
  const today = new Date().getDay()

  const { data, error, pending } = useAsyncData(`menu-diario-${today}`, async () => {
    // Fetch today's active config
    const { data: config, error: configError } = await client
      .from('menu_diario_config')
      .select('*')
      .eq('day_of_week', today)
      .eq('activo', true)
      .single()

    if (configError || !config) {
      return { config: null, items: null, precio: null }
    }

    // Fetch dishes for this config
    const { data: itemsData, error: itemsError } = await client
      .from('menu_diario_items')
      .select('*')
      .eq('config_id', config.id)
      .order('puesto')

    if (itemsError) throw itemsError

    // Group items by seccion
    interface MenuItem {
      id: string
      config_id: string
      seccion: string
      plato_nombre: string
      descripcion?: string
      puesto: number
    }

    const grouped = {
      primer: [] as MenuItem[],
      segundo: [] as MenuItem[],
      postre: [] as MenuItem[],
      bebida: [] as MenuItem[],
      pan: [] as MenuItem[],
    }

    if (itemsData) {
      for (const item of itemsData as MenuItem[]) {
        const section = item.seccion as keyof typeof grouped
        if (section in grouped) {
          grouped[section].push(item)
        }
      }
    }

    return { config, items: grouped, precio: config.precio }
  })

  // Extract derived values from async data
  const config = computed(() => (data.value as { config: unknown } | null)?.config ?? null)
  const items = computed(() => (data.value as { items: unknown } | null)?.items ?? null)
  const precio = computed(() => (data.value as { precio: unknown } | null)?.precio ?? null)

  return { config, items, precio, data, error, pending }
}
