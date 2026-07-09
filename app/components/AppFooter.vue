<script setup lang="ts">
/**
 * AppFooter — Site-wide footer (PU-004)
 *
 * Renders restaurant name, address, phone, email, and social links
 * on every public page. Reads restaurant info from useRestaurantConfig
 * (multi-tenant: configurable from /cocina/configuracion).
 */

const { restaurant, direccionLineas, mapsUrl, telefono } = useRestaurantConfig()
</script>

<template>
  <footer class="bg-slate text-cream/90">
    <div class="mx-auto max-w-7xl px-4 py-12">
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Restaurant info -->
        <div>
          <h3 class="mb-3 text-lg font-bold text-white">
            {{ restaurant.nombre }}
          </h3>
          <address v-if="mapsUrl" class="not-italic leading-relaxed">
            <a
              :href="mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="transition-colors hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="me-1 inline-block h-4 w-4 align-text-bottom"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9.69 18.933l.001.001C9.89 19.11 10 19.206 10 19.206s.11-.095.31-.272l.001-.001c.214-.19.521-.469.864-.82.685-.703 1.568-1.702 2.468-2.938C15.508 13.363 18 9.62 18 7a8 8 0 00-16 0c0 2.62 2.492 6.364 4.357 8.176.9 1.236 1.783 2.235 2.468 2.938.343.35.65.63.864.82zM10 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                  clip-rule="evenodd"
                />
              </svg>
              <template v-for="(line, i) in direccionLineas" :key="i">
                {{ line }}<br v-if="i < direccionLineas.length - 1" />
              </template>
            </a>
          </address>
          <address v-else class="not-italic leading-relaxed">
            <template v-for="(line, i) in direccionLineas" :key="i">
              {{ line }}<br v-if="i < direccionLineas.length - 1" />
            </template>
          </address>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="mb-3 font-semibold text-white">Contacto</h4>
          <ul class="space-y-2">
            <li v-if="telefono">
              <a
                :href="`tel:${telefono.replace(/\s/g, '')}`"
                class="transition-colors hover:text-white"
              >
                {{ telefono }}
              </a>
            </li>
            <li>
              <a
                href="mailto:reservas@lazingara.es"
                class="transition-colors hover:text-white"
              >
                reservas@lazingara.es
              </a>
            </li>
          </ul>
        </div>

        <!-- Social links -->
        <div>
          <h4 class="mb-3 font-semibold text-white">Síguenos</h4>
          <ul class="flex gap-4">
            <li>
              <a
                href="https://www.instagram.com/restaurantelazingaraoficial"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors hover:text-white"
                aria-label="Instagram"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/RestauranteLaZingara"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors hover:text-white"
                aria-label="Facebook"
              >
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Copyright -->
      <div
        class="mt-8 border-t border-cream/20 pt-6 text-center text-sm"
      >
        &copy; {{ new Date().getFullYear() }} {{ restaurant.nombre }}
      </div>
    </div>
  </footer>
</template>
