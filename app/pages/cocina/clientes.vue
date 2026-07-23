<!--
  cocina/clientes — Admin clientes page (CLI-001)
  Protected by auth → role → permissions middleware.
-->
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import type { ClienteWithCount, CreateClientePayload, UpdateClientePayload } from '#shared/contracts/reservation.contract'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const clientes = ref<ClienteWithCount[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingCliente = ref<CreateClientePayload & { id?: string; telefono?: string } | null>(null)
const formRef = ref<HTMLDivElement | null>(null)
const formLoading = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

async function loadClientes(search?: string) {
  loading.value = true
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const data = await $fetch<ClienteWithCount[]>(`/api/cocina/clientes${query}`)
    clientes.value = data || []
  } catch {
    clientes.value = []
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  editingCliente.value = null
  showForm.value = true
}

function handleEdit(cliente: ClienteWithCount) {
  // Strip ClienteWithCount to just the fields ClienteForm expects
  editingCliente.value = {
    id: cliente.id,
    nombre: cliente.nombre,
    apellidos: cliente.apellidos ?? undefined,
    telefono: cliente.telefono,
    email: cliente.email ?? undefined,
  }
  showForm.value = true
  nextTick(() => {
    formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function handleSave(data: CreateClientePayload | UpdateClientePayload) {
  formLoading.value = true
  try {
    if (editingCliente.value?.id) {
      await $fetch(`/api/cocina/clientes/${editingCliente.value.id}`, {
        method: 'PUT',
        body: data,
      })
      showToast('Cliente actualizado', 'success')
    } else {
      await $fetch('/api/cocina/clientes', {
        method: 'POST',
        body: data,
      })
      showToast('Cliente creado', 'success')
    }
    showForm.value = false
    editingCliente.value = null
    await loadClientes()
  } catch {
    showToast('Error al guardar cliente', 'error')
  } finally {
    formLoading.value = false
  }
}



function handleCancel() {
  showForm.value = false
  editingCliente.value = null
}

onMounted(() => {
  loadClientes()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate">Clientes</h1>
      <button
        type="button"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
        @click="handleCreate"
      >
        + Nuevo cliente
      </button>
    </div>

    <!-- Cliente form modal -->
    <div ref="formRef" v-if="showForm" class="rounded-lg bg-white p-6 shadow">
      <ClienteForm
        :cliente="editingCliente"
        :loading="formLoading"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </div>

    <!-- Clientes table -->
    <ClientesTable
      :clientes="clientes"
      :loading="loading"
      @edit="handleEdit"
    />
  </div>

  <!-- Toast notification -->
  <Teleport to="body">
    <div
      v-if="toast"
      class="fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all"
      :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>
