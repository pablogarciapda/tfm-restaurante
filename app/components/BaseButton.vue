<script setup lang="ts">
import { computed } from 'vue'

/**
 * BaseButton — Reusable button component (PU-005)
 *
 * Variants: primary (terracotta bg), secondary (outlined), ghost (transparent)
 * Sizes: sm, md, lg
 * Disabled: blocks click emit, sets aria-disabled
 *
 * Spanish-safe: no hardcoded strings; content via default slot.
 */

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  if (props.disabled) return
  emit('click', event)
}

const variantClasses = computed(() => {
  const map: Record<string, string> = {
    primary:
      'bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta',
    secondary:
      'border-2 border-terracotta text-terracotta hover:bg-terracotta/10 focus-visible:ring-terracotta',
    ghost:
      'text-terracotta hover:bg-terracotta/10 focus-visible:ring-terracotta',
  }
  return map[props.variant]
})

const sizeClasses = computed(() => {
  const map: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  }
  return map[props.size]
})
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      variantClasses,
      sizeClasses,
      { 'cursor-not-allowed opacity-60': disabled },
    ]"
    :disabled="disabled"
    :aria-disabled="disabled"
    v-bind="$attrs"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
