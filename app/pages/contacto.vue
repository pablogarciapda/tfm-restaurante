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
              <span class="text-sm text-gray-500">Dirección</span>
              <a
                href="https://maps.app.goo.gl/56uxryZVZkS3pKTMA"
                target="_blank"
                rel="noopener noreferrer"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                Avda. del Páramo, 11<br />
                <span class="text-base font-normal">24240 Santa María del Páramo, León</span>
              </a>
            </div>
            <div>
              <span class="text-sm text-gray-500">Teléfono</span>
              <a
                href="tel:+34987350350"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                987 350 350
              </a>
            </div>
            <div>
              <span class="text-sm text-gray-500">Email</span>
              <a
                href="mailto:reservas@lazingara.es"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                reservas@lazingara.es
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
                    <td class="px-4 py-2.5">09:00–00:00</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium">Viernes a Domingo</td>
                    <td class="px-4 py-2.5">09:00–02:00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Map (CO-002) -->
          <section>
            <h2 class="mb-4 text-xl font-bold text-slate">Ubicación</h2>
            <MapEmbed
              src="https://maps.google.com/maps?q=Avda.+del+P%C3%A1ramo%2C+11%2C+24240+Santa+Mar%C3%ADa+del+P%C3%A1ramo%2C+Le%C3%B3n%2C+Espa%C3%B1a&amp;t=m&amp;z=16&amp;output=embed&amp;iwloc=near"
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
