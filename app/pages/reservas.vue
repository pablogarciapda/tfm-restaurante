<script setup lang="ts">
/**
 * /reservas — Multi-step reservation page (RF-001–RF-005, SLA-001–SLA-006)
 *
 * Step 1: ReservationForm (slot grid + zone selector)
 * Step 2: GDPRCconsent (if texto_proteccion_datos configured)
 * Step 3: SmsVerificationStep (4-digit code, 3 retries, 60s cooldown)
 * Step 4: Confirmation (reserva confirmada/pendiente + reference ID)
 *
 * "Elegir mesa" button: shown when cliente_elige_zona === 'zona_mesa',
 * disabled with "Próximamente" tooltip otherwise — Phase 3 Konva work.
 *
 * GDPR tracking: returning customers who already accepted GDPR skip the
 * consent step. Acceptance is stored per-phone in clientes.gdpr_aceptado.
 */
import { ref, onMounted } from 'vue'
import { normalizePhone } from '#shared/utils/phone'
import { generarReferencia } from '#shared/utils/referencia'
import type { PublicConfig, DiaBloqueado, HorarioConfig, ZonaConfig } from '#shared/contracts/reservation.contract'
import ReservationForm from '../components/ReservationForm.vue'
import SmsVerificationStep from '../components/SmsVerificationStep.vue'
import GdprConsentModal from '../components/GdprConsentModal.vue'
import PageHero from '../components/PageHero.vue'
import type { ReservationPayload } from '../components/ReservationForm.vue'

type Step = 'form' | 'gdpr' | 'sms' | 'confirmation'

const step = ref<Step>('form')
const formData = ref<ReservationPayload | null>(null)
const reservaId = ref<string>('')
const reservaEstado = ref<string>('')
const sending = ref(false)
const error = ref('')
const gdprText = ref<string | null>(null)

// Public config from /api/public-config
const publicConfig = ref<PublicConfig | null>(null)
const horariosConfig = ref<HorarioConfig | null>(null)
const zonas = ref<ZonaConfig[]>([])
const clienteEligeZona = ref<'none' | 'zona' | 'zona_mesa'>('none')
const captchaHabilitado = ref(false)
const modoReserva = ref<'automatica' | 'verificada'>('automatica')
const smsVerificacion = ref(false)
const blockedDates = ref<string[]>([])
const gdprAceptadoEnSesion = ref(false)

onMounted(async () => {
  // Fetch public config (horarios, zonas, cliente_elige_zona, GDPR)
  try {
    const data = await $fetch<any>('/api/public-config')
    publicConfig.value = data
    horariosConfig.value = data?.horarios || null
    zonas.value = data?.zonas || []
    clienteEligeZona.value = data?.cliente_elige_zona || 'none'
    captchaHabilitado.value = data?.captcha_habilitado ?? false
    modoReserva.value = data?.modo_reserva || 'automatica'
    smsVerificacion.value = data?.sms_verificacion ?? false
    gdprText.value = data?.texto_proteccion_datos || null
  } catch {
    // If config API fails, use defaults
    horariosConfig.value = null
    zonas.value = []
    clienteEligeZona.value = 'none'
    gdprText.value = null
  }

  // Fetch blocked days (public)
  try {
    const dias = await $fetch<DiaBloqueado[]>('/api/dias-bloqueados')
    // Extract just the date strings + also compute recurring dates for current year
    const today = new Date()
    const year = today.getFullYear()
    const dates = new Set<string>()

    for (const dia of (dias || [])) {
      dates.add(dia.fecha)
      // Recurring: compute this year's MM-DD
      if (dia.recurrente) {
        const mmdd = dia.fecha.slice(5) // "MM-DD"
        const thisYear = `${year}-${mmdd}`
        // Only add if not already past (or include all — client will filter)
        dates.add(thisYear)
        // Also next year for near-year-end
        const nextYear = `${year + 1}-${mmdd}`
        dates.add(nextYear)
      }
      // Date range: add all dates between fecha and fecha_fin
      if (dia.fecha_fin) {
        let cursor = new Date(dia.fecha + 'T00:00:00')
        const end = new Date(dia.fecha_fin + 'T00:00:00')
        while (cursor <= end) {
          dates.add(cursor.toISOString().split('T')[0]!)
          cursor.setDate(cursor.getDate() + 1)
        }
      }
    }

    blockedDates.value = Array.from(dates).sort()
  } catch {
    blockedDates.value = []
  }
})

