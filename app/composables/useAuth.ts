/**
 * useAuth — Supabase Auth wrapper composable (AUTH-001, AUTH-004)
 *
 * Provides signIn, signOut, user (reactive), isLoading, and error state.
 */
import { ref } from 'vue'

export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function signIn(email: string, password: string) {
    isLoading.value = true
    error.value = null

    try {
      const result = await client.auth.signInWithPassword({ email, password })

      if (result.error) {
        error.value = 'Credenciales incorrectas'
      }

      return result
    } catch {
      error.value = 'Error de conexión. Inténtelo de nuevo.'
      return { data: { user: null, session: null }, error: new Error('Network error') }
    } finally {
      isLoading.value = false
    }
  }

  async function signOut() {
    await client.auth.signOut()
    // Clear role and permissions state
    const role = useState<string | null>('cocina-role')
    role.value = null
    const perms = useState<Record<string, boolean> | null>('cocina-permissions')
    perms.value = null
    await navigateTo('/cocina')
  }

  return {
    signIn,
    signOut,
    user,
    isLoading,
    error,
  }
}
