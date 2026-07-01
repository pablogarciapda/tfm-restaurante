<!--
  UsuarioForm — Create / Edit user form (USR-001, USR-002)

  Create mode: email, password, role
  Edit mode: email (read-only), role, PermissionsEditor
  Spanish labels, client-side validation, emits submit/cancel.
-->
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit'
    initialEmail?: string
    initialRole?: string
    initialPermissions?: Record<string, boolean>
  }>(),
  {
    initialEmail: '',
    initialRole: 'editor',
    initialPermissions: () => ({
      carta: true,
      menu_diario: true,
      eventos: true,
      reservas: false,
      configuracion: false,
      usuarios: false,
    }),
  },
)

const emit = defineEmits<{
  (e: 'submit', value: Record<string, unknown>): void
  (e: 'cancel'): void
}>()

// ── Form state ──
const email = ref(props.initialEmail)
const password = ref('')
const role = ref(props.initialRole)
const permissions = ref<Record<string, boolean>>({ ...props.initialPermissions })
const errors = ref<string[]>([])

const isCreate = computed(() => props.mode === 'create')
const title = computed(() => (isCreate.value ? 'Crear Usuario' : 'Editar Usuario'))

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Validation ──
function validate(): boolean {
  const result: string[] = []

  if (!email.value.trim()) {
    result.push('El email es requerido')
  } else if (!EMAIL_REGEX.test(email.value)) {
    result.push('El email no tiene un formato válido')
  }

  if (isCreate.value) {
    if (!password.value) {
      result.push('La contraseña es requerida')
    } else if (password.value.length < 6) {
      result.push('La contraseña debe tener al menos 6 caracteres')
    }
  }

  errors.value = result
  return result.length === 0
}

// ── Submit ──
function handleSubmit() {
  if (!validate()) return

  const data: Record<string, unknown> = { role: role.value, permissions: permissions.value }
  if (isCreate.value) {
    data.email = email.value
    data.password = password.value
  }
  emit('submit', data)
}
</script>

<template>
  <form
    class="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    data-testid="usuario-form"
    @submit.prevent="handleSubmit"
  >
    <h3 class="text-lg font-bold text-slate">{{ title }}</h3>

    <!-- Validation errors -->
    <div v-if="errors.length > 0" class="rounded-md bg-red-50 p-3">
      <ul class="list-disc space-y-1 pl-5 text-sm text-red-600">
        <li v-for="err in errors" :key="err">{{ err }}</li>
      </ul>
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="mb-1 block text-sm font-medium text-slate">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        :readonly="!isCreate"
        :placeholder="isCreate ? 'usuario@lazingara.es' : ''"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta disabled:bg-gray-100"
        :class="{ 'bg-gray-100 cursor-not-allowed': !isCreate }"
      />
    </div>

    <!-- Password (create only) -->
    <div v-if="isCreate">
      <label for="password" class="mb-1 block text-sm font-medium text-slate">Contraseña</label>
      <input
        id="password"
        v-model="password"
        type="password"
        placeholder="Mínimo 6 caracteres"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
      />
    </div>

    <!-- Role -->
    <div>
      <label for="role" class="mb-1 block text-sm font-medium text-slate">Rol</label>
      <select
        id="role"
        v-model="role"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
      >
        <option value="admin">Administrador</option>
        <option value="editor">Editor</option>
      </select>
    </div>

    <!-- Permissions Editor (edit mode only) -->
    <div v-if="!isCreate">
      <PermissionsEditor v-model="permissions" :role="role" />
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 pt-4">
      <button
        type="button"
        data-testid="cancel-button"
        class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-slate transition-colors hover:bg-gray-50"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90"
      >
        Guardar
      </button>
    </div>
  </form>
</template>
