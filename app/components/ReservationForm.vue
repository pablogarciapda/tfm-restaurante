<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HorarioConfig } from '#shared/contracts/reservation.contract'
import { generateSlots } from '#shared/utils/slots'
import { isValidSpanishPhone } from '#shared/utils/phone'

/**
 * ReservationForm — Slot-grid reservation form (RF-001, SLA-001–SLA-006)
 *
 * Props:
 * - horariosConfig: operating hours config for slot generation
 * - diasBloqueados: array of "YYYY-MM-DD" blocked dates
 *
 * Emits `submit` with validated data.
 */
export interface ReservationPayload {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  captcha_token?: string
}

const props = defineProps<{
  horariosConfig?: HorarioConfig | null
  diasBloqueados?: string[]
  captchaHabilitado?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ReservationPayload]
}>()

// ── Form fields ──
const nombre = ref('')
const apellidos = ref('')
const telefono = ref('')
const email = ref('')
const numero_comensales = ref<number | null>(4)
const errors = ref<Record<string, string>>({})

// ── Date + Slot selection ──
const selectedDate = ref('')
const selectedSlot = ref('') // "HH:MM"
const slotDateError = ref('')

// Minimum date for picker: today (slot validation handles 30-min buffer)
const minDate = computed(() => {
  return new Date().toISOString().split('T')[0] ?? ''
})

// Generate slots using shared utility
const slots = computed(() => {
  if (!props.horariosConfig) return []
  try {
    return generateSlots(props.horariosConfig)
  } catch {
    return []
  }
})

// Group slots by turn (comida/cena)
const turnos = computed(() => {
  const comida: typeof slots.value = []
  const cena: typeof slots.value = []
  if (!props.horariosConfig) return { comida, cena }

  for (const slot of slots.value) {
    const horaNum = parseInt(slot.hora.replace(':', ''), 10)
    if (horaNum >= 1200 && horaNum < 1700) {
      comida.push(slot)
    } else {
      cena.push(slot)
    }
  }
  return { comida, cena }
})

// Blocked date check
const isDateBlocked = computed(() => {
  if (!selectedDate.value || !props.diasBloqueados) return false
  const fecha = selectedDate.value // "YYYY-MM-DD"
  return props.diasBloqueados.some((d) => {
    // Exact match
    if (d === fecha) return true
    // MM-DD recurring match (for recurring blocked days)
    if (props.diasBloqueados && props.diasBloqueados.includes(fecha.slice(5))) return true
    return false
  })
})

const blockedReason = ref('')

function isSlotDisabled(slotHora: string): boolean {
  if (!selectedDate.value) return false
  // Only apply 30-min buffer for today's date
  const todayStr = new Date().toISOString().split('T')[0]
  if (selectedDate.value !== todayStr) return false

  const slotDate = new Date(`${selectedDate.value}T${slotHora}:00`)
  const cutoff = new Date(Date.now() + 30 * 60 * 1000)
  return slotDate <= cutoff
}

function selectSlot(hora: string) {
  selectedSlot.value = hora
  slotDateError.value = ''
}

// ── Turnstile CAPTCHA ──
const captchaToken = ref<string>()

// ── Phone validation (mobile only, uses shared utility) ──
function validatePhone(raw: string): string | null {
  return isValidSpanishPhone(raw) ? null : 'Teléfono móvil no válido (ej: 600123456)'
}

// ── Validation ──
const slotError = ref('')

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  if (!nombre.value.trim()) {
    newErrors.nombre = 'El nombre es obligatorio'
  } else if (nombre.value.trim().length < 2) {
    newErrors.nombre = 'El nombre debe tener al menos 2 caracteres'
  }

  if (!telefono.value.trim()) {
    newErrors.telefono = 'El teléfono es obligatorio'
  } else {
    const phoneError = validatePhone(telefono.value)
    if (phoneError) {
      newErrors.telefono = phoneError
    }
  }

  if (!email.value.trim()) {
    newErrors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    newErrors.email = 'Email no válido'
  }

  // Slot validation (replaces fecha_hora validation)
  if (!selectedDate.value) {
    slotError.value = 'Selecciona una fecha'
  } else if (!selectedSlot.value) {
    slotError.value = 'Selecciona un horario'
  } else if (isDateBlocked.value) {
    slotError.value = 'Fecha no disponible'
  } else {
    slotError.value = ''
  }

  if (!slotError.value && (!selectedDate.value || !selectedSlot.value)) {
    slotError.value = 'Selecciona fecha y horario'
  }

  if (numero_comensales.value === null || numero_comensales.value === undefined) {
    newErrors.numero_comensales = 'Indica el número de comensales'
  } else if (numero_comensales.value < 1 || numero_comensales.value > 20) {
    newErrors.numero_comensales = 'Entre 1 y 20 comensales'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0 && !slotError.value
}

const captchaError = ref('')

function validateAll(): boolean {
  const base = validate()
  if (props.captchaHabilitado && !captchaToken.value) {
    captchaError.value = 'Debes completar la verificación de seguridad'
    return false
  }
  captchaError.value = ''
  return base
}

