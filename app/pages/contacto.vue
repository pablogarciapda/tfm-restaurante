<script setup lang="ts">
/**
 * Contacto page — Business hours, map, contact info, and form (CO-001–CO-004)
 *
 * Hotel California mode: you can check out any time you like,
 * but you can never leave. Unless you're a frontend dev, in which
 * case you're contractually obligated to make every string configurable.
 */
import { ref, computed, onMounted } from 'vue'

const { restaurant, nombre, telefono, mapsUrl, email, poblacion } = useRestaurantConfig()

// Build maps src from restaurant address or fallback
const mapsSrc = computed(() => {
  const mapsUrlVal = mapsUrl.value || restaurant.value.maps_url
  if (mapsUrlVal) {
    const encoded = encodeURIComponent(mapsUrlVal)
    return `https://maps.google.com/maps?q=${encoded}&t=m&z=16&output=embed&iwloc=near`
  }
  const dir = restaurant.value.direccion
  if (dir) {
    const encoded = encodeURIComponent(dir)
    return `https://maps.google.com/maps?q=${encoded}&t=m&z=16&output=embed&iwloc=near`
  }
  return 'https://maps.google.com/maps?q=Espa%C3%B1a&t=m&z=10&output=embed'
})

const mapTitle = computed(() => `Mapa de ubicación de ${nombre.value || 'Restaurante'}`)

// Format horarios from public-config into readable hours
const horariosText = ref<{ days: string; hours: string }[]>([])
const establecimientoDias = ref<{ dia: string; texto: string; estado: string }[]>([])
const mostrarEstablecimiento = ref(false)
const mostrarCocina = ref(false)

onMounted(async () => {
  try {
    const publicConfig = await $fetch<any>('/api/public-config')
    if (publicConfig?.horarios) {
      const h = publicConfig.horarios
      mostrarCocina.value = h.mostrar_horario_cocina !== false
      horariosText.value = [
        {
          days: 'Comida',
          hours: `${h.comida_inicio || '—'} – ${h.comida_fin || '—'}`,
        },
        {
          days: 'Cena',
          hours: `${h.cena_inicio || '—'} – ${h.cena_fin || '—'}`,
        },
      ]
    }
    // Establishment hours
    const est = publicConfig?.establecimiento
    if (est?.dias && est.dias.length === 7) {
      mostrarEstablecimiento.value = est.mostrar_en_contacto !== false
      const nombresDias: Record<string, string> = {
        lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles',
        jueves: 'Jueves', viernes: 'Viernes', sábado: 'Sábado', domingo: 'Domingo',
      }
      establecimientoDias.value = est.dias.map((d: any) => {
        let texto = ''
        let estado = 'abierto'
        if (d.vacaciones) {
          texto = 'Vacaciones'
          estado = 'vacaciones'
        } else if (d.descanso) {
          texto = 'Descanso'
          estado = 'descanso'
        } else {
          texto = `${d.apertura || '—'} – ${d.cierre || '—'}`
        }
        return { dia: nombresDias[d.dia] || d.dia, texto, estado }
      })
    }
  } catch {
    horariosText.value = []
  }
})
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
            <div v-if="restaurant.direccion || mapsUrl">
              <span class="text-sm text-gray-500">Dirección</span>
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                {{ restaurant.direccion || '—' }}
              </a>
              <p v-else class="block text-lg font-semibold text-slate">
                {{ restaurant.direccion || '—' }}
              </p>
            </div>
            <div v-if="telefono">
              <span class="text-sm text-gray-500">Teléfono</span>
              <a
                :href="`tel:${String(telefono).replace(/\s/g, '')}`"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                {{ telefono }}
              </a>
            </div>
            <div v-if="restaurant.email">
              <span class="text-sm text-gray-500">Email</span>
              <a
                :href="`mailto:${restaurant.email}`"
                class="block text-lg font-semibold text-terracotta hover:underline"
              >
                {{ restaurant.email }}
              </a>
            </div>
          </div>

          <!-- Establishment hours (before meal hours) -->
          <section class="mb-8" v-if="mostrarEstablecimiento && establecimientoDias.length > 0">
            <h2 class="mb-4 text-xl font-bold text-slate">Horario del establecimiento</h2>
            <div class="overflow-hidden rounded-lg border border-gray-200">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="bg-cream">
                    <th class="px-4 py-2 font-medium text-slate">Día</th>
                    <th class="px-4 py-2 font-medium text-slate">Horario</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(d, i) in establecimientoDias" :key="i">
                    <td class="px-4 py-2.5 font-medium capitalize">{{ d.dia }}</td>
                    <td class="px-4 py-2.5">
                      <span v-if="d.estado === 'vacaciones'" class="font-medium text-red-600">
                        {{ d.texto }}
                      </span>
                      <span v-else-if="d.estado === 'descanso'" class="font-medium text-amber-600">
                        {{ d.texto }}
                      </span>
                      <span v-else>{{ d.texto }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Business hours (CO-001) — Meal hours -->
          <section class="mb-8" v-if="mostrarCocina && horariosText.length > 0">
            <h2 class="mb-4 text-xl font-bold text-slate">Horario de cocina</h2>
            <div class="overflow-hidden rounded-lg border border-gray-200">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="bg-cream">
                    <th class="px-4 py-2 font-medium text-slate">Turno</th>
                    <th class="px-4 py-2 font-medium text-slate">Horario</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(row, i) in horariosText" :key="i">
                    <td class="px-4 py-2.5 font-medium">{{ row.days }}</td>
                    <td class="px-4 py-2.5">{{ row.hours }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Map (CO-002) -->
          <section>
            <h2 class="mb-4 text-xl font-bold text-slate">Ubicación</h2>
            <MapEmbed
              :src="mapsSrc"
              :title="mapTitle"
              :caption="nombre ? `${nombre}, ${poblacion || ''}` : undefined"
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
