<!--
  EventoForm — Create/edit evento form (CEV-002)
  Spanish labels, inline validation.
-->
<script setup lang="ts">
import { reactive, ref, computed } from 'vue'

interface CategoriaEvento {
  id: string
  nombre: string
}

interface EventoFormData {
  titulo: string
  descripcion: string
  fecha: string
  categoria_id: string
  imagen_url: string
  capacidad: number | null
  estado: string
  activo: boolean
}

const props = defineProps<{
  initialEvento?: Record<string, unknown> | null
  categorias: CategoriaEvento[]
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const isEdit = computed(() => !!props.initialEvento)

const form = reactive<EventoFormData>({
  titulo: (props.initialEvento?.titulo as string) ?? '',
  descripcion: (props.initialEvento?.descripcion as string) ?? '',
  fecha: toDatetimeLocal(props.initialEvento?.fecha as string),
  categoria_id: (props.initialEvento?.categoria_id as string) ?? (props.categorias[0]?.id ?? '').toString(),
  imagen_url: (props.initialEvento?.imagen_url as string) ?? '',
  capacidad: (props.initialEvento?.capacidad as number) ?? null,
  estado: (props.initialEvento?.estado as string) ?? 'programado',
  activo: (props.initialEvento?.activo as boolean) ?? true,
})

function toDatetimeLocal(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

const errors = ref<Record<string, string>>({})

function validate(): boolean {
  const e: Record<string, string> = {}
  if (!form.titulo.trim()) {
    e.titulo = 'El título es obligatorio'
  }
  if (!form.fecha) {
    e.fecha = 'La fecha es obligatoria'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return

  emit('submit', {
    ...form,
    fecha: form.fecha ? new Date(form.fecha).toISOString() : null,
    capacidad: form.capacidad ?? 0,
  })
}


</script>

<template>
  <form class="space-y-4 rounded-lg bg-white p-6 shadow" @submit.prevent="handleSubmit">
    <h2 class="text-xl font-bold text-slate">
      {{ isEdit ? 'Editar evento' : 'Nuevo evento' }}
    </h2>

    <!-- Titulo -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-titulo">Título *</label>
      <input
        id="evento-titulo"
        v-model="form.titulo"
        data-testid="evento-titulo"
        type="text"
        class="w-full rounded-lg border px-3 py-2"
        :class="errors.titulo ? 'border-red-500' : 'border-gray-300'"
      />
      <p v-if="errors.titulo" class="mt-1 text-sm text-red-600">{{ errors.titulo }}</p>
    </div>

    <!-- Descripcion -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-descripcion">Descripción</label>
      <textarea
        id="evento-descripcion"
        v-model="form.descripcion"
        data-testid="evento-descripcion"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        rows="3"
      />
    </div>

    <!-- Fecha -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-fecha">Fecha *</label>
      <input
        id="evento-fecha"
        v-model="form.fecha"
        data-testid="evento-fecha"
        type="datetime-local"
        class="w-full rounded-lg border px-3 py-2"
        :class="errors.fecha ? 'border-red-500' : 'border-gray-300'"
      />
      <p v-if="errors.fecha" class="mt-1 text-sm text-red-600">{{ errors.fecha }}</p>
    </div>

    <!-- Categoria -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-categoria">Categoría</label>
      <select
        id="evento-categoria"
        v-model="form.categoria_id"
        data-testid="evento-categoria"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option v-for="cat in categorias" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
      </select>
    </div>

    <!-- Imagen URL -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-imagen">Imagen URL</label>
      <input
        id="evento-imagen"
        v-model="form.imagen_url"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        placeholder="https://..."
      />
    </div>

    <!-- Capacidad -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="evento-capacidad">Capacidad</label>
      <input
        id="evento-capacidad"
        v-model.number="form.capacidad"
        type="number"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- Activo -->
    <div class="flex items-center gap-2">
      <input id="evento-activo" v-model="form.activo" type="checkbox" class="h-4 w-4 rounded" />
      <label class="text-sm font-medium text-slate" for="evento-activo">Activo (visible en web)</label>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90">
        Guardar evento
      </button>
    </div>
  </form>
</template>
