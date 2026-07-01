<!--
  ConfiguracionForm — System settings form (CFG-001, CFG-002)
  Toggle cliente_elige_mesa + number input capacidad_total_local.
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'

interface ConfigData {
  cliente_elige_mesa: boolean
  capacidad_total_local: number
}

const props = defineProps<{
  currentConfig: ConfigData
}>()

const emit = defineEmits<{
  submit: [data: ConfigData]
}>()

const form = reactive<ConfigData>({
  cliente_elige_mesa: props.currentConfig.cliente_elige_mesa ?? false,
  capacidad_total_local: props.currentConfig.capacidad_total_local ?? 80,
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
