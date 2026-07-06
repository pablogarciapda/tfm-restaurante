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
  crop_focus_x: number
  crop_focus_y: number
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
  crop_focus_x: (props.initialEvento?.crop_focus_x as number) ?? 50,
  crop_focus_y: (props.initialEvento?.crop_focus_y as number) ?? 50,
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

// Crop tool state
const CROP_ASPECT = 16 / 9 // Matches the EventCard image container aspect ratio
const cropContainer = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const imgLoaded = ref(false)
const imgDisplay = ref({ w: 0, h: 0 })
const imgNatural = ref({ w: 0, h: 0 })

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

onMounted(() => {
  // Initial image preview (edit mode)
  if (form.imagen_url) {
    imagePreview.value = form.imagen_url
  }
})

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imgNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
  const rect = img.getBoundingClientRect()
  imgDisplay.value = { w: rect.width, h: rect.height }
  imgLoaded.value = true
}

// Crop window position in display-px (centered on focal point, clamped to image bounds)
const cropDisplayRect = computed(() => {
  const { w, h } = imgDisplay.value
  if (!w || !h) return { x: 0, y: 0, w: 0, h: 0 }

  // Crop window fits inside the displayed image at CROP_ASPECT ratio
  let cw = w
  let ch = w / CROP_ASPECT

  if (ch > h) {
    ch = h
    cw = h * CROP_ASPECT
  }

  // Center on focal point (as percentage of image)
  const fx = form.crop_focus_x / 100
  const fy = form.crop_focus_y / 100

  let x = fx * w - cw / 2
  let y = fy * h - ch / 2

  // Clamp so crop window stays within image bounds
  x = clamp(x, 0, w - cw)
  y = clamp(y, 0, h - ch)

  return { x, y, w: cw, h: ch }
})

const cropOverlayStyle = computed(() => {
  const r = cropDisplayRect.value
  return {
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.w}px`,
    height: `${r.h}px`,
  }
})

let dragStart = { x: 0, y: 0, fx: 50, fy: 50 }

function startDrag(e: MouseEvent) {
  e.preventDefault()
  if (!imgDisplay.value.w || !imgDisplay.value.h) return
  isDragging.value = true
  dragStart = { x: e.clientX, y: e.clientY, fx: form.crop_focus_x, fy: form.crop_focus_y }

  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - dragStart.x
    const dy = ev.clientY - dragStart.y
    const { w, h } = imgDisplay.value
    form.crop_focus_x = clamp(0, 100, dragStart.fx + (dx / w) * 100)
    form.crop_focus_y = clamp(0, 100, dragStart.fy + (dy / h) * 100)
  }

  function onUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Touch support for mobile admin
function startTouchDrag(e: TouchEvent) {
  if (!e.touches[0]) return
  if (!imgDisplay.value.w || !imgDisplay.value.h) return
  isDragging.value = true
  dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, fx: form.crop_focus_x, fy: form.crop_focus_y }

  function onTouchMove(ev: TouchEvent) {
    if (!ev.touches[0]) return
    const dx = ev.touches[0].clientX - dragStart.x
    const dy = ev.touches[0].clientY - dragStart.y
    const { w, h } = imgDisplay.value
    form.crop_focus_x = clamp(0, 100, dragStart.fx + (dx / w) * 100)
    form.crop_focus_y = clamp(0, 100, dragStart.fy + (dy / h) * 100)
  }

  function onTouchEnd() {
    isDragging.value = false
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  }

  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
}

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

      <!-- Preview with crop tool: full image + draggable rectangle -->
      <div v-if="imagePreview" class="mb-2">
        <div
          ref="cropContainer"
          class="relative inline-block overflow-hidden rounded-lg"
          :class="{ 'cursor-grab': !isDragging, 'cursor-grabbing': isDragging }"
        >
          <img
            :src="imagePreview"
            alt="Preview"
            class="block max-h-[400px] w-full rounded-lg bg-gray-100"
            style="object-fit: contain;"
            draggable="false"
            @load="onImgLoad"
            @dragstart.prevent
          />

          <!-- Crop window: represents the visible area on public EventCard -->
          <div
            v-if="imgLoaded"
            class="absolute rounded border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            :style="cropOverlayStyle"
            @mousedown.prevent="startDrag"
            @touchstart.prevent="startTouchDrag"
          >
            <!-- Corner handles (visual cue) -->
            <div class="absolute -left-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-terracotta" />
            <div class="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-terracotta" />
            <div class="absolute -bottom-1 -left-1 h-3 w-3 rounded-full border-2 border-white bg-terracotta" />
            <div class="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-terracotta" />
          </div>

          <!-- Upload progress overlay -->
          <div v-if="uploading" class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
            <span class="text-sm text-white">Subiendo...</span>
          </div>
        </div>

        <!-- Helper text + clear button -->
        <div class="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>Arrastra el recuadro para ajustar el área visible en la web</span>
          <button
            type="button"
            class="font-medium text-red-600 hover:underline"
            @click="form.imagen_url = ''; imagePreview = null"
          >
            Eliminar
          </button>
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
