<!--
  EventoForm — Create/edit evento form (CEV-002)
  Spanish labels, inline validation.
  Image: file upload (with mobile camera) + URL paste → auto-download to Supabase Storage.
-->
<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from 'vue'
import type { ImageUploadOptions } from '~/composables/useImageUpload'
import { useImageUpload } from '~/composables/useImageUpload'

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

// Image upload — same pattern as PlatoForm
const imageUploadOpts = ref<ImageUploadOptions>({ bucket: 'evento-images' })
const { uploading, uploadFromFile, uploadFromUrl } = useImageUpload(imageUploadOpts)
const imagePreview = ref<string | null>(null)
const imageUploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  // Initial image preview (edit mode)
  if (form.imagen_url) {
    imagePreview.value = form.imagen_url
  }
})

// Auto-upload external URL when pasted
let urlDebounce: ReturnType<typeof setTimeout> | null = null
watch(
  () => form.imagen_url,
  (newVal) => {
    // Clear preview if URL is emptied
    if (!newVal?.trim()) {
      imagePreview.value = null
      return
    }
    // Skip if it's already a Supabase URL (was uploaded by us)
    if (newVal.startsWith(import.meta.env.VITE_SUPABASE_URL + '/storage/v1/object/public/evento-images/')) {
      return
    }
    // Skip if it's a data URL (just uploaded via file picker)
    if (newVal.startsWith('data:')) {
      return
    }

    if (urlDebounce) clearTimeout(urlDebounce)
    urlDebounce = setTimeout(async () => {
      imageUploadError.value = null
      const result = await uploadFromUrl(newVal)
      if (result) {
        form.imagen_url = result
        imagePreview.value = result
      }
    }, 800)
  }
)

async function handleFilePick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  imageUploadError.value = null

  // Show local preview immediately
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  const result = await uploadFromFile(file, `evento-${Date.now()}`)
  if (result) {
    form.imagen_url = result
    imagePreview.value = result
  } else {
    imageUploadError.value = 'No se pudo subir la imagen'
  }

  // Reset input so the same file can be re-selected
  input.value = ''
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

    <!-- Imagen -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate">Imagen</label>

      <!-- Preview -->
      <div v-if="imagePreview" class="relative mb-2 overflow-hidden rounded-lg">
        <img :src="imagePreview" alt="Preview" class="h-40 w-full object-cover" />
        <button
          type="button"
          class="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-700 hover:bg-white"
          @click="form.imagen_url = ''; imagePreview = null"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-black/40">
          <span class="text-sm text-white">Subiendo...</span>
        </div>
      </div>

      <!-- File upload with mobile camera support -->
      <div class="flex gap-2">
        <label
          class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Seleccionar imagen</span>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            capture="environment"
            class="hidden"
            @change="handleFilePick"
          />
        </label>
      </div>

      <!-- URL input -->
      <div class="mt-2">
        <input
          v-model="form.imagen_url"
          type="text"
          class="w-full rounded-lg border px-3 py-2 text-sm"
          :class="imageUploadError ? 'border-red-500' : 'border-gray-300'"
          placeholder="https://... (pegar URL para auto-descargar)"
        />
        <p v-if="imageUploadError" class="mt-1 text-sm text-red-600">{{ imageUploadError }}</p>
        <p v-else-if="uploading" class="mt-1 text-sm text-slate-500">Descargando imagen desde URL...</p>
      </div>
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
