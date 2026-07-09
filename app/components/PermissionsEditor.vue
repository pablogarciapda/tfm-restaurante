<!--
  PermissionsEditor — 6 toggle switches per resource (USR-003)

  v-model with boolean-per-resource object.
  Disabled when role is 'admin' (implicit full access).
  Spanish labels throughout.
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: Record<string, boolean>
  role: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, boolean>): void
}>()

const isAdmin = computed(() => props.role === 'admin')

interface PermissionItem {
  key: string
  label: string
}

const permissions: PermissionItem[] = [
  { key: 'carta', label: 'Carta' },
  { key: 'menu_diario', label: 'Menú Diario' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'reservas', label: 'Reservas' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'fusionar', label: 'Fusionar mesas' },
]

function toggle(key: string) {
  const updated = { ...props.modelValue, [key]: !props.modelValue[key] }
  emit('update:modelValue', updated)
}
</script>

<template>
  <fieldset class="space-y-3" :disabled="isAdmin">
    <legend v-if="isAdmin" class="mb-2 text-sm font-medium text-terracotta">
      Acceso completo (Administrador)
    </legend>
    <legend v-else class="mb-2 text-sm font-medium text-slate">
      Permisos del editor
    </legend>

    <div
      v-for="perm in permissions"
      :key="perm.key"
      class="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
    >
      <label
        :for="`perm-${perm.key}`"
        class="cursor-pointer text-sm text-slate"
        :class="{ 'text-gray-400': isAdmin }"
      >
        {{ perm.label }}
      </label>
      <input
        :id="`perm-${perm.key}`"
        type="checkbox"
        :value="perm.key"
        :checked="modelValue[perm.key] === true"
        :disabled="isAdmin"
        class="h-5 w-5 rounded border-gray-300 text-terracotta focus:ring-terracotta disabled:opacity-50"
        @change="toggle(perm.key)"
      />
    </div>
  </fieldset>
</template>
