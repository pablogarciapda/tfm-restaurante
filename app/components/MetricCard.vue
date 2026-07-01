<!--
  MetricCard — Simple metric display card (DASH-001)

  Props: label (string), value (number|string), loading (boolean), icon (optional string)
-->
<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  loading: boolean
  icon?: string
}>()
</script>

<template>
  <div class="rounded-lg bg-white p-6 shadow-sm">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate/60">{{ label }}</p>
        <p
          v-if="!loading"
          class="mt-2 font-serif text-3xl font-bold text-terracotta"
          data-testid="metric-value"
        >
          {{ value }}
        </p>
        <div
          v-else
          data-testid="metric-loading"
          class="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200"
        />
      </div>
      <span v-if="icon && !loading" class="text-2xl">{{ icon }}</span>
    </div>
  </div>
</template>
