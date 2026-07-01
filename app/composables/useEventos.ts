/**
 * useEventos — Events data composable (EG-001)
 *
 * Fetches active, future eventos from Supabase, sorted by fecha ASC.
 * Uses useAsyncData for SSR-safe caching.
 */
export function useEventos() {
  const client = useSupabaseClient()

  const { data, error, pending } = useAsyncData('eventos', async () => {
    const { data, error } = await client
      .from('eventos')
      .select('*')
      .eq('activo', true)
      .gte('fecha', new Date().toISOString())
      .order('fecha')

    if (error) throw error
    return data
  })

  return { data, error, pending }
}
