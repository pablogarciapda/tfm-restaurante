/**
 * usePlatos — Carta data composable (CN-006)
 *
 * Fetches available platos from Supabase, sorted by puesto.
 * Uses useAsyncData for SSR-safe caching.
 */
export function usePlatos() {
  const client = useSupabaseClient()

  const { data, error, pending, refresh } = useAsyncData('platos', async () => {
    const { data, error } = await client
      .from('platos')
      .select('*')
      .eq('disponible', true)
      .order('puesto')

    if (error) throw error
    return data
  })

  return { data, error, pending, refresh }
}
