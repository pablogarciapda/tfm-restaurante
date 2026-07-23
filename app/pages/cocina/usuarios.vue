<!--
  /cocina/usuarios — Admin user management (USR-001 to USR-006)

  Admin-only. Lists users, create/edit, deactivate, reset password.
  Middleware: auth, role, permissions (usuarios = admin only per spec).
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
})

interface User {
  id: string
  email: string
  role: string
  permissions: Record<string, boolean>
  activo: boolean
  created_at: string
}

// ── State ──
const users = ref<User[]>([])
const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingUser = ref<{ email: string; role: string; id: string; permissions: Record<string, boolean> } | null>(null)
const loading = ref(false)

// ── Fetch users ──
async function loadUsers() {
  loading.value = true
  try {
    const data = await $fetch<User[]>('/api/cocina/usuarios/list')
    users.value = data || []
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsers()
})

// ── Handlers ──
function openCreate() {
  formMode.value = 'create'
  editingUser.value = null
  showForm.value = true
}

function openEdit(userId: string) {
  const user = users.value.find((u) => u.id === userId)
  if (!user) return

  formMode.value = 'edit'
  editingUser.value = {
    id: userId,
    email: user.email as string,
    role: user.role as string,
    permissions: user.permissions as Record<string, boolean>,
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingUser.value = null
}

async function handleCreateSubmit(formData: Record<string, unknown>) {
  try {
    await $fetch('/api/cocina/usuarios/create', {
      method: 'POST',
      body: formData,
    })
    closeForm()
    await loadUsers()
  } catch {
    // Error handling via toast in production
  }
}

async function handleEditSubmit(formData: Record<string, unknown>) {
  if (!editingUser.value) return
  try {
    await $fetch('/api/cocina/usuarios/update', {
      method: 'POST',
      body: { id: editingUser.value.id, ...formData },
    })
    closeForm()
    await loadUsers()
  } catch {
    // Error handling via toast in production
  }
}

async function handleDeactivate(userId: string) {
  try {
    await $fetch('/api/cocina/usuarios/deactivate', {
      method: 'POST',
      body: { id: userId },
    })
    await loadUsers()
  } catch {
    // Error handling via toast in production
  }
}

async function handleResetPassword(userId: string) {
  const user = users.value.find((u) => u.id === userId)
  if (!user?.email) {
    console.warn('[usuarios] No se encontró email para el usuario:', userId)
    return
  }

  try {
    await $fetch('/api/cocina/usuarios/reset-password', {
      method: 'POST',
      body: { email: user.email },
    })
    // TODO: success notification — toast when system is in place
  } catch {
    // Error handling via toast in production
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="font-serif text-2xl font-bold text-slate">Gestión de Usuarios</h1>
      <button
        v-if="!showForm"
        data-testid="new-user-btn"
        class="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90"
        @click="openCreate"
      >
        Nuevo usuario
      </button>
      <button
        v-if="showForm"
        data-testid="cancel-form-btn"
        class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-slate"
        @click="closeForm"
      >
        Cancelar
      </button>
    </div>

    <!-- Create/Edit Form -->
    <UsuarioForm
      v-if="showForm && formMode === 'create'"
      :key="'create'"
      mode="create"
      @submit="handleCreateSubmit"
      @cancel="closeForm"
    />
    <UsuarioForm
      v-if="showForm && formMode === 'edit' && editingUser"
      :key="`edit-${editingUser.id}`"
      mode="edit"
      :initial-email="editingUser.email"
      :initial-role="editingUser.role"
      :initial-permissions="editingUser.permissions"
      @submit="handleEditSubmit"
      @cancel="closeForm"
    />

    <!-- Users Table -->
    <UsuariosTable
      :users="users"
      @edit="openEdit"
      @deactivate="handleDeactivate"
      @reset-password="handleResetPassword"
    />
  </div>
</template>
