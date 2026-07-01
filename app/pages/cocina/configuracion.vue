<!--
  Configuracion Admin — System settings (CFG-001–CFG-003)
  Admin-only via permissions middleware.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth', 'role', 'permissions'],
  layout: 'cocina',
})

const client = useSupabaseClient()

interface ConfigData {
  id?: string
  cliente_elige_mesa: boolean
  capacidad_total_local: number
}

const config = ref<ConfigData>({
  cliente_elige_mesa: false,
  capacidad_total_local: 80,
})

async function loadConfig() {
  const { data } = await client.from('configuracion').select('*').limit(1).single()
  if (data) {
    config.value = data as ConfigData
  }
}

async function handleSubmit(formData: ConfigData) {
  if (config.value.id) {
    await client.from('configuracion').update(formData).eq('id', config.value.id)
  } else {
    await client.from('configuracion').insert(formData)
  }
  await loadConfig()
}

onMounted(() => loadConfig())
</script>

<template>
  <div>
    <ConfiguracionForm :current-config="config" @submit="handleSubmit" />
  </div>
</template>
