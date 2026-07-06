<!--
  ConfiguracionForm — System settings form (CFG-001, CFG-002)
  Toggle cliente_elige_mesa + number input capacidad_total_local.
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'

type OcupacionModo = 'auto' | 'manual'

interface ConfigData {
  cliente_elige_mesa: boolean
  capacidad_total_local: number
  precio_menu_diario: number | null
  precio_menu_sabado: number | null
  modo_ocupacion: OcupacionModo
  ocupacion_manual: number
}

const props = defineProps<{
  currentConfig: Partial<ConfigData> & {
    cliente_elige_mesa?: boolean
    capacidad_total_local?: number
    precio_menu_diario?: number | null
    precio_menu_sabado?: number | null
  }
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
})

const errors = ref<Record<string, string>>({})

function validate(): boolean {
  const e: Record<string, string> = {}
  if (form.capacidad_total_local < 1) {
    e.capacidad_total_local = 'La capacidad debe ser al menos 1'
  }
  if (form.capacidad_total_local > 999) {
    e.capacidad_total_local = 'La capacidad máxima es 999'
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

    <div class="pt-4">
      <button
        type="submit"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
      >
        Guardar configuración
      </button>
    </div>
  </form>
</template>
