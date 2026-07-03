<script setup lang="ts">
/**
 * AppFooter — Site-wide footer (PU-004)
 *
 * Renders restaurant name, address, phone, email, and social links
 * on every public page. Spanish content per project language policy.
 */
</script>

<template>
  <footer class="bg-slate text-cream/90">
    <div class="mx-auto max-w-7xl px-4 py-12">
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Restaurant info -->
        <div>
          <h3 class="mb-3 text-lg font-bold text-white">
            Restaurante La Zíngara
          </h3>
          <address class="not-italic leading-relaxed">
            <a
              href="https://maps.app.goo.gl/56uxryZVZkS3pKTMA"
              target="_blank"
              rel="noopener noreferrer"
              class="transition-colors hover:text-white"
            >
              Avda. del Páramo, 11<br />
              24240 Santa María del Páramo<br />
              León, España
            </a>
          </address>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="mb-3 font-semibold text-white">Contacto</h4>
          <ul class="space-y-2">
            <li>
              <a
                href="tel:+34987350350"
                class="transition-colors hover:text-white"
              >
                987 350 350
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
        &copy; {{ new Date().getFullYear() }} Restaurante La Zíngara
      </div>
    </div>
  </footer>
</template>
