<!--
  UsuariosTable — User listing table (USR-001)

  Columns: Email, Rol (badge), Estado (badge), Acciones
  Actions: Edit, Deactivate (confirm), Reset Password (confirm)
  Spanish labels and empty state.
-->
<script setup lang="ts">
import { ref } from 'vue'

interface User {
  id: string
  email: string
  role: string
  permissions: Record<string, boolean>
  activo: boolean
  created_at: string
}

defineProps<{
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'edit' | 'deactivate' | 'reset-password', userId: string): void
}>()

// ── Confirmation state ──
const confirmDeactivateId = ref<string | null>(null)
const confirmResetId = ref<string | null>(null)

function roleBadge(role: string): string {
  return role === 'admin' ? 'Administrador' : 'Editor'
}

function roleBadgeClass(role: string): string {
  return role === 'admin'
    ? 'bg-terracotta/10 text-terracotta'
    : 'bg-slate/10 text-slate'
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <!-- Empty state -->
    <div
      v-if="users.length === 0"
      class="px-6 py-12 text-center text-sm text-gray-500"
    >
      No hay usuarios registrados
    </div>

    <!-- Table -->
    <table v-else class="w-full text-left text-sm">
      <thead class="border-b border-gray-200 bg-gray-50">
        <tr>
          <th class="px-4 py-3 font-medium text-slate">Email</th>
          <th class="px-4 py-3 font-medium text-slate">Rol</th>
          <th class="px-4 py-3 font-medium text-slate">Estado</th>
          <th class="px-4 py-3 font-medium text-slate">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
          <!-- Email -->
          <td class="px-4 py-3 font-medium text-slate">{{ user.email }}</td>

          <!-- Role badge -->
          <td class="px-4 py-3">
            <span
              class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="roleBadgeClass(user.role)"
            >
              {{ roleBadge(user.role) }}
            </span>
          </td>

          <!-- Status badge -->
          <td class="px-4 py-3">
            <span
              v-if="user.activo"
              class="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
            >
              Activo
            </span>
            <span
              v-else
              class="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
            >
              Inactivo
            </span>
          </td>

          <!-- Actions -->
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <!-- Edit -->
              <button
                data-testid="edit-user"
                class="rounded-md px-2 py-1 text-xs font-medium text-slate transition-colors hover:bg-gray-100"
                @click="emit('edit', user.id)"
              >
                Editar
              </button>

              <!-- Deactivate -->
              <template v-if="confirmDeactivateId === user.id">
                <span class="text-xs text-red-600">¿Seguro?</span>
                <button
                  data-testid="confirm-deactivate"
                  class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
                  @click="emit('deactivate', user.id); confirmDeactivateId = null"
                >
                  Sí
                </button>
                <button
                  data-testid="cancel-deactivate"
                  class="rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-slate"
                  @click="confirmDeactivateId = null"
                >
                  No
                </button>
              </template>
              <button
                v-else
                data-testid="deactivate-user"
                class="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                @click="confirmDeactivateId = user.id"
              >
                Desactivar
              </button>

              <!-- Reset Password -->
              <template v-if="confirmResetId === user.id">
                <span class="text-xs text-amber-600">¿Restablecer?</span>
                <button
                  data-testid="confirm-reset"
                  class="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white"
                  @click="emit('reset-password', user.id); confirmResetId = null"
                >
                  Sí
                </button>
                <button
                  data-testid="cancel-reset"
                  class="rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-slate"
                  @click="confirmResetId = null"
                >
                  No
                </button>
              </template>
              <button
                v-else
                data-testid="reset-password"
                class="rounded-md px-2 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50"
                @click="confirmResetId = user.id"
              >
                Restablecer contraseña
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