function handleSubmit() {
  if (!validateAll()) return

  // Include timezone offset so PostgreSQL interprets the time correctly
  const tzOffset = -new Date().getTimezoneOffset()
  const tzSign = tzOffset >= 0 ? '+' : '-'
  const tzPad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const tz = `${tzSign}${tzPad(tzOffset / 60)}:${tzPad(tzOffset % 60)}`
  const fecha_hora = `${selectedDate.value}T${selectedSlot.value}:00${tz}`

  emit('submit', {
    nombre: nombre.value.trim(),
    apellidos: apellidos.value.trim() || undefined,
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    fecha_hora,
    numero_comensales: numero_comensales.value!,
    captcha_token: captchaToken.value || undefined,
  })

  // Reset token for next submission
  captchaToken.value = undefined
}
</script>

<template>
  <form novalidate class="space-y-5" @submit.prevent="handleSubmit">
    <!-- Nombre -->
    <div>
      <label for="nombre" class="block text-sm font-medium text-slate">Nombre *</label>
      <input
        id="nombre"
        v-model="nombre"
        type="text"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.nombre }"
      />
      <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
    </div>

    <!-- Apellidos -->
    <div>
      <label for="apellidos" class="block text-sm font-medium text-slate">Apellidos</label>
      <input
        id="apellidos"
        v-model="apellidos"
        type="text"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
      />
    </div>

    <!-- Teléfono -->
    <div>
      <label for="telefono" class="block text-sm font-medium text-slate">Teléfono *</label>
      <input
        id="telefono"
        v-model="telefono"
        type="tel"
        placeholder="600123456"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.telefono }"
      />
      <p v-if="errors.telefono" class="mt-1 text-sm text-red-600">{{ errors.telefono }}</p>
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium text-slate">Email *</label>
      <input
        id="email"
        v-model="email"
        type="email"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.email }"
      />
      <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
    </div>

    <!-- Date picker -->
    <div>
      <label for="fecha" class="block text-sm font-medium text-slate">Fecha *</label>
      <input
        id="fecha"
        v-model="selectedDate"
        type="date"
        :min="minDate"
        data-testid="reserva-fecha"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
      />
    </div>

    <!-- Slot grid -->
    <div v-if="selectedDate && !isDateBlocked && slots.length > 0">
      <label class="block text-sm font-medium text-slate">Horario *</label>

      <!-- Turno: Comida -->
      <div v-if="turnos.comida.length > 0" class="mt-2">
        <p class="mb-1 text-xs font-medium text-gray-400">COMIDA</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="slot in turnos.comida"
            :key="slot.hora"
            type="button"
            :data-testid="`slot-${slot.hora}`"
            :disabled="isSlotDisabled(slot.hora)"
            class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="selectedSlot === slot.hora
              ? 'border-terracotta bg-terracotta text-white'
              : isSlotDisabled(slot.hora)
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                : 'border-gray-200 bg-white text-slate hover:border-terracotta hover:bg-terracotta/10'"
            @click="selectSlot(slot.hora)"
          >
            {{ slot.hora }}
          </button>
        </div>
      </div>

      <!-- Turno: Cena -->
      <div v-if="turnos.cena.length > 0" class="mt-3">
        <p class="mb-1 text-xs font-medium text-gray-400">CENA</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="slot in turnos.cena"
            :key="slot.hora"
            type="button"
            :data-testid="`slot-${slot.hora}`"
            :disabled="isSlotDisabled(slot.hora)"
            class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="selectedSlot === slot.hora
              ? 'border-terracotta bg-terracotta text-white'
              : isSlotDisabled(slot.hora)
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                : 'border-gray-200 bg-white text-slate hover:border-terracotta hover:bg-terracotta/10'"
            @click="selectSlot(slot.hora)"
          >
            {{ slot.hora }}
          </button>
        </div>
      </div>

      <p v-if="slotError" class="mt-1 text-sm text-red-600">{{ slotError }}</p>
    </div>

    <!-- Blocked date message -->
    <div v-if="selectedDate && isDateBlocked" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
      Esta fecha no está disponible.
    </div>

    <!-- No slots (no config) fallback -->
    <div v-if="selectedDate && !isDateBlocked && slots.length === 0">
      <label for="fecha_hora" class="block text-sm font-medium text-slate">Fecha y hora *</label>
      <input
        id="fecha_hora"
        v-model="selectedSlot"
        type="datetime-local"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
      />
    </div>

    <!-- Número de comensales -->
    <div>
      <label for="numero_comensales" class="block text-sm font-medium text-slate">
        Número de comensales *
      </label>
      <input
        id="numero_comensales"
        v-model.number="numero_comensales"
        type="number"
        min="1"
        max="20"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.numero_comensales }"
      />
      <p v-if="errors.numero_comensales" class="mt-1 text-sm text-red-600">
        {{ errors.numero_comensales }}
      </p>
    </div>

    <!-- Turnstile CAPTCHA (conditional) -->
    <div v-if="captchaHabilitado" class="flex justify-center">
      <NuxtTurnstile v-model="captchaToken" :options="{ theme: 'light' }" />
      <p v-if="captchaError" class="mt-1 text-center text-sm text-red-600">{{ captchaError }}</p>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      class="w-full rounded-lg bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta/90"
    >
      Continuar
    </button>
  </form>
</template>