/** Submit final reservation to the API */
async function submitReservation(smsVerified: boolean, gdprAceptado = false) {
  if (!formData.value) return
  sending.value = true
  error.value = ''

  try {
    const result = await $fetch<{ success: boolean; reserva_id: string; estado: string }>('/api/reservas', {
      method: 'POST',
      body: {
        nombre: formData.value.nombre,
        apellidos: formData.value.apellidos,
        telefono: formData.value.telefono,
        email: formData.value.email,
        fecha_hora: formData.value.fecha_hora,
        numero_comensales: formData.value.numero_comensales,
        zona_id: formData.value.zona_id,
        sms_verified: smsVerified,
        captcha_token: formData.value.captcha_token,
        gdpr_aceptado: gdprAceptado,
      },
    })

    reservaId.value = result.reserva_id
    reservaEstado.value = result.estado
    step.value = 'confirmation'
  } catch (err: any) {
    error.value = err?.data?.error || err?.message || 'Error al confirmar la reserva. Inténtalo de nuevo.'
  } finally {
    sending.value = false
  }
}

/** Check if a phone has already accepted GDPR */
async function checkGdprStatus(phone: string): Promise<boolean> {
  try {
    const res = await $fetch<{ gdpr_aceptado: boolean }>('/api/clientes/gdpr-status', {
      params: { phone },
    })
    return res.gdpr_aceptado
  } catch {
    return false
  }
}

async function handleFormSubmit(data: ReservationPayload) {
  sending.value = true
  error.value = ''

  // Normalize phone to E.164
  const normalizedPhone = normalizePhone(data.telefono) ?? data.telefono
  const payload = { ...data, telefono: normalizedPhone }
  formData.value = payload

  // Check if user already accepted GDPR (only when GDPR text is configured)
  const yaAcepto = gdprText.value ? await checkGdprStatus(normalizedPhone) : false

  if (!smsVerificacion.value) {
    if (gdprText.value && !yaAcepto) {
      // Show GDPR — submitReservation fires from handleGdprAccept
      sending.value = false
      step.value = 'gdpr'
    } else {
      // Submit directly (already accepted or no GDPR text)
      await submitReservation(false, !yaAcepto && !!gdprText.value)
    }
  } else {
    // SMS verification: send code first
    try {
      await $fetch('/api/sms/send', {
        method: 'POST',
        body: { phone: normalizedPhone },
      })

      if (gdprText.value && !yaAcepto) {
        step.value = 'gdpr'
      } else {
        step.value = 'sms'
      }
    } catch {
      error.value = 'Error al enviar el código. Inténtalo de nuevo.'
    } finally {
      sending.value = false
    }
  }
}

async function handleGdprAccept() {
  if (!formData.value) return
  gdprAceptadoEnSesion.value = true
  if (!smsVerificacion.value) {
    await submitReservation(false, true)
  } else {
    step.value = 'sms'
  }
}

function handleGdprReject() {
  step.value = 'form'
}

async function handleVerified() {
  await submitReservation(true, gdprAceptadoEnSesion.value)
}

function handleBack() {
  step.value = 'form'
  error.value = ''
}

