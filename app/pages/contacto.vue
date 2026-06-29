<script setup lang="ts">
/**
 * Contacto page — Business hours, map, contact info, and form (CO-001–CO-004)
 */
</script>

<template>
  <div class="min-h-screen">
    <PageHero title="Contacto" subtitle="Estamos aquí para atenderte" />

    <div class="mx-auto max-w-7xl px-4 py-12">
      <div class="grid gap-12 lg:grid-cols-2">
        <!-- Left: Info + Map -->
        <div>
          <!-- Contact details -->
          <div class="mb-8 space-y-4">
            <div>
              <span class="text-sm text-gray-500">Teléfono</span>
              <a
                href="tel:+34987654321"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                +34 987 654 321
              </a>
            </div>
            <div>
              <span class="text-sm text-gray-500">Email</span>
              <a
                href="mailto:info@lazingara.es"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                info@lazingara.es
              </a>
            </div>
          </div>

          <!-- Business hours (CO-001) -->
          <section class="mb-8">
            <h2 class="mb-4 text-xl font-bold text-slate">Horario</h2>
            <div class="overflow-hidden rounded-lg border border-gray-200">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="bg-cream">
                    <th class="px-4 py-2 font-medium text-slate">Día</th>
                    <th class="px-4 py-2 font-medium text-slate">Horario</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr>
                    <td class="px-4 py-2.5 font-medium">Lunes a Jueves</td>
                    <td class="px-4 py-2.5">13:00–16:00 y 20:00–23:00</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium">Viernes y Sábado</td>
                    <td class="px-4 py-2.5">13:00–16:00 y 20:00–23:30</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium">Domingo</td>
                    <td class="px-4 py-2.5">13:00–16:00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Map (CO-002) -->
          <section>
            <h2 class="mb-4 text-xl font-bold text-slate">Ubicación</h2>
            <MapEmbed
              src="https://www.openstreetmap.org/export/embed.html?bbox=-5.8300%2C42.3500%2C-5.8100%2C42.3700&amp;layer=mapnik"
              title="Mapa de ubicación de La Zíngara"
            />
          </section>
        </div>

        <!-- Right: Contact Form (CO-004) -->
        <div>
          <h2 class="mb-4 text-xl font-bold text-slate">Envíanos un mensaje</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  </div>
</template>
