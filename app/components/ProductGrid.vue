<script setup lang="ts">
/**
 * ProductGrid — Responsive grid of ProductCards grouped by category (CN-003, CN-005, CN-006)
 *
 * Responsive CSS Grid: 1 col <640px, 2 cols 640-1023px, 3 cols 1024-1279px, 4 cols >=1280px.
 * Empty-precio platos ("— CARNES —") render as SectionDivider, NOT ProductCard.
 * Categories sorted by puesto.
 */

defineProps<{
  categories: {
    id: string
    categoria: string
    puesto: number
    open: boolean
    platos: {
      plato: string
      precio: string
      stock: string
      descripcion?: string
      imagen_url?: string
      alergenos?: string[]
      calorias?: number
      subcategoria?: string
    }[]
  }[]
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <div v-for="cat in categories" :key="cat.id" class="mb-12">
      <!-- Category header -->
      <h2 class="mb-6 text-2xl font-bold text-slate">
        {{ cat.categoria }}
      </h2>

      <!-- Product grid -->
      <div
        data-testid="product-grid"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <template v-for="plato in cat.platos" :key="plato.plato">
          <!-- Divider: empty precio → SectionDivider (takes full width) -->
          <SectionDivider
            v-if="plato.precio.trim() === ''"
            :label="plato.plato"
            class="col-span-full"
          />
          <!-- Normal dish: ProductCard -->
          <ProductCard v-else :plato="plato" />
        </template>
      </div>
    </div>
  </div>
</template>
