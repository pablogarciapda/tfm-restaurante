<!--
  Carta Admin — CRUD platos management (CRUD-001–CRUD-005)
  Middleware: auth → role → permissions
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Database } from '~/types/database.types'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const supabase = useSupabaseClient<Database>()

interface Plato {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
  tipo_menu: string
  puesto: number
  descripcion?: string
  imagen_url?: string
  calorias?: number
  alergenos?: string[]
  recomendado?: boolean
}

const platos = ref<Plato[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingPlato = ref<Plato | null>(null)

async function loadPlatos() {
  loading.value = true
  const { data, error } = await supabase
    .from('platos')
    .select('*')
    .order('puesto')

  if (!error && data) {
    platos.value = data as Plato[]
  }
  loading.value = false
}

async function handleCreate(data: Record<string, unknown>) {
  const { error } = await supabase.from('platos').insert(data as Database['public']['Tables']['platos']['Insert'])
  if (!error) {
    showForm.value = false
    await loadPlatos()
  }
}

async function handleUpdate(data: Record<string, unknown>) {
  const { error } = await supabase
    .from('platos')
    .update(data as Database['public']['Tables']['platos']['Update'])
    .eq('id', editingPlato.value!.id)

  if (!error) {
    showForm.value = false
    editingPlato.value = null
    await loadPlatos()
  }
}

function handleEdit(id: string) {
  const plato = platos.value.find((p) => p.id === id)
  if (plato) {
    editingPlato.value = plato
    showForm.value = true
  }
}

async function handleDelete(id: string) {
  if (!confirm('¿Eliminar este plato?')) return

  const { error } = await supabase.from('platos').delete().eq('id', id)
  if (!error) {
    await loadPlatos()
  }
}

async function handleToggleDisponible(id: string, value: boolean) {
  await supabase.from('platos').update({ disponible: value } as Database['public']['Tables']['platos']['Update']).eq('id', id)
  await loadPlatos()
}

function handleSubmit(data: Record<string, unknown>) {
  if (editingPlato.value) {
    handleUpdate(data)
  } else {
    handleCreate(data)
  }
}

function handleCancel() {
  showForm.value = false
  editingPlato.value = null
}

onMounted(() => {
  loadPlatos()
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate">Gestión de Carta</h1>
      <button
        v-if="!showForm"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
        @click="showForm = true"
      >
        + Nuevo plato
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="mb-6">
      <PlatoForm
        :initial-plato="editingPlato ?? undefined"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <!-- Table -->
    <PlatosTable
      v-else
      :platos="platos"
      @edit="handleEdit"
      @delete="handleDelete"
      @toggle-disponible="handleToggleDisponible"
    />
  </div>
</template>
