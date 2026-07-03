<script setup lang="ts">
/**
 * Login Page — /cocina (AUTH-001, AUTH-005)
 *
 * Blind-route login form for admin panel. No public links point here.
 * Already-authenticated users are redirected to /cocina/dashboard.
 */

import { ref, computed, onMounted } from 'vue'

const client = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const validationErrors = ref<{ email?: string; password?: string }>({})

// ── AUTH-005: redirect authenticated users to dashboard ──
onMounted(() => {
  if (user.value) {
    navigateTo('/cocina/dashboard')
  }
})

// ── Form validation ──
function validateForm(): boolean {
  const errors: { email?: string; password?: string } = {}

  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errors.email = 'El email no es válido'
  }

  if (!password.value || password.value.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// ── Submit handler ──
async function handleLogin() {
  errorMessage.value = ''
  validationErrors.value = {}

  if (!validateForm()) return

  isLoading.value = true

  try {
    const { error } = await client.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })

    if (error) {
      errorMessage.value = 'Credenciales incorrectas'
      return
    }

    await navigateTo('/cocina/dashboard')
  } catch {
    errorMessage.value = 'Error de conexión. Inténtelo de nuevo.'
  } finally {
    isLoading.value = false
  }
}

// ── Clear field error on input ──
function clearFieldError(field: 'email' | 'password') {
  if (validationErrors.value[field]) {
    validationErrors.value = { ...validationErrors.value, [field]: undefined }
  }
}

const isSubmitDisabled = computed(() => isLoading.value)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate px-4">
    <div class="w-full max-w-md rounded-lg bg-cream p-8 shadow-xl">
      <h1 class="mb-6 text-center font-serif text-3xl text-terracotta">
        Iniciar sesión
      </h1>

      <form data-testid="login-form" class="space-y-4" @submit.prevent="handleLogin">
        <!-- Email field -->
        <div>
          <label for="login-email" class="mb-1 block text-sm font-medium text-slate">
            Email
          </label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
            :disabled="isSubmitDisabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-slate placeholder-gray-400 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta disabled:opacity-50"
            @input="clearFieldError('email')"
          />
          <p v-if="validationErrors.email" class="mt-1 text-sm text-red-600">
            {{ validationErrors.email }}
          </p>
        </div>

        <!-- Password field -->
        <div>
          <label for="login-password" class="mb-1 block text-sm font-medium text-slate">
            Contraseña
          </label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            placeholder="Contraseña"
            autocomplete="current-password"
            :disabled="isSubmitDisabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-slate placeholder-gray-400 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta disabled:opacity-50"
            @input="clearFieldError('password')"
          />
          <p v-if="validationErrors.password" class="mt-1 text-sm text-red-600">
            {{ validationErrors.password }}
          </p>
        </div>

        <!-- Error message -->
        <div
          v-if="errorMessage"
          data-testid="login-error"
          class="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="isSubmitDisabled"
          class="w-full rounded-md bg-terracotta px-4 py-2 font-medium text-white transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isLoading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>
