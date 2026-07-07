<script setup lang="ts">
/**
 * ClienteForm — Admin form for creating/editing a cliente (CLI-002, CLI-003)
 *
 * Props: cliente (null for create, object for edit), loading
 * Emits: save(CreateClientePayload | UpdateClientePayload), cancel()
 * Validation: nombre required, telefono required (Spanish format), email optional
 * Telefono is read-only in edit mode
 */
import { ref, computed } from 'vue'
import type { CreateClientePayload, UpdateClientePayload } from '#shared/contracts/reservation.contract'

const props = defineProps<{
  cliente?: CreateClientePayload & { id?: string; telefono?: string } | null
  loading?: boolean
}>()

const emit = defineEmits<{
  save: [data: CreateClientePayload | UpdateClientePayload]
  cancel: []
}>()

const isEdit = computed(() => !!props.cliente?.id)

const nombre = ref(props.cliente?.nombre || '')
const apellidos = ref(props.cliente?.apellidos || '')
const telefono = ref(props.cliente?.telefono || '')
const email = ref(props.cliente?.email || '')
const errors = ref<Record<string, string>>({})

function validatePhone(raw: string): boolean {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '')
  if (/^\+?34?[679]\d{8}$/.test(cleaned)) return true
  return false
}

function validate(): boolean {
  const e: Record<string, string> = {}

  if (!nombre.value.trim()) {
    e.nombre = 'El nombre es obligatorio'
  }

  if (!telefono.value.trim() && !isEdit.value) {
    e.telefono = 'El teléfono es obligatorio'
  } else if (telefono.value.trim() && !validatePhone(telefono.value)) {
    e.telefono = 'Formato de teléfono no válido (ej: 600123456)'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return

  emit('save', {
    nombre: nombre.value.trim(),
    apellidos: apellidos.value.trim() || undefined,
    telefono: telefono.value.trim(),
    email: email.value.trim() || undefined,
  })
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
    <h3 class="text-lg font-bold text-slate">
      {{ isEdit ? 'Editar cliente' : 'Nuevo cliente' }}
    </h3>

    <!-- Nombre -->
    <div>
      <label for="cliente-nombre" class="block text-sm font-medium text-slate">Nombre *</label>
      <input
        id="cliente-nombre"
        v-model="nombre"
        data-testid="cliente-nombre"
        type="text"
        class="mt-1 w-full rounded-lg border px-3 py-2"
        :class="errors.nombre ? 'border-red-500' : 'border-gray-300'"
      />
      <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
    </div>

    <!-- Apellidos -->
    <div>
      <label for="cliente-apellidos" class="block text-sm font-medium text-slate">Apellidos</label>
      <input
        id="cliente-apellidos"
        v-model="apellidos"
        data-testid="cliente-apellidos"
        type="text"
        class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- Teléfono -->
    <div>
      <label for="cliente-telefono" class="block text-sm font-medium text-slate">
        Teléfono {{ isEdit ? '' : '*' }}
      </label>
      <input
        id="cliente-telefono"
        v-model="telefono"
        data-testid="cliente-telefono"
        type="tel"
        :readonly="isEdit"
        :class="[
          'mt-1 w-full rounded-lg border px-3 py-2',
          errors.telefono ? 'border-red-500' : 'border-gray-300',
          isEdit ? 'bg-gray-100 cursor-not-allowed' : '',
        ]"
        :placeholder="isEdit ? '' : '600123456'"
      />
      <p v-if="errors.telefono" class="mt-1 text-sm text-red-600">{{ errors.telefono }}</p>
    </div>

    <!-- Email -->
    <div>
      <label for="cliente-email" class="block text-sm font-medium text-slate">Email</label>
      <input
        id="cliente-email"
        v-model="email"
        data-testid="cliente-email"
        type="email"
        class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
        placeholder="cliente@email.com"
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="submit"
        :disabled="loading"
        data-testid="cliente-save"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
      >
        {{ loading ? 'Guardando...' : 'Guardar' }}
      </button>
      <button
        type="button"
        data-testid="cliente-cancel"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate hover:bg-gray-100"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>
