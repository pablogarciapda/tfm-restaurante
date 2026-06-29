<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

/**
 * SmsVerificationStep — SMS code verification step (RF-002, RF-003)
 *
 * Props: phone (the user's phone number)
 * Emits: verified (code valid), back (return to form)
 *
 * Features:
 * - 4-digit code input (maxLength 4, numeric)
 * - POST /api/sms/verify on submit
 * - 3-retry limit with countdown; on 3rd fail: "Demasiados intentos..."
 * - 60s resend cooldown with live countdown timer
 */

const props = defineProps<{
  phone: string
}>()

const emit = defineEmits<{
  verified: []
  back: []
}>()

const code = ref('')
const error = ref('')
const attempts = ref(0)
const maxAttempts = 3
const locked = computed(() => attempts.value >= maxAttempts)

// Cooldown timer
const cooldownSeconds = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null
const isOnCooldown = computed(() => cooldownSeconds.value > 0)

function startCooldown() {
  cooldownSeconds.value = 60
  cooldownInterval = setInterval(() => {
    cooldownSeconds.value--
    if (cooldownSeconds.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})

// Start cooldown immediately on mount
startCooldown()

const verifying = ref(false)

async function handleVerify() {
  if (!code.value.trim() || code.value.trim().length !== 4 || locked.value) return

  verifying.value = true
  error.value = ''

  try {
    const result = await $fetch<{ valid: boolean }>('/api/sms/verify', {
      method: 'POST',
      body: { phone: props.phone, code: code.value.trim() },
    })

    if (result.valid) {
      code.value = ''
      error.value = ''
      attempts.value = 0
      emit('verified')
    } else {
      attempts.value++
      if (locked.value) {
        error.value = 'Demasiados intentos, solicita un nuevo codigo'
      } else {
        const remaining = maxAttempts - attempts.value
        error.value = `Codigo incorrecto. ${remaining} intentos restantes`
      }
    }
  } catch {
    error.value = 'Error al verificar. Intentalo de nuevo.'
  } finally {
    verifying.value = false
  }
}

function handleResend() {
  if (isOnCooldown.value) return
  // Reset retry counter + restart cooldown
  attempts.value = 0
  error.value = ''
  code.value = ''
  startCooldown()
}

const cooldownText = computed(() => {
  if (!isOnCooldown.value) return 'Reenviar codigo'
  return `Reenviar codigo en ${cooldownSeconds.value}s`
})
</script>

<template>
  <div class="space-y-6">
    <!-- Phone confirmation -->
    <p class="text-center text-slate">
      Codigo enviado a <strong>{{ phone }}</strong>
    </p>

    <!-- Code input -->
    <form novalidate class="space-y-4" @submit.prevent="handleVerify">
      <div>
        <label for="sms-code" class="block text-sm font-medium text-slate">
          Introduce el codigo de 4 digitos
        </label>
        <input
          id="sms-code"
          v-model="code"
          type="text"
          inputmode="numeric"
          maxlength="4"
          :disabled="locked || verifying"
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          :class="{ 'border-red-500': error }"
          placeholder="0000"
        />
        <p v-if="error" class="mt-2 text-center text-sm text-red-600">
          {{ error }}
        </p>
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="code.length !== 4 || locked || verifying"
      >
        {{ verifying ? 'Verificando...' : 'Verificar' }}
      </button>
    </form>

    <!-- Resend -->
    <div class="text-center">
      <button
        data-testid="resend-button"
        type="button"
        class="text-sm text-terracotta underline transition-colors hover:text-terracotta/80 disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        :disabled="isOnCooldown"
        @click="handleResend"
      >
        {{ cooldownText }}
      </button>
    </div>

    <!-- Back button -->
    <button
      data-testid="back-button"
      type="button"
      class="w-full rounded-lg border-2 border-terracotta px-5 py-2.5 font-medium text-terracotta transition-colors hover:bg-terracotta/10"
      @click="emit('back')"
    >
      Volver
    </button>
  </div>
</template>
