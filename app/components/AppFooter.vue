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
            Santa María del Páramo<br />
            León, España
          </address>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="mb-3 font-semibold text-white">Contacto</h4>
          <ul class="space-y-2">
            <li>
              <a
                href="tel:+34987654321"
                class="transition-colors hover:text-white"
              >
                +34 987 654 321
              </a>
            </li>
            <li>
              <a
                href="mailto:info@lazingara.es"
                class="transition-colors hover:text-white"
              >
                info@lazingara.es
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
                href="https://www.instagram.com"
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
                href="https://www.facebook.com"
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
