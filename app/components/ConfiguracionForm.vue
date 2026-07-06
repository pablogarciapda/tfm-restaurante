<!--
  ConfiguracionForm — System settings form (CFG-001, CFG-002)
  Toggle cliente_elige_mesa + number input capacidad_total_local.
-->
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

type OcupacionModo = 'auto' | 'manual'

interface ConfigData {
  cliente_elige_mesa: boolean
  capacidad_total_local: number
  precio_menu_diario: number | null
  precio_menu_sabado: number | null
  modo_ocupacion: OcupacionModo
  ocupacion_manual: number
  mostrar_recomendados: boolean
  titulo_recomendados: string
  // Image optimization
  max_ancho_imagen: number
  calidad_imagen: number
  max_peso_imagen: number
  auto_comprimir_imagen: boolean
}

const props = defineProps<{
  currentConfig: Partial<ConfigData> & {
    cliente_elige_mesa?: boolean
    capacidad_total_local?: number
    precio_menu_diario?: number | null
    precio_menu_sabado?: number | null
    mostrar_recomendados?: boolean
    titulo_recomendados?: string
    max_ancho_imagen?: number
    calidad_imagen?: number
    max_peso_imagen?: number
    auto_comprimir_imagen?: boolean
  }
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ConfigData]
}>()

const form = reactive<ConfigData>({
  cliente_elige_mesa: props.currentConfig.cliente_elige_mesa ?? false,
  capacidad_total_local: props.currentConfig.capacidad_total_local ?? 80,
  precio_menu_diario: props.currentConfig.precio_menu_diario ?? null,
  precio_menu_sabado: props.currentConfig.precio_menu_sabado ?? null,
  modo_ocupacion: props.currentConfig.modo_ocupacion ?? 'auto',
  ocupacion_manual: props.currentConfig.ocupacion_manual ?? 0,
  mostrar_recomendados: props.currentConfig.mostrar_recomendados ?? true,
  titulo_recomendados: props.currentConfig.titulo_recomendados ?? 'NUESTRAS RECOMENDACIONES',
  // Image optimization defaults
  max_ancho_imagen: props.currentConfig.max_ancho_imagen ?? 1200,
  calidad_imagen: props.currentConfig.calidad_imagen ?? 80,
  max_peso_imagen: props.currentConfig.max_peso_imagen ?? 5,
  auto_comprimir_imagen: props.currentConfig.auto_comprimir_imagen ?? true,
})

// Sync form when config loads asynchronously from DB
watch(
  () => props.currentConfig,
  (cfg) => {
    if (cfg.cliente_elige_mesa !== undefined) form.cliente_elige_mesa = cfg.cliente_elige_mesa
    if (cfg.capacidad_total_local !== undefined) form.capacidad_total_local = cfg.capacidad_total_local
    if (cfg.precio_menu_diario !== undefined) form.precio_menu_diario = cfg.precio_menu_diario
    if (cfg.precio_menu_sabado !== undefined) form.precio_menu_sabado = cfg.precio_menu_sabado
    if (cfg.modo_ocupacion !== undefined) form.modo_ocupacion = cfg.modo_ocupacion
    if (cfg.ocupacion_manual !== undefined) form.ocupacion_manual = cfg.ocupacion_manual
    if (cfg.mostrar_recomendados !== undefined) form.mostrar_recomendados = cfg.mostrar_recomendados
    if (cfg.titulo_recomendados !== undefined) form.titulo_recomendados = cfg.titulo_recomendados
    if (cfg.max_ancho_imagen !== undefined) form.max_ancho_imagen = cfg.max_ancho_imagen
    if (cfg.calidad_imagen !== undefined) form.calidad_imagen = cfg.calidad_imagen
    if (cfg.max_peso_imagen !== undefined) form.max_peso_imagen = cfg.max_peso_imagen
    if (cfg.auto_comprimir_imagen !== undefined) form.auto_comprimir_imagen = cfg.auto_comprimir_imagen
  },
  { deep: true },
)



const errors = ref<Record<string, string>>({})

