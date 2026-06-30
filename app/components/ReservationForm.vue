<script setup lang="ts">
import { ref } from 'vue'

/**
 * ReservationForm — 5-field reservation form (RF-001)
 *
 * Fields: nombre (min 2), telefono (E.164), email, fecha_hora (future),
 *         numero_comensales (1-20).
 * All required. Spanish validation errors.
 * Emits `submit` with validated data.
 */

export interface ReservationPayload {
  nombre: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
}

const emit = defineEmits<{
  submit: [data: ReservationPayload]
}>()

const nombre = ref('')
const telefono = ref('')
const email = ref('')
const fecha_hora = ref('')
const numero_comensales = ref<number | null>(null)
const errors = ref<Record<string, string>>({})

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  if (!nombre.value.trim()) {
    newErrors.nombre = 'El nombre es obligatorio'
  } else if (nombre.value.trim().length < 2) {
    newErrors.nombre = 'El nombre debe tener al menos 2 caracteres'
  }

  const phoneRegex = /^\+[1-9]\d{1,14}$/
  if (!telefono.value.trim()) {
    newErrors.telefono = 'El telefono es obligatorio'
  } else if (!phoneRegex.test(telefono.value)) {
    newErrors.telefono = 'El telefono debe tener formato E.164 (+34...)'
  }

  if (!email.value.trim()) {
    newErrors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    newErrors.email = 'Email no válido'
  }

  if (!fecha_hora.value) {
    newErrors.fecha_hora = 'La fecha es obligatoria'
  } else {
    const fecha = new Date(fecha_hora.value)
    if (isNaN(fecha.getTime())) {
      newErrors.fecha_hora = 'La fecha no es valida'
    } else if (fecha <= new Date()) {
      newErrors.fecha_hora = 'La fecha debe ser futura'
    }
  }

  if (numero_comensales.value === null || numero_comensales.value === undefined) {
    newErrors.numero_comensales = 'Indica el numero de comensales'
  } else if (numero_comensales.value < 1 || numero_comensales.value > 20) {
    newErrors.numero_comensales = 'Entre 1 y 20 comensales'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleSubmit() {
  if (!validate()) return

  emit('submit', {
    nombre: nombre.value.trim(),
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    fecha_hora: fecha_hora.value,
    numero_comensales: numero_comensales.value!,
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
      <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">
        {{ errors.nombre }}
      </p>
    </div>

    <!-- Telefono -->
    <div>
      <label for="telefono" class="block text-sm font-medium text-slate">Telefono *</label>
      <input
        id="telefono"
        v-model="telefono"
        type="tel"
        placeholder="+34600000000"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.telefono }"
      />
      <p v-if="errors.telefono" class="mt-1 text-sm text-red-600">
        {{ errors.telefono }}
      </p>
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
      <p v-if="errors.email" class="mt-1 text-sm text-red-600">
        {{ errors.email }}
      </p>
    </div>

    <!-- Fecha/Hora -->
    <div>
      <label for="fecha_hora" class="block text-sm font-medium text-slate">Fecha y hora *</label>
      <input
        id="fecha_hora"
        v-model="fecha_hora"
        type="datetime-local"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': errors.fecha_hora }"
      />
      <p v-if="errors.fecha_hora" class="mt-1 text-sm text-red-600">
        {{ errors.fecha_hora }}
      </p>
    </div>

    <!-- Numero de comensales -->
    <div>
      <label for="numero_comensales" class="block text-sm font-medium text-slate">
        Numero de comensales *
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
