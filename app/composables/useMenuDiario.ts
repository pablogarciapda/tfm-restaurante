/**
 * useMenuDiario — Daily menu data composable (MD-004, MD-005)
 *
 * Fetches today's menu_diario_config + menu_diario_items grouped by seccion.
 * Tries exact date match (fecha) first, falls back to day_of_week.
 * Also checks if today is a holiday via eventos table.
 * Uses useAsyncData for SSR-safe caching with dynamic key per day.
 */
export function useMenuDiario() {
  const client = useSupabaseClient()
  const today = new Date()

  // Format date as YYYY-MM-DD for DB queries
  const todayStr = today.toISOString().slice(0, 10)
  const dayOfWeek = today.getDay()

  const { data, error, pending } = useAsyncData(
    `menu-diario-${todayStr}`,
    async () => {
      // 1) Try exact date match first
      const { data: exactConfig, error: exactError } = await client
        .from('menu_diario_config')
        .select('*')
        .eq('fecha', todayStr)
        .eq('activo', true)
        .maybeSingle()

      if (exactError) throw exactError

      let config = exactConfig
      let matchType: 'date' | 'day' | null = exactConfig ? 'date' : null

      // 2) Fallback: day_of_week match
      if (!config) {
        const { data: dayConfig, error: dayError } = await client
          .from('menu_diario_config')
          .select('*')
          .eq('day_of_week', dayOfWeek)
          .eq('activo', true)
          .maybeSingle()

        if (dayError) throw dayError

        config = dayConfig ?? null
        matchType = dayConfig ? 'day' : null
      }

      // 3) Fallback: use default pricing from configuracion table
      if (!config) {
        const { data: sysConfig, error: sysError } = await client
          .from('configuracion')
          .select('precio_menu_diario, precio_menu_sabado')
          .single()

        if (sysError && sysError.code !== 'PGRST116') throw sysError

        const fallbackPrecio = dayOfWeek === 6
          ? sysConfig?.precio_menu_sabado
          : sysConfig?.precio_menu_diario

        return {
          config: null, items: null,
          precio: fallbackPrecio != null ? String(fallbackPrecio) : null,
          matchType: null, isHoliday: false,
        }
      }

      // 3) Fetch dishes for this config
      const { data: itemsData, error: itemsError } = await client
        .from('menu_diario_items')
        .select('*')
        .eq('config_id', (config as { id: string }).id)
        .order('puesto')

      if (itemsError) throw itemsError

      // 4) Check if today is a holiday
      const { data: holidayData, error: holidayError } = await client
        .from('eventos')
        .select('id')
        .eq('categoria', 'festivo')
        .eq('fecha', todayStr)
        .eq('activo', true)
        .maybeSingle()

      if (holidayError) throw holidayError

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

      return {
        config,
        items: grouped,
        precio: (config as { precio: string }).precio,
        matchType,
        isHoliday: holidayData !== null,
      }
    },
  )

  const config = computed(() => (data.value as { config: unknown } | null)?.config ?? null)
  const items = computed(() => (data.value as { items: unknown } | null)?.items ?? null)
  const precio = computed(() => (data.value as { precio: unknown } | null)?.precio ?? null)
  const isHoliday = computed(() => (data.value as { isHoliday: boolean } | null)?.isHoliday ?? false)

  return { config, items, precio, isHoliday, data, error, pending }
}
