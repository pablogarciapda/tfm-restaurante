<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * ContactForm — Contact form with Spanish validation (CO-004)
 *
 * Fields: nombre (required), email (required, format validated),
 * mensaje (required, max 500 chars, char counter).
 * Submits to POST /api/contacto. Disables submit while sending.
 * Spanish error messages.
 */

const nombre = ref('')
const email = ref('')
const mensaje = ref('')
const errors = ref<Record<string, string>>({})
const sending = ref(false)
const success = ref(false)
const touched = ref<Record<string, boolean>>({})

const emit = defineEmits<{
  submit: [data: { nombre: string; email: string; mensaje: string }]
}>()

const charCount = computed(() => mensaje.value.length)

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  if (!nombre.value.trim()) {
    newErrors.nombre = 'El nombre es obligatorio'
  }

  if (!email.value.trim()) {
    newErrors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    newErrors.email = 'El email no es válido'
  }

  if (!mensaje.value.trim()) {
    newErrors.mensaje = 'El mensaje es obligatorio'
  } else if (mensaje.value.length > 500) {
    newErrors.mensaje = 'El mensaje no puede superar 500 caracteres'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleBlur(field: string) {
  touched.value[field] = true
  validate()
}

async function handleSubmit() {
  if (!validate()) return

  sending.value = true
  success.value = false

  try {
    await $fetch('/api/contacto', {
      method: 'POST',
      body: {
        nombre: nombre.value.trim(),
        email: email.value.trim(),
        mensaje: mensaje.value.trim(),
      },
    })
    success.value = true
    nombre.value = ''
    email.value = ''
    mensaje.value = ''
    errors.value = {}
    touched.value = {}
    emit('submit', { nombre: nombre.value, email: email.value, mensaje: mensaje.value })
  } catch {
    errors.value.api = 'Error al enviar. Inténtelo de nuevo.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form novalidate class="space-y-5" @submit.prevent="handleSubmit">
    <!-- Success message -->
    <div
      v-if="success"
      class="rounded-lg bg-green-50 p-4 text-center text-green-800"
    >
      Mensaje enviado. Gracias.
    </div>

    <!-- API error -->
    <div
      v-if="errors.api"
      class="rounded-lg bg-red-50 p-4 text-center text-red-800"
    >
      {{ errors.api }}
    </div>

    <!-- Nombre -->
    <div>
      <label for="nombre" class="block text-sm font-medium text-slate">
        Nombre *
      </label>
      <input
        id="nombre"
        v-model="nombre"
        type="text"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': touched.nombre && errors.nombre }"
        @blur="handleBlur('nombre')"
      />
      <p v-if="touched.nombre && errors.nombre" class="mt-1 text-sm text-red-600">
        {{ errors.nombre }}
      </p>
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium text-slate">
        Email *
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': touched.email && errors.email }"
        @blur="handleBlur('email')"
      />
      <p v-if="touched.email && errors.email" class="mt-1 text-sm text-red-600">
        {{ errors.email }}
      </p>
    </div>

    <!-- Mensaje -->
    <div>
      <label for="mensaje" class="block text-sm font-medium text-slate">
        Mensaje *
      </label>
      <textarea
        id="mensaje"
        v-model="mensaje"
        rows="4"
        maxlength="500"
        class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        :class="{ 'border-red-500': touched.mensaje && errors.mensaje }"
        @blur="handleBlur('mensaje')"
      />
      <div class="mt-1 flex justify-between text-sm">
        <p v-if="touched.mensaje && errors.mensaje" class="text-red-600">
          {{ errors.mensaje }}
        </p>
        <span class="ml-auto text-gray-400">
          {{ charCount }}/500
        </span>
      </div>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      class="w-full rounded-lg bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="sending"
    >
      {{ sending ? 'Enviando...' : 'Enviar' }}
    </button>
  </form>
</template>
