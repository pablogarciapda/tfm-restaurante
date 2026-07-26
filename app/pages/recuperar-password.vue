<script setup lang="ts">
/**
 * /recuperar-password — Password recovery page
 *
 * Supabase redirects here after user clicks reset link in email.
 * Hash fragment contains: #access_token=...&refresh_token=...&type=recovery
 *
 * Flow:
 * 1. Parse hash fragment tokens
 * 2. Establish session via setSession()
 * 3. Show form for new password
 * 4. Call updateUser({ password }) to change it
 */
import { ref, onMounted } from 'vue'

const client = useSupabaseClient()
const loading = ref(true)
const error = ref('')
const success = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const updating = ref(false)
const tokenReady = ref(false)

onMounted(async () => {
  try {
    const hash = window.location.hash
    if (!hash) {
      error.value = 'Enlace de restablecimiento no válido. Solicita uno nuevo.'
      loading.value = false
      return
    }

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      error.value = 'Enlace de restablecimiento no válido. Solicita uno nuevo.'
      loading.value = false
      return
    }

    // Establish session with the recovery tokens
    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError) {
      error.value = 'El enlace ha expirado o no es válido. Solicita uno nuevo.'
      loading.value = false
      return
    }

    // Clean URL hash for security
    window.history.replaceState({}, document.title, window.location.pathname)

    tokenReady.value = true
  } catch {
    error.value = 'Error al procesar el enlace. Inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
})

async function handleUpdatePassword() {
  error.value = ''

  if (!newPassword.value || newPassword.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  updating.value = true

  try {
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword.value,
    })

    if (updateError) {
      error.value = updateError.message || 'Error al actualizar la contraseña.'
      return
    }

    success.value = true
  } catch {
    error.value = 'Error inesperado. Inténtalo de nuevo.'
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-cream flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Loading -->
      <div v-if="loading" class="text-center rounded-lg bg-white p-8 shadow-sm">
        <p class="text-slate">Validando enlace...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error && !tokenReady" class="rounded-lg bg-red-50 p-8 text-center shadow-sm">
        <h2 class="text-xl font-semibold text-red-800">Enlace no válido</h2>
        <p class="mt-2 text-red-700">{{ error }}</p>
        <p class="mt-4 text-sm text-slate">
          Solicita un nuevo enlace de restablecimiento desde el panel de administración.
        </p>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="rounded-lg bg-green-50 p-8 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-green-800">Contraseña actualizada</h2>
        <p class="mt-2 text-green-700">
          Tu contraseña ha sido cambiada correctamente. Ya puedes acceder al panel.
        </p>
        <NuxtLink
          to="/cocina"
          class="mt-6 inline-block rounded-lg bg-terracotta px-6 py-3 text-white font-medium transition-colors hover:bg-terracotta/90"
        >
          Ir al panel
        </NuxtLink>
      </div>

      <!-- Password form -->
      <div v-else-if="tokenReady" class="rounded-lg bg-white p-8 shadow-sm">
        <h2 class="text-xl font-semibold text-slate text-center mb-6">
          Nueva contraseña
        </h2>

        <p class="text-sm text-gray-500 text-center mb-6">
          Introduce tu nueva contraseña para acceder al panel de administración.
        </p>

        <form @submit.prevent="handleUpdatePassword" class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium text-slate mb-1">
              Nueva contraseña
            </label>
            <input
              id="password"
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              placeholder="Mínimo 6 caracteres"
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-slate focus:border-terracotta focus:ring-1 focus:ring-terracotta focus:outline-none"
            />
          </div>

          <div>
            <label for="confirm" class="block text-sm font-medium text-slate mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              v-model="confirmPassword"
              type="password"
              required
              minlength="6"
              placeholder="Repite la contraseña"
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-slate focus:border-terracotta focus:ring-1 focus:ring-terracotta focus:outline-none"
            />
          </div>

          <!-- Error on submit -->
          <div v-if="error && tokenReady" class="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="updating"
            class="w-full rounded-lg bg-terracotta px-5 py-3 text-white font-medium transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ updating ? 'Guardando...' : 'Cambiar contraseña' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
