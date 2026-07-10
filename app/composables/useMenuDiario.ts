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
      // 1) Load prices from configuracion
      const { data: sysConfig, error: sysError } = await client
        .from('configuracion')
        .select('precio_menu_diario, precio_menu_sabado, precio_menu_domingo')
        .single()

      if (sysError && sysError.code !== 'PGRST116') throw sysError

      // Determine price based on day of week
      let menuPrice: number | null = null
      if (dayOfWeek === 6) {
        menuPrice = sysConfig?.precio_menu_sabado ?? null
      } else if (dayOfWeek === 0) {
        menuPrice = sysConfig?.precio_menu_domingo ?? null
      } else {
        menuPrice = sysConfig?.precio_menu_diario ?? null
      }

      // Build day label for public page
      let dayLabel = 'Lunes a Viernes'
      const hasSabado = sysConfig?.precio_menu_sabado && Number(sysConfig.precio_menu_sabado) > 0
      const hasDomingo = sysConfig?.precio_menu_domingo && Number(sysConfig.precio_menu_domingo) > 0
      if (hasSabado && hasDomingo) dayLabel = 'Lunes a Domingo'
      else if (hasSabado) dayLabel = 'Lunes a Sábado'

      // 2) Try exact date match first
      const { data: exactConfig, error: exactError } = await client
        .from('menu_diario_config')
        .select('*')
        .eq('fecha', todayStr)
        .eq('activo', true)
        .maybeSingle()

      if (exactError) throw exactError

      let config = exactConfig
      let matchType: 'date' | 'day' | null = exactConfig ? 'date' : null

      // 3) Fallback: day_of_week match (for dishes only, price is from configuracion)
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

      // 4) No config at all → show price-only fallback
      if (!config) {
        return {
          config: null, items: null,
          precio: menuPrice != null ? String(menuPrice) : null,
          matchType: null, isHoliday: false,
          dayLabel,
        }
      }

      // 5) Fetch dishes for this config
      const { data: itemsData, error: itemsError } = await client
        .from('menu_diario_items')
        .select('*')
        .eq('config_id', (config as { id: string }).id)
        .order('puesto')

      if (itemsError) throw itemsError

      // 6) Check if today is a holiday (via categorias_eventos FK)
      let isHoliday = false
      const { data: festivoCat } = await client
        .from('categorias_eventos')
        .select('id')
        .ilike('nombre', 'festivo')
        .maybeSingle()
      if (festivoCat?.id) {
        const { data: holidayData } = await client
          .from('eventos')
          .select('id')
          .eq('categoria_id', festivoCat.id)
          .eq('fecha', todayStr)
          .eq('activo', true)
          .maybeSingle()
        isHoliday = holidayData !== null
      }

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
        precio: menuPrice != null ? String(menuPrice) : null,
        matchType,
        isHoliday,
        dayLabel,
      }
    },
  )

  const config = computed(() => (data.value as { config: unknown } | null)?.config ?? null)
  const items = computed(() => (data.value as { items: unknown } | null)?.items ?? null)
  const precio = computed(() => (data.value as { precio: unknown } | null)?.precio ?? null)
  const isHoliday = computed(() => (data.value as { isHoliday: boolean } | null)?.isHoliday ?? false)
  const dayLabel = computed(() => (data.value as { dayLabel: string } | null)?.dayLabel ?? 'Lunes a Viernes')

  return { config, items, precio, isHoliday, dayLabel, data, error, pending }
}
