<template>
  <Teleport to="body">
    <div
      v-if="showAlert"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div class="text-center">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-slate">Saldo de SMS bajo</h2>
          <p class="mt-2 text-sm text-gray-500">
            Solo quedan <strong class="text-red-600">{{ balance }}</strong> SMS en la cuenta.
            <br />
            Contacta con LabsMobile para recargar antes de quedarte sin crédito.
          </p>
          <button
            class="mt-5 w-full rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta/90"
            @click="dismiss"
          >
            Aceptar — Informaré al personal
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showAlert = ref(false)
const balance = ref(0)
const dismissed = ref(false)

async function loadBalance() {
  if (dismissed.value) return
  try {
    const data = await $fetch<{ credits: number }>('/api/labsmobile/balance')
    balance.value = data.credits
    if (data.credits >= 0 && data.credits <= 15) {
      showAlert.value = true
    }
  } catch {
    // Silently fail — no alert if we can't fetch
  }
}

function dismiss() {
  showAlert.value = false
  // Store dismissal in session so it doesn't reappear on page navigation
  dismissed.value = true
}

onMounted(() => {
  loadBalance()
})
</script>
