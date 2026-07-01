<!--
  Eventos Admin — CRUD eventos management (CEV-001–CEV-004)
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()

interface Evento {
  id: string
  titulo: string
  descripcion?: string
  fecha: string
  categoria: string
  imagen_url?: string
  capacidad?: number
  estado: string
  activo: boolean
}

const eventos = ref<Evento[]>([])
const showForm = ref(false)
const editingEvento = ref<Evento | null>(null)

async function loadEventos() {
  const { data, error } = await client.from('eventos').select('*').order('fecha', { ascending: false })
  if (!error && data) eventos.value = data as Evento[]
}

async function handleCreate(data: Record<string, unknown>) {
  const { error } = await client.from('eventos').insert(data)
  if (!error) { showForm.value = false; await loadEventos() }
}

async function handleUpdate(data: Record<string, unknown>) {
  const { error } = await client.from('eventos').update(data).eq('id', editingEvento.value!.id)
  if (!error) { showForm.value = false; editingEvento.value = null; await loadEventos() }
}

function handleEdit(id: string) {
  const ev = eventos.value.find((e) => e.id === id)
  if (ev) { editingEvento.value = ev; showForm.value = true }
}

async function handleDelete(id: string) {
  if (!confirm('¿Eliminar este evento?')) return
  const { error } = await client.from('eventos').delete().eq('id', id)
  if (!error) await loadEventos()
}

async function handleToggleActivo(id: string, value: boolean) {
  await client.from('eventos').update({ activo: value }).eq('id', id)
  await loadEventos()
}

function handleSubmit(data: Record<string, unknown>) {
  if (editingEvento.value) handleUpdate(data)
  else handleCreate(data)
}

onMounted(() => loadEventos())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate">Gestión de Eventos</h1>
      <button v-if="!showForm" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90" @click="showForm = true">
        + Nuevo evento
      </button>
    </div>

    <div v-if="showForm" class="mb-6">
      <EventoForm :initial-evento="editingEvento as Record<string, unknown> | null" @submit="handleSubmit" @cancel="showForm = false; editingEvento = null" />
    </div>

    <EventosTable v-else :eventos="eventos" @edit="handleEdit" @delete="handleDelete" @toggle-activo="handleToggleActivo" />
  </div>
</template>
