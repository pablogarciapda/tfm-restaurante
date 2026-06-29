<script setup lang="ts">
/**
 * /reservas — Multi-step reservation page (RF-001–RF-005)
 *
 * Step 1: ReservationForm (5 fields, Spanish validation)
 * Step 2: SmsVerificationStep (4-digit code, 3 retries, 60s cooldown)
 * Step 3: Confirmation (reserva confirmada + reference ID)
 *
 * "Elegir mesa" button disabled with "Próximamente" tooltip — Phase 3 Konva work.
 */

import { ref } from 'vue'
import ReservationForm from '../components/ReservationForm.vue'
import SmsVerificationStep from '../components/SmsVerificationStep.vue'
import PageHero from '../components/PageHero.vue'
import type { ReservationPayload } from '../components/ReservationForm.vue'

const step = ref<'form' | 'sms' | 'confirmation'>('form')
const formData = ref<ReservationPayload | null>(null)
const reservaId = ref<string>('')
const sending = ref(false)
const error = ref('')

async function handleFormSubmit(data: ReservationPayload) {
  sending.value = true
  error.value = ''

  try {
    await $fetch('/api/sms/send', {
      method: 'POST',
      body: { phone: data.telefono },
    })

    formData.value = data
    step.value = 'sms'
  } catch {
    error.value = 'Error al enviar el codigo. Intentalo de nuevo.'
  } finally {
    sending.value = false
  }
}

async function handleVerified() {
  if (!formData.value) return

  try {
    const result = await $fetch<{ success: boolean; id: string }>('/api/reservas', {
      method: 'POST',
      body: {
        nombre: formData.value.nombre,
        telefono: formData.value.telefono,
        email: formData.value.email,
        fecha_hora: formData.value.fecha_hora,
        numero_comensales: formData.value.numero_comensales,
      },
    })

    reservaId.value = result.id
    step.value = 'confirmation'
  } catch {
    error.value = 'Error al confirmar la reserva. Intentalo de nuevo.'
  }
}

function handleBack() {
  step.value = 'form'
  error.value = ''
}
</script>

<template>
  <div>
    <PageHero title="Reservas" subtitle="Reserva tu mesa en La Zingara" />

    <section class="mx-auto max-w-lg px-4 py-12">
      <!-- Elegir mesa (disabled — Phase 3) -->
      <div class="mb-8 text-center">
        <button
          data-testid="elegir-mesa-button"
          type="button"
          disabled
          title="Proximamente"
          class="rounded-lg border-2 border-gray-300 px-5 py-2.5 text-gray-400 cursor-not-allowed"
        >
          Elegir mesa
        </button>
      </div>

      <!-- API error -->
      <div
        v-if="error"
        class="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-800"
      >
        {{ error }}
      </div>

      <!-- Step 1: Form -->
      <div v-if="step === 'form'">
        <p class="mb-6 text-center text-sm text-slate">
          Rellena tus datos. Te enviaremos un codigo de verificacion.
        </p>
        <ReservationForm @submit="handleFormSubmit" />
      </div>

      <!-- Step 2: SMS Verification -->
      <div v-if="step === 'sms' && formData">
        <SmsVerificationStep
          :phone="formData.telefono"
          @verified="handleVerified"
          @back="handleBack"
        />
      </div>

      <!-- Step 3: Confirmation -->
      <div v-if="step === 'confirmation'" class="text-center">
        <div class="rounded-lg bg-green-50 p-8">
          <h2 class="text-2xl font-semibold text-green-800">
            Reserva confirmada
          </h2>
          <p class="mt-2 text-green-700">
            Gracias, {{ formData?.nombre }}. Tu reserva ha sido registrada.
          </p>
          <p class="mt-4 text-sm text-green-600">
            Referencia: <strong>{{ reservaId }}</strong>
          </p>
        </div>
        <p class="mt-6 text-sm text-slate">
          Te hemos enviado un SMS de confirmacion al {{ formData?.telefono }}.
        </p>
      </div>
    </section>
  </div>
</template>
