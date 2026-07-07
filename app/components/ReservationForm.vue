<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HorarioConfig, ZonaConfig } from '#shared/contracts/reservation.contract'
import { generateSlots } from '#shared/utils/slots'

/**
 * ReservationForm — Slot-grid reservation form (RF-001, SLA-001–SLA-006)
 *
 * Props:
 * - horariosConfig: operating hours config for slot generation
 * - zonas: enabled zones for zone selector (when clienteEligeZona !== 'none')
 * - clienteEligeZona: controls zone/mesa selection UI
 * - diasBloqueados: array of "YYYY-MM-DD" blocked dates
 *
 * Emits `submit` with validated data including optional zona_id.
 */
export interface ReservationPayload {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  zona_id?: string
}

const props = defineProps<{
  horariosConfig?: HorarioConfig | null
  zonas?: ZonaConfig[]
  clienteEligeZona?: 'none' | 'zona' | 'zona_mesa'
  diasBloqueados?: string[]
}>()

const emit = defineEmits<{
  submit: [data: ReservationPayload]
}>()

// ── Form fields ──
const nombre = ref('')
const apellidos = ref('')
const telefono = ref('')
const email = ref('')
const numero_comensales = ref<number | null>(null)
const errors = ref<Record<string, string>>({})

// ── Date + Slot selection ──
const selectedDate = ref('')
const selectedSlot = ref('') // "HH:MM"
const zonaSeleccionada = ref('') // zone id
const slotDateError = ref('')

// Minimum date for picker: tomorrow
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0] ?? ''
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

function isSlotPast(slotHora: string): boolean {
  if (!selectedDate.value) return false
  const today = new Date()
  const d = new Date(selectedDate.value + 'T' + today.toTimeString().slice(0, 8))
  const slotDate = new Date(selectedDate.value + 'T' + slotHora + ':00')
  return slotDate <= today
}

function selectSlot(hora: string) {
  selectedSlot.value = hora
  slotDateError.value = ''
}

// ── Phone validation (same as before) ──
function validatePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '')

  if (/^[679]\d{8}$/.test(cleaned)) return null
  if (/^\+34[679]\d{8}$/.test(cleaned)) return null
  if (/^34[679]\d{8}$/.test(cleaned)) return null

  return 'Formato de teléfono no válido (ej: 600123456)'
}

// ── Validation ──
const slotError = ref('')
const zonaError = ref('')

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

  // Zone validation (conditional)
  if (props.clienteEligeZona && props.clienteEligeZona !== 'none' && !zonaSeleccionada.value) {
    zonaError.value = 'Selecciona una zona'
  } else {
    zonaError.value = ''
  }

  if (numero_comensales.value === null || numero_comensales.value === undefined) {
    newErrors.numero_comensales = 'Indica el número de comensales'
  } else if (numero_comensales.value < 1 || numero_comensales.value > 20) {
    newErrors.numero_comensales = 'Entre 1 y 20 comensales'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0 && !slotError.value && !zonaError.value
}

function handleSubmit() {
  if (!validate()) return

  const fecha_hora = `${selectedDate.value}T${selectedSlot.value}:00`

  emit('submit', {
    nombre: nombre.value.trim(),
    apellidos: apellidos.value.trim() || undefined,
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    fecha_hora,
    numero_comensales: numero_comensales.value!,
    zona_id: zonaSeleccionada.value || undefined,
  })
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
            :disabled="isSlotPast(slot.hora)"
            class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="selectedSlot === slot.hora
              ? 'border-terracotta bg-terracotta text-white'
              : isSlotPast(slot.hora)
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
            :disabled="isSlotPast(slot.hora)"
            class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="selectedSlot === slot.hora
              ? 'border-terracotta bg-terracotta text-white'
              : isSlotPast(slot.hora)
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

    <!-- Zone selector (conditional) -->
    <div v-if="clienteEligeZona && clienteEligeZona !== 'none' && zonas && zonas.length > 0">
      <label for="zona" class="block text-sm font-medium text-slate">Zona *</label>
      <select
        id="zona"
        v-model="zonaSeleccionada"
        data-testid="reserva-zona"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': zonaError }"
      >
        <option value="" disabled>Selecciona una zona</option>
        <option
          v-for="zona in zonas"
          :key="zona.id"
          :value="zona.id"
        >
          {{ zona.nombre }} ({{ zona.capacidad }} personas)
        </option>
      </select>
      <p v-if="zonaError" class="mt-1 text-sm text-red-600">{{ zonaError }}</p>
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

    <!-- Submit -->
    <button
      type="submit"
      class="w-full rounded-lg bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta/90"
    >
      Continuar
    </button>
  </form>
</template>
