<script setup lang="ts">
/**
 * GdprConsentModal — GDPR consent overlay (GDPR-001)
 *
 * Full-screen modal with scrollable GDPR text.
 * "Aceptar" button disabled until user scrolls to bottom (50px threshold).
 * "Rechazar" button always enabled → returns user to form.
 */
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
  text: string
  sending?: boolean
}>()

const emit = defineEmits<{
  accept: []
  reject: []
}>()

const scrolledToBottom = ref(false)

function handleScroll(event: Event) {
  const el = event.target as HTMLElement
  const threshold = 50
  scrolledToBottom.value =
    el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
}
</script>

<template>
  <div
    v-if="show"
    data-testid="gdpr-modal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  >
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-xl font-bold text-slate">Protección de datos</h2>

      <div
        data-testid="gdpr-scroll-container"
        class="mb-4 max-h-64 overflow-y-auto rounded border border-gray-200 p-4 text-sm text-slate"
        @scroll="handleScroll"
      >
        <p style="white-space: pre-wrap">{{ text }}</p>
      </div>

      <p
        v-if="!scrolledToBottom"
        class="mb-4 text-xs text-gray-500"
      >
        Debes leer el texto completo para poder aceptar.
      </p>

      <div class="flex gap-3">
        <button
          data-testid="gdpr-accept"
          type="button"
          :disabled="!scrolledToBottom || sending"
          class="flex-1 rounded-lg bg-terracotta px-4 py-2 font-medium text-white transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('accept')"
        >
          {{ sending ? 'Enviando…' : 'Aceptar' }}
        </button>
        <button
          data-testid="gdpr-reject"
          type="button"
          class="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-slate transition-colors hover:bg-gray-100"
          @click="emit('reject')"
        >
          Rechazar
        </button>
      </div>
    </div>
  </div>
</template>
