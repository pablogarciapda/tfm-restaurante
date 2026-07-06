<!--
  PlatoForm — Create/edit plato form (CRUD-002)
  Spanish labels, inline validation. Emits submit with form data.
  Image: supports file upload (with mobile camera) + URL paste → auto-download to Supabase Storage.
-->
<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from 'vue'
import type { ImageUploadOptions } from '~/composables/useImageUpload'

// Explicit import for test compatibility (unit tests don't auto-import composables)
import { useImageUpload } from '~/composables/useImageUpload'
import { toProxyUrl } from '~/utils/image-url'

interface PlatoFormData {
  nombre: string
  descripcion: string
  precio: number | null
  categoria: string
  tipo_menu: string
  imagen_url: string
  disponible: boolean
  calorias: number | null
  alergenos: string
  puesto: number | null
  recomendado: boolean
}

interface Category {
  id: string
  nombre: string
  puesto: number
}

const props = defineProps<{
  initialPlato?: Record<string, unknown> | null
  categories?: Category[]
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const isEdit = computed(() => !!props.initialPlato)

const sortedCategories = computed(() =>
  [...(props.categories ?? [])].sort((a, b) => a.puesto - b.puesto)
)

const form = reactive<PlatoFormData>({
  nombre: (props.initialPlato?.nombre as string) ?? '',
  descripcion: (props.initialPlato?.descripcion as string) ?? '',
  precio: (props.initialPlato?.precio as number) ?? null,
  categoria: (props.initialPlato?.categoria as string) ?? '',
  tipo_menu: (props.initialPlato?.tipo_menu as string) ?? 'carta',
  imagen_url: (props.initialPlato?.imagen_url as string) ?? '',
  disponible: (props.initialPlato?.disponible as boolean) ?? true,
  calorias: (props.initialPlato?.calorias as number) ?? null,
  alergenos: (props.initialPlato?.alergenos as string[])?.join(', ') ?? '',
  puesto: (props.initialPlato?.puesto as number) ?? null,
  recomendado: (props.initialPlato?.recomendado as boolean) ?? false,
})

const errors = ref<Record<string, string>>({})
const imagePreview = ref<string | null>(
  toProxyUrl(props.initialPlato?.imagen_url as string | null | undefined) ?? null,
)

// Load image optimization config from DB (reactive ref — useImageUpload picks up changes)
const uploadOpts = ref<ImageUploadOptions>({})
const { uploading, uploadError, uploadFromFile, uploadFromUrl } = useImageUpload(uploadOpts)

onMounted(async () => {
  try {
    const client = useSupabaseClient()
    const { data } = await client.from('configuracion').select(
      'max_ancho_imagen, calidad_imagen, max_peso_imagen, auto_comprimir_imagen'
    ).limit(1).single()
    if (data) {
      uploadOpts.value = {
        maxWidth: data.max_ancho_imagen,
        quality: data.calidad_imagen / 100,
        maxSizeMB: data.max_peso_imagen,
        autoCompress: data.auto_comprimir_imagen,
      }
    }
  } catch {
    // Keep defaults (1200px, 80 quality, 5MB, auto-compress on)
  }
})

/**
 * When a URL is pasted/changed, auto-download it to storage
 */
const urlInputTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const autoUploading = ref(false)

watch(
  () => form.imagen_url,
  async (newUrl) => {
    if (!newUrl || newUrl.startsWith(supabaseUrl())) return

    // Debounce: wait until user stops typing
    if (urlInputTimeout.value) clearTimeout(urlInputTimeout.value)
    urlInputTimeout.value = setTimeout(async () => {
      autoUploading.value = true
      const storedUrl = await uploadFromUrl(newUrl)
      autoUploading.value = false
      if (storedUrl) {
        form.imagen_url = storedUrl
        imagePreview.value = storedUrl
      }
    }, 800)
  },
)

function supabaseUrl(): string {
  const client = useSupabaseClient()
  // Extract base URL from storage
  try {
    return 'https://sqtzcjcyciatagakmmcf.supabase.co'
  } catch {
    return ''
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  imagePreview.value = URL.createObjectURL(file)
  const storedUrl = await uploadFromFile(file)
  if (storedUrl) {
    form.imagen_url = storedUrl
    imagePreview.value = storedUrl
  }
  // Reset input so same file can be re-uploaded
  target.value = ''
}

function removeImage() {
  form.imagen_url = ''
  imagePreview.value = null
}

function validate(): boolean {
  const e: Record<string, string> = {}

  if (!form.nombre.trim()) {
    e.nombre = 'El nombre es obligatorio'
  }
  if (form.precio !== null && form.precio <= 0) {
    e.precio = 'El precio debe ser mayor que 0'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return

  emit('submit', {
    ...form,
    alergenos: form.alergenos
      ? form.alergenos.split(',').map((a) => a.trim()).filter(Boolean)
      : [],
    precio: form.precio ?? 0,
    calorias: form.calorias ?? 0,
    puesto: form.puesto ?? 0,
  })
}

const TIPO_MENU_OPTIONS = ['carta', 'menu_diario', 'ambos']
</script>

<template>
  <form
    class="space-y-4 rounded-lg bg-white p-6 shadow"
    @submit.prevent="handleSubmit"
  >
    <h2 class="text-xl font-bold text-slate">
      {{ isEdit ? 'Editar plato' : 'Nuevo plato' }}
    </h2>

    <!-- Nombre -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-nombre">Nombre *</label>
      <input
        id="plato-nombre"
        v-model="form.nombre"
        data-testid="plato-nombre"
        type="text"
        class="w-full rounded-lg border px-3 py-2"
        :class="errors.nombre ? 'border-red-500' : 'border-gray-300'"
        placeholder="Ej: Paella Valenciana"
      />
      <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
    </div>

    <!-- Descripcion -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-descripcion">Descripción</label>
      <textarea
        id="plato-descripcion"
        v-model="form.descripcion"
        data-testid="plato-descripcion"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        rows="3"
        placeholder="Descripción del plato..."
      />
    </div>

    <!-- Precio -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-precio">Precio (€) *</label>
      <input
        id="plato-precio"
        v-model.number="form.precio"
        data-testid="plato-precio"
        type="number"
        step="0.01"
        min="0"
        class="w-full rounded-lg border px-3 py-2"
        :class="errors.precio ? 'border-red-500' : 'border-gray-300'"
        placeholder="9.50"
      />
      <p v-if="errors.precio" class="mt-1 text-sm text-red-600">{{ errors.precio }}</p>
    </div>

    <!-- Categoria -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-categoria">Categoría *</label>
      <select
        id="plato-categoria"
        v-model="form.categoria"
        data-testid="plato-categoria"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option value="">Seleccionar categoría</option>
        <option
          v-for="cat in sortedCategories"
          :key="cat.id"
          :value="cat.nombre"
        >
          {{ cat.nombre }}
        </option>
      </select>
    </div>

    <!-- Tipo de menu -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-tipo">Tipo de menú</label>
      <select
        id="plato-tipo"
        v-model="form.tipo_menu"
        data-testid="plato-tipo"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option v-for="opt in TIPO_MENU_OPTIONS" :key="opt" :value="opt">
          {{ opt === 'carta' ? 'Carta' : opt === 'menu_diario' ? 'Menú Diario' : 'Ambos' }}
        </option>
      </select>
    </div>

    <!-- Imagen: URL + File upload -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate">Imagen</label>

      <!-- URL input -->
      <div class="relative">
        <input
          v-model="form.imagen_url"
          data-testid="plato-imagen"
          type="text"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm"
          placeholder="https://... o selecciona archivo abajo"
        />
        <span
          v-if="autoUploading || uploading"
          class="absolute right-3 top-2.5 text-xs text-terracotta animate-pulse"
        >
          Subiendo...
        </span>
      </div>
      <p v-if="uploadError" class="mt-1 text-sm text-red-600">{{ uploadError }}</p>
      <p class="mt-1 text-xs text-gray-400">
        Pega una URL o sube un archivo. Las URLs externas se descargan y optimizan automáticamente.
      </p>

      <!-- File upload + camera -->
      <div class="mt-2 flex items-center gap-3">
        <label
          class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          📁 {{ isEdit ? 'Cambiar imagen' : 'Subir imagen' }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            capture="environment"
            class="hidden"
            @change="handleFileUpload"
          />
        </label>

        <!-- Mobile camera quick access -->
        <label
          class="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          📸 Hacer foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            @change="handleFileUpload"
          />
        </label>

        <button
          v-if="form.imagen_url"
          type="button"
          class="text-sm text-red-600 hover:text-red-800"
          @click="removeImage"
        >
          Quitar imagen
        </button>
      </div>

      <!-- Image preview -->
      <div v-if="imagePreview" class="mt-3">
        <img
          :src="imagePreview"
          alt="Previsualización"
          class="h-32 w-48 rounded-lg border object-cover"
        />
      </div>
    </div>

    <!-- Disponible -->
    <div class="flex items-center gap-2">
      <input
        id="plato-disponible"
        v-model="form.disponible"
        data-testid="plato-disponible"
        type="checkbox"
        class="h-4 w-4 rounded"
      />
      <label class="text-sm font-medium text-slate" for="plato-disponible">Disponible</label>
    </div>

    <!-- Recomendado -->
    <div class="flex items-center gap-2">
      <input
        id="plato-recomendado"
        v-model="form.recomendado"
        data-testid="plato-recomendado"
        type="checkbox"
        class="h-4 w-4 rounded"
      />
      <label class="text-sm font-medium text-slate" for="plato-recomendado">Recomendado</label>
    </div>

    <!-- Calorias -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-calorias">Calorías</label>
      <input
        id="plato-calorias"
        v-model.number="form.calorias"
        data-testid="plato-calorias"
        type="number"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- Alergenos -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-alergenos">Alérgenos (separados por coma)</label>
      <input
        id="plato-alergenos"
        v-model="form.alergenos"
        data-testid="plato-alergenos"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        placeholder="Gluten, Lácteos, Frutos secos"
      />
    </div>

    <!-- Puesto -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="plato-puesto">Orden (puesto)</label>
      <input
        id="plato-puesto"
        v-model.number="form.puesto"
        data-testid="plato-puesto"
        type="number"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4">
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="uploading || autoUploading"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
      >
        {{ uploading || autoUploading ? 'Subiendo imagen...' : isEdit ? 'Guardar cambios' : 'Crear plato' }}
      </button>
    </div>
  </form>
</template>