function validate(): boolean {
  const e: Record<string, string> = {}
  if (form.capacidad_total_local < 1) {
    e.capacidad_total_local = 'La capacidad debe ser al menos 1'
  }
  if (form.capacidad_total_local > 999) {
    e.capacidad_total_local = 'La capacidad máxima es 999'
  }
  if (form.max_ancho_imagen < 200 || form.max_ancho_imagen > 4096) {
    e.max_ancho_imagen = 'El ancho máximo debe estar entre 200 y 4096px'
  }
  if (form.calidad_imagen < 10 || form.calidad_imagen > 100) {
    e.calidad_imagen = 'La calidad debe estar entre 10 y 100'
  }
  if (form.max_peso_imagen < 1 || form.max_peso_imagen > 20) {
    e.max_peso_imagen = 'El peso máximo debe estar entre 1 y 20MB'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-6 rounded-lg bg-white p-6 shadow" @submit.prevent="handleSubmit">
    <h2 class="text-xl font-bold text-slate">Configuración del sistema</h2>

    <!-- cliente_elige_mesa -->
    <div class="flex items-center gap-3">
      <input
        id="cfg-elige-mesa"
        v-model="form.cliente_elige_mesa"
        data-testid="cfg-elige-mesa"
        type="checkbox"
        class="h-4 w-4 rounded"
      />
      <label class="text-sm font-medium text-slate" for="cfg-elige-mesa">
        Permitir que el cliente elija mesa
      </label>
    </div>

    <!-- capacidad_total_local -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-capacidad">
        Capacidad total del local
      </label>
      <input
        id="cfg-capacidad"
        v-model.number="form.capacidad_total_local"
        data-testid="cfg-capacidad"
        type="number"
        min="1"
        max="999"
        class="w-32 rounded-lg border px-3 py-2"
        :class="errors.capacidad_total_local ? 'border-red-500' : 'border-gray-300'"
      />
      <p v-if="errors.capacidad_total_local" class="mt-1 text-sm text-red-600">
        {{ errors.capacidad_total_local }}
      </p>
    </div>

    <!-- precio_menu_diario -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-precio-diario">
        Precio Menú Diario (€)
      </label>
      <input
        id="cfg-precio-diario"
        v-model.number="form.precio_menu_diario"
        data-testid="cfg-precio-diario"
        type="number"
        step="0.01"
        min="0"
        class="w-32 rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- precio_menu_sabado -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-precio-sabado">
        Precio Menú Sábado (€)
      </label>
      <input
        id="cfg-precio-sabado"
        v-model.number="form.precio_menu_sabado"
        data-testid="cfg-precio-sabado"
        type="number"
        step="0.01"
        min="0"
        class="w-32 rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <!-- modo_ocupacion -->
    <div>
      <span class="mb-1 block text-sm font-medium text-slate">Modo de ocupación</span>
      <div class="flex gap-4">
        <label class="flex items-center gap-1 cursor-pointer">
          <input
            v-model="form.modo_ocupacion"
            type="radio"
            value="auto"
            class="h-3 w-3 accent-terracotta"
          />
          <span class="text-sm text-slate">Automático</span>
        </label>
        <label class="flex items-center gap-1 cursor-pointer">
          <input
            v-model="form.modo_ocupacion"
            type="radio"
            value="manual"
            class="h-3 w-3 accent-terracotta"
          />
          <span class="text-sm text-slate">Manual</span>
        </label>
      </div>
    </div>

    <!-- mostrar_recomendados -->
    <div class="flex items-center gap-3">
      <input
        id="cfg-mostrar-rec"
        v-model="form.mostrar_recomendados"
        type="checkbox"
        class="h-4 w-4 rounded"
      />
      <label class="text-sm font-medium text-slate" for="cfg-mostrar-rec">
        Mostrar "{{ form.titulo_recomendados || 'NUESTRAS RECOMENDACIONES' }}{{ form.mostrar_recomendados ? '' : ' (oculto)' }}" en la carta
      </label>
    </div>

    <!-- titulo_recomendados -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-titulo-rec">
        Título de la sección de recomendados
      </label>
      <input
        id="cfg-titulo-rec"
        v-model="form.titulo_recomendados"
        type="text"
        class="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        placeholder="Nuestras Recomendaciones"
      />
      <p class="mt-1 text-xs text-gray-400">
        Se mostrará como categoría especial con los platos marcados como recomendado.
      </p>
    </div>

    <!-- ocupacion_manual -->
    <div v-if="form.modo_ocupacion === 'manual'">
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-ocupacion-manual">
        Ocupación manual
      </label>
      <input
        id="cfg-ocupacion-manual"
        v-model.number="form.ocupacion_manual"
        data-testid="cfg-ocupacion-manual"
        type="number"
        min="0"
        class="w-32 rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>

    <hr class="border-gray-200" />

    <!-- === Image optimization section === -->
    <h3 class="text-lg font-bold text-slate">Optimización de imágenes</h3>
    <p class="text-xs text-gray-400">
      Las imágenes de platos se redimensionan y comprimen automáticamente al subirse.
      Ajusta estos valores según necesites.
    </p>

    <!-- auto_comprimir_imagen -->
    <div class="flex items-center gap-3">
      <input
        id="cfg-auto-comprimir"
        v-model="form.auto_comprimir_imagen"
        type="checkbox"
        class="h-4 w-4 rounded"
      />
      <label class="text-sm font-medium text-slate" for="cfg-auto-comprimir">
        Comprimir imágenes automáticamente al subir
      </label>
    </div>

    <!-- max_ancho_imagen -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-max-ancho">
        Ancho máximo (px)
      </label>
      <input
        id="cfg-max-ancho"
        v-model.number="form.max_ancho_imagen"
        data-testid="cfg-max-ancho"
        type="number"
        min="200"
        max="4096"
        class="w-32 rounded-lg border px-3 py-2"
        :class="errors.max_ancho_imagen ? 'border-red-500' : 'border-gray-300'"
      />
      <p class="mt-1 text-xs text-gray-400">
        Las imágenes más anchas se redimensionan manteniendo aspecto. Recomendado: 1200px.
      </p>
      <p v-if="errors.max_ancho_imagen" class="mt-1 text-sm text-red-600">
        {{ errors.max_ancho_imagen }}
      </p>
    </div>

    <!-- calidad_imagen -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-calidad">
        Calidad de compresión (1–100)
      </label>
      <input
        id="cfg-calidad"
        v-model.number="form.calidad_imagen"
        data-testid="cfg-calidad"
        type="number"
        min="10"
        max="100"
        class="w-32 rounded-lg border px-3 py-2"
        :class="errors.calidad_imagen ? 'border-red-500' : 'border-gray-300'"
      />
      <p class="mt-1 text-xs text-gray-400">
        80 = buena calidad con peso reducido. 100 = máxima calidad, mayor peso.
      </p>
      <p v-if="errors.calidad_imagen" class="mt-1 text-sm text-red-600">
        {{ errors.calidad_imagen }}
      </p>
    </div>

    <!-- max_peso_imagen -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate" for="cfg-max-peso">
        Peso máximo por imagen (MB)
      </label>
      <input
        id="cfg-max-peso"
        v-model.number="form.max_peso_imagen"
        data-testid="cfg-max-peso"
        type="number"
        min="1"
        max="20"
        class="w-32 rounded-lg border px-3 py-2"
        :class="errors.max_peso_imagen ? 'border-red-500' : 'border-gray-300'"
      />
      <p class="mt-1 text-xs text-gray-400">
        Se rechazan imágenes que superen este tamaño. Recomendado: 5MB.
      </p>
      <p v-if="errors.max_peso_imagen" class="mt-1 text-sm text-red-600">
        {{ errors.max_peso_imagen }}
      </p>
    </div>

    <div class="pt-4">
      <button
        type="submit"
        :disabled="saving"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
      >
        {{ saving ? 'Guardando...' : 'Guardar configuración' }}
      </button>
    </div>
  </form>
</template>