async function handleResend() {
  if (!formData.value) return
  try {
    await $fetch('/api/sms/send', {
      method: 'POST',
      body: { phone: formData.value.telefono },
    })
  } catch {
    error.value = 'Error al reenviar el código. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <div>
    <PageHero title="Reservas" subtitle="Reserva tu mesa en La Zíngara" />

    <section class="mx-auto max-w-lg px-4 py-12">
      <!-- Elegir mesa -->
      <div class="mb-8 text-center">
        <button
          data-testid="elegir-mesa-button"
          type="button"
          :disabled="clienteEligeZona !== 'zona_mesa'"
          :title="clienteEligeZona === 'zona_mesa' ? 'Elegir mesa del plano' : 'Próximamente'"
          class="rounded-lg border-2 px-5 py-2.5"
          :class="clienteEligeZona === 'zona_mesa'
            ? 'border-terracotta text-terracotta hover:bg-terracotta/10 cursor-pointer'
            : 'border-gray-300 text-gray-400 cursor-not-allowed'"
        >
          Elegir mesa
        </button>
      </div>

      <!-- API error -->
      <div v-if="error" class="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-800">
        {{ error }}
      </div>

      <!-- Step 1: Form -->
      <div v-if="step === 'form'">
        <p class="mb-6 text-center text-sm text-slate">
          Rellena tus datos. Te enviaremos un código de verificación.
        </p>
        <ReservationForm
          :horarios-config="horariosConfig"
          :zonas="zonas"
          :cliente-elige-zona="clienteEligeZona"
          :dias-bloqueados="blockedDates"
          :captcha-habilitado="captchaHabilitado"
          @submit="handleFormSubmit"
        />
      </div>

      <!-- Step 2: GDPR Consent -->
      <GdprConsentModal
        :show="step === 'gdpr'"
        :text="gdprText || ''"
        :sending="sending"
        @accept="handleGdprAccept"
        @reject="handleGdprReject"
      />

      <!-- Step 3: SMS Verification -->
      <div v-if="step === 'sms' && formData">
        <SmsVerificationStep
          :phone="formData.telefono"
          @verified="handleVerified"
          @back="handleBack"
          @resend="handleResend"
        />
      </div>

      <!-- Step 4: Confirmation -->
      <div v-if="step === 'confirmation'" class="text-center">
        <div
          :class="[
            'rounded-lg p-8',
            reservaEstado === 'pendiente' ? 'bg-yellow-50' : 'bg-green-50',
          ]"
        >
          <h2
            :class="[
              'text-2xl font-semibold',
              reservaEstado === 'pendiente' ? 'text-yellow-800' : 'text-green-800',
            ]"
          >
            {{ reservaEstado === 'pendiente' ? 'Reserva pendiente' : 'Reserva confirmada' }}
          </h2>
          <p
            :class="[
              'mt-2',
              reservaEstado === 'pendiente' ? 'text-yellow-700' : 'text-green-700',
            ]"
          >
            Gracias, {{ formData?.nombre }}. {{ reservaEstado === 'pendiente' ? 'Tu reserva está pendiente de confirmación. Te avisaremos cuando sea confirmada.' : 'Tu reserva ha sido registrada.' }}
          </p>
          <p
            :class="[
              'mt-4 text-sm',
              reservaEstado === 'pendiente' ? 'text-yellow-600' : 'text-green-600',
            ]"
          >
            Referencia: <strong>{{ generarReferencia(reservaId, formData?.fecha_hora) }}</strong>
          </p>
        </div>
        <p class="mt-6 text-sm text-slate">
          <template v-if="publicConfig?.notificacion_reserva === 'sms'">
            Te hemos enviado un SMS de confirmación al {{ formData?.telefono }}.
          </template>
          <template v-else-if="publicConfig?.notificacion_reserva === 'ambos'">
            Te hemos enviado un email y un SMS de confirmación.
          </template>
          <template v-else>
            Te hemos enviado un email de confirmación a {{ formData?.email }}.
          </template>
        </p>
      </div>
    </section>
  </div>
</template>
