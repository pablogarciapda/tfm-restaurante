<!--
  ConfiguracionForm — System settings form with 11 sections (CFG-011, CFG-012, CFG-013, CFG-014)
  Sections: General, Elección mesa, Precios, Recomendados, Imágenes,
            Correo saliente, Protección datos, Reservas,
            Horarios, Zonas del restaurante, Días bloqueados
-->
<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { generateSlots } from '#shared/utils/slots'

type OcupacionModo = 'auto' | 'manual'
type ReservaModo = 'automatica' | 'verificada'
type ClienteEligeZona = 'none' | 'zona' | 'zona_mesa'

interface ZoneConfigForm {
  id: string
  nombre: string
  capacidad: number
  enabled: boolean
}

interface HorarioConfigForm {
  comida_inicio: string
  comida_fin: string
  cena_inicio: string
  cena_fin: string
  intervalo_minutos: number
}

interface DiaBloqueadoForm {
  id: string
  fecha: string
  recurrente: boolean
  fecha_fin: string | null
  motivo: string | null
}

interface ConfigFormData {
  cliente_elige_mesa: boolean
  capacidad_total_local: number
  precio_menu_diario: number | null
  precio_menu_sabado: number | null
  modo_ocupacion: OcupacionModo
  ocupacion_manual: number
  mostrar_recomendados: boolean
  titulo_recomendados: string
  max_ancho_imagen: number
  calidad_imagen: number
  max_peso_imagen: number
  auto_comprimir_imagen: boolean
  smtp_host: string
  smtp_port: number | null
  smtp_user: string
  smtp_from_email: string
  smtp_security: string
  smtp_password: string
  texto_proteccion_datos: string
  modo_reserva: ReservaModo
  horarios_config: HorarioConfigForm
  zonas_config: ZoneConfigForm[]
  cliente_elige_zona: ClienteEligeZona
  captcha_habilitado: boolean
}

const props = defineProps<{
  currentConfig: Partial<ConfigFormData>
  saving?: boolean
  smtpTesting?: boolean
  // Dias bloqueados managed via separate API; passed as read-only list
  existingDiasBloqueados?: DiaBloqueadoForm[]
}>()

const emit = defineEmits<{
  submit: [data: ConfigFormData]
  smtpTest: [toEmail: string]
  addDiaBloqueado: [data: { fecha: string; recurrente: boolean; fecha_fin: string | null; motivo: string | null }]
  deleteDiaBloqueado: [id: string]
}>()

const form = reactive<ConfigFormData>({
  cliente_elige_mesa: props.currentConfig.cliente_elige_mesa ?? false,
  capacidad_total_local: props.currentConfig.capacidad_total_local ?? 80,
  precio_menu_diario: props.currentConfig.precio_menu_diario ?? null,
  precio_menu_sabado: props.currentConfig.precio_menu_sabado ?? null,
  modo_ocupacion: (props.currentConfig.modo_ocupacion as OcupacionModo) ?? 'auto',
  ocupacion_manual: props.currentConfig.ocupacion_manual ?? 0,
  mostrar_recomendados: props.currentConfig.mostrar_recomendados ?? true,
  titulo_recomendados: props.currentConfig.titulo_recomendados ?? 'NUESTRAS RECOMENDACIONES',
  max_ancho_imagen: props.currentConfig.max_ancho_imagen ?? 1200,
  calidad_imagen: props.currentConfig.calidad_imagen ?? 80,
  max_peso_imagen: props.currentConfig.max_peso_imagen ?? 5,
  auto_comprimir_imagen: props.currentConfig.auto_comprimir_imagen ?? true,
  smtp_host: props.currentConfig.smtp_host ?? '',
  smtp_port: props.currentConfig.smtp_port ?? null,
  smtp_user: props.currentConfig.smtp_user ?? '',
  smtp_from_email: props.currentConfig.smtp_from_email ?? '',
  smtp_security: props.currentConfig.smtp_security ?? 'auto',
  smtp_password: '',
  texto_proteccion_datos: props.currentConfig.texto_proteccion_datos ?? '',
  modo_reserva: (props.currentConfig.modo_reserva as ReservaModo) ?? 'automatica',
  horarios_config: (props.currentConfig.horarios_config as HorarioConfigForm) ?? {
    comida_inicio: '13:30',
    comida_fin: '15:30',
    cena_inicio: '21:00',
    cena_fin: '23:30',
    intervalo_minutos: 15,
  },
  zonas_config: (props.currentConfig.zonas_config as ZoneConfigForm[]) ?? [
    { id: 'principal', nombre: 'Comedor principal', capacidad: 70, enabled: true },
    { id: 'reservado', nombre: 'Comedor reservado', capacidad: 14, enabled: true },
    { id: 'zingaro', nombre: 'Comedor Zíngaro', capacidad: 60, enabled: true },
    { id: 'terraza', nombre: 'Comedor terraza', capacidad: 100, enabled: true },
    { id: 'bar', nombre: 'Bar', capacidad: 20, enabled: true },
  ],
  cliente_elige_zona: (props.currentConfig.cliente_elige_zona as ClienteEligeZona) ?? 'none',
  captcha_habilitado: props.currentConfig.captcha_habilitado ?? false,
})

const testEmail = ref('')
const errors = ref<Record<string, string>>({})
const showPassword = ref(false)

// ── Horarios preview ──
const horarioErrors = ref<Record<string, string>>({})

const slotPreview = computed(() => {
  try {
    return generateSlots({
      comida_inicio: form.horarios_config.comida_inicio,
      comida_fin: form.horarios_config.comida_fin,
      cena_inicio: form.horarios_config.cena_inicio,
      cena_fin: form.horarios_config.cena_fin,
      intervalo_minutos: form.horarios_config.intervalo_minutos,
    })
  } catch {
    return []
  }
})

const totalCapacidadZonas = computed(() =>
  form.zonas_config.reduce((sum, z) => sum + z.capacidad, 0),
)

// ── Días bloqueados (new entry form state) ──
const newDiaFecha = ref('')
const newDiaRecurrente = ref(false)
const newDiaFechaFin = ref('')
const newDiaMotivo = ref('')
const diaBloqueadoError = ref('')

// ── Zonas drag state ──
const zoneDrag = ref<{ index: number | null; overIndex: number | null }>({ index: null, overIndex: null })

function onZoneDragStart(index: number) {
  zoneDrag.value = { index, overIndex: null }
}

function onZoneDragEnter(dropIndex: number) {
  const d = zoneDrag.value
  if (d.index === null || d.index === dropIndex) return
  d.overIndex = dropIndex
}

function onZoneDragOver(event: DragEvent) {
  event.preventDefault()
}

function onZoneDragLeave() {
  if (zoneDrag.value.overIndex !== null) zoneDrag.value.overIndex = null
}

function onZoneDrop(event: DragEvent, dropIdx: number) {
  event.preventDefault()
  const d = zoneDrag.value
  if (d.index === null || d.index === dropIdx) { resetZoneDrag(); return }
  const [moved] = form.zonas_config.splice(d.index, 1)
  if (moved === undefined) return
  form.zonas_config.splice(dropIdx, 0, moved)
  resetZoneDrag()
}

function onZoneDragEnd() { resetZoneDrag() }

function resetZoneDrag() { zoneDrag.value = { index: null, overIndex: null } }

function zoneDragClasses(index: number): string {
  const d = zoneDrag.value
  if (d.index === index) return 'opacity-40'
  if (d.overIndex === index) return 'border-t-2 border-terracotta'
  return ''
}

function addZone() {
  const nextId = `zone-${Date.now()}`
  form.zonas_config.push({
    id: nextId,
    nombre: `Zona ${form.zonas_config.length + 1}`,
    capacidad: 10,
    enabled: true,
  })
}

function removeZone(index: number) {
  if (form.zonas_config.length <= 1) return
  if (confirm('¿Eliminar esta zona?')) {
    form.zonas_config.splice(index, 1)
  }
}

function handleAddDiaBloqueado() {
  diaBloqueadoError.value = ''
  if (!newDiaFecha.value) {
    diaBloqueadoError.value = 'Selecciona una fecha'
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selected = new Date(newDiaFecha.value + 'T00:00:00')
  if (!newDiaRecurrente.value && selected < today) {
    diaBloqueadoError.value = 'No se pueden bloquear fechas pasadas'
    return
  }

  emit('addDiaBloqueado', {
    fecha: newDiaFecha.value,
    recurrente: newDiaRecurrente.value,
    fecha_fin: newDiaFechaFin.value || null,
    motivo: newDiaMotivo.value || null,
  })

  newDiaFecha.value = ''
  newDiaRecurrente.value = false
  newDiaFechaFin.value = ''
  newDiaMotivo.value = ''
}

watch(
  () => props.currentConfig,
  (cfg) => {
    if (!cfg || !Object.keys(cfg).length) return
    if (cfg.cliente_elige_mesa !== undefined) form.cliente_elige_mesa = cfg.cliente_elige_mesa
    if (cfg.capacidad_total_local !== undefined) form.capacidad_total_local = cfg.capacidad_total_local
    if (cfg.precio_menu_diario !== undefined) form.precio_menu_diario = cfg.precio_menu_diario
    if (cfg.precio_menu_sabado !== undefined) form.precio_menu_sabado = cfg.precio_menu_sabado
    if (cfg.modo_ocupacion !== undefined) form.modo_ocupacion = cfg.modo_ocupacion as OcupacionModo
    if (cfg.ocupacion_manual !== undefined) form.ocupacion_manual = cfg.ocupacion_manual
    if (cfg.mostrar_recomendados !== undefined) form.mostrar_recomendados = cfg.mostrar_recomendados
    if (cfg.titulo_recomendados !== undefined) form.titulo_recomendados = cfg.titulo_recomendados
    if (cfg.max_ancho_imagen !== undefined) form.max_ancho_imagen = cfg.max_ancho_imagen
    if (cfg.calidad_imagen !== undefined) form.calidad_imagen = cfg.calidad_imagen
    if (cfg.max_peso_imagen !== undefined) form.max_peso_imagen = cfg.max_peso_imagen
    if (cfg.auto_comprimir_imagen !== undefined) form.auto_comprimir_imagen = cfg.auto_comprimir_imagen
    if (cfg.smtp_host !== undefined) form.smtp_host = cfg.smtp_host ?? ''
    if (cfg.smtp_port !== undefined) form.smtp_port = cfg.smtp_port ?? null
    if (cfg.smtp_user !== undefined) form.smtp_user = cfg.smtp_user ?? ''
    if (cfg.smtp_from_email !== undefined) form.smtp_from_email = cfg.smtp_from_email ?? ''
    if (cfg.smtp_security !== undefined) form.smtp_security = cfg.smtp_security as string
    if (cfg.texto_proteccion_datos !== undefined) form.texto_proteccion_datos = cfg.texto_proteccion_datos ?? ''
    if (cfg.modo_reserva !== undefined) form.modo_reserva = cfg.modo_reserva as ReservaModo
    if (cfg.horarios_config !== undefined) form.horarios_config = (cfg.horarios_config as HorarioConfigForm) ?? form.horarios_config
    if (cfg.zonas_config !== undefined) form.zonas_config = (cfg.zonas_config as ZoneConfigForm[]) ?? form.zonas_config
    if (cfg.cliente_elige_zona !== undefined) form.cliente_elige_zona = (cfg.cliente_elige_zona as ClienteEligeZona) ?? 'none'
    if (cfg.captcha_habilitado !== undefined) form.captcha_habilitado = cfg.captcha_habilitado as boolean
    // smtp_password is NEVER loaded — always empty on GET
  },
  { deep: true },
)

function validate(): boolean {
  const e: Record<string, string> = {}
  if (form.capacidad_total_local < 1) e.capacidad_total_local = 'La capacidad debe ser al menos 1'
  if (form.capacidad_total_local > 999) e.capacidad_total_local = 'La capacidad máxima es 999'
  if (form.max_ancho_imagen < 200 || form.max_ancho_imagen > 4096) e.max_ancho_imagen = 'El ancho máximo debe estar entre 200 y 4096px'
  if (form.calidad_imagen < 10 || form.calidad_imagen > 100) e.calidad_imagen = 'La calidad debe estar entre 10 y 100'
  if (form.max_peso_imagen < 1 || form.max_peso_imagen > 20) e.max_peso_imagen = 'El peso máximo debe estar entre 1 y 20MB'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', { ...form })
}

function handleSmtpTest() {
  if (testEmail.value) {
    emit('smtpTest', testEmail.value)
  }
}

const sectionClass = 'rounded-lg bg-white p-6 shadow-sm border border-gray-100'
const sectionTitleClass = 'mb-3 text-lg font-bold text-slate'
const labelClass = 'mb-1 block text-sm font-medium text-slate'
const inputClass = 'rounded-lg border border-gray-300 px-3 py-2 text-sm w-full'
const numberInputClass = 'rounded-lg border border-gray-300 px-3 py-2 w-32'
const checkboxClass = 'h-4 w-4 rounded'
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Section 1: General -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">General</h2>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate" for="cfg-capacidad">
          Capacidad total del local
        </label>
        <input
          id="cfg-capacidad"
          v-model.number="form.capacidad_total_local"
          data-testid="cfg-capacidad"
          type="number"
          min="1"
          max="999"
          class="w-32 rounded-lg border px-3 py-2"
          :class="errors.capacidad_total_local ? 'border-red-500' : 'border-gray-300'"
        />
        <p v-if="errors.capacidad_total_local" class="mt-1 text-sm text-red-600">
          {{ errors.capacidad_total_local }}
        </p>
      </div>

      <div class="mt-4">
        <span class="mb-1 block text-sm font-medium text-slate">Modo de ocupación</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-1 cursor-pointer">
            <input v-model="form.modo_ocupacion" type="radio" value="auto" class="h-3 w-3 accent-terracotta" />
            <span class="text-sm text-slate">Automático</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input v-model="form.modo_ocupacion" type="radio" value="manual" class="h-3 w-3 accent-terracotta" />
            <span class="text-sm text-slate">Manual</span>
          </label>
        </div>
      </div>

      <div v-if="form.modo_ocupacion === 'manual'" class="mt-3">
        <label class="mb-1 block text-sm font-medium text-slate" for="cfg-ocupacion-manual">
          Ocupación manual
        </label>
        <input
          id="cfg-ocupacion-manual"
          v-model.number="form.ocupacion_manual"
          data-testid="cfg-ocupacion-manual"
          type="number"
          min="0"
          class="w-32 rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
    </div>

    <!-- Section 2: Elección de mesa -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Elección de mesa</h2>
      <div class="flex items-center gap-3">
        <input
          id="cfg-elige-mesa"
          v-model="form.cliente_elige_mesa"
          data-testid="cfg-elige-mesa"
          type="checkbox"
          class="h-4 w-4 rounded"
        />
        <label class="text-sm font-medium text-slate" for="cfg-elige-mesa">
          Permitir que el cliente elija mesa
        </label>
      </div>
    </div>

    <!-- Section 3: Precios -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Precios</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-precio-diario">
            Precio Menú Diario (€)
          </label>
          <input
            id="cfg-precio-diario"
            v-model.number="form.precio_menu_diario"
            data-testid="cfg-precio-diario"
            type="number"
            step="0.01"
            min="0"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-precio-sabado">
            Precio Menú Sábado (€)
          </label>
          <input
            id="cfg-precio-sabado"
            v-model.number="form.precio_menu_sabado"
            data-testid="cfg-precio-sabado"
            type="number"
            step="0.01"
            min="0"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
    </div>

    <!-- Section 4: Recomendados -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Recomendados</h2>
      <div class="flex items-center gap-3 mb-3">
        <input
          id="cfg-mostrar-rec"
          v-model="form.mostrar_recomendados"
          type="checkbox"
          class="h-4 w-4 rounded"
        />
        <label class="text-sm font-medium text-slate" for="cfg-mostrar-rec">
          Mostrar "{{ form.titulo_recomendados || 'NUESTRAS RECOMENDACIONES' }}" en la carta
        </label>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate" for="cfg-titulo-rec">
          Título de la sección
        </label>
        <input
          id="cfg-titulo-rec"
          v-model="form.titulo_recomendados"
          type="text"
          class="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </div>

    <!-- Section 5: Imágenes -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Optimización de imágenes</h2>
      <p class="mb-4 text-xs text-gray-400">
        Las imágenes de platos se redimensionan y comprimen automáticamente al subirse.
      </p>

      <div class="flex items-center gap-3 mb-4">
        <input
          id="cfg-auto-comprimir"
          v-model="form.auto_comprimir_imagen"
          type="checkbox"
          class="h-4 w-4 rounded"
        />
        <label class="text-sm font-medium text-slate" for="cfg-auto-comprimir">
          Comprimir imágenes automáticamente al subir
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-max-ancho">Ancho máximo (px)</label>
          <input id="cfg-max-ancho" v-model.number="form.max_ancho_imagen" data-testid="cfg-max-ancho" type="number" min="200" max="4096" class="w-32 rounded-lg border px-3 py-2" :class="errors.max_ancho_imagen ? 'border-red-500' : 'border-gray-300'" />
          <p v-if="errors.max_ancho_imagen" class="mt-1 text-sm text-red-600">{{ errors.max_ancho_imagen }}</p>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-calidad">Calidad (1–100)</label>
          <input id="cfg-calidad" v-model.number="form.calidad_imagen" data-testid="cfg-calidad" type="number" min="10" max="100" class="w-32 rounded-lg border px-3 py-2" :class="errors.calidad_imagen ? 'border-red-500' : 'border-gray-300'" />
          <p v-if="errors.calidad_imagen" class="mt-1 text-sm text-red-600">{{ errors.calidad_imagen }}</p>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-max-peso">Peso máximo (MB)</label>
          <input id="cfg-max-peso" v-model.number="form.max_peso_imagen" data-testid="cfg-max-peso" type="number" min="1" max="20" class="w-32 rounded-lg border px-3 py-2" :class="errors.max_peso_imagen ? 'border-red-500' : 'border-gray-300'" />
          <p v-if="errors.max_peso_imagen" class="mt-1 text-sm text-red-600">{{ errors.max_peso_imagen }}</p>
        </div>
      </div>
    </div>

    <!-- Section 6: Correo saliente (SMTP) -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Correo saliente (SMTP)</h2>
      <p class="mb-4 text-xs text-gray-400">
        Configuración para enviar correos de confirmación de reserva.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-host">Servidor SMTP</label>
          <input id="cfg-smtp-host" v-model="form.smtp_host" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="smtp.ejemplo.com" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-port">Puerto</label>
          <input id="cfg-smtp-port" v-model.number="form.smtp_port" type="number" class="w-32 rounded-lg border border-gray-300 px-3 py-2" placeholder="587" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-user">Usuario</label>
          <input id="cfg-smtp-user" v-model="form.smtp_user" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="usuario@ejemplo.com" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-from">Email remitente</label>
          <input id="cfg-smtp-from" v-model="form.smtp_from_email" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="reservas@lazingara.es" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-security">Tipo de conexión</label>
          <select id="cfg-smtp-security" v-model="form.smtp_security" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="auto">Auto (por puerto)</option>
            <option value="ssl">SSL / TLS</option>
            <option value="starttls">STARTTLS</option>
            <option value="none">Sin cifrado</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-smtp-password">
            Contraseña SMTP
          </label>
          <div class="relative">
            <input
              id="cfg-smtp-password"
              v-model="form.smtp_password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-400">
            Dejar en blanco para conservar la contraseña actual.
          </p>
        </div>
      </div>

      <!-- Test email button -->
      <div class="mt-4 flex items-end gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate" for="cfg-test-email">
            Email de prueba
          </label>
          <input
            id="cfg-test-email"
            v-model="testEmail"
            type="email"
            class="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="test@ejemplo.com"
          />
        </div>
        <button
          type="button"
          :disabled="smtpTesting || !testEmail"
          class="rounded-lg border border-terracotta px-4 py-2 text-sm font-medium text-terracotta hover:bg-terracotta/10 disabled:opacity-50"
          @click="handleSmtpTest"
        >
          {{ smtpTesting ? 'Enviando...' : 'Enviar prueba' }}
        </button>
      </div>
    </div>

    <!-- Section 7: Protección de datos -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Protección de datos</h2>
      <p class="mb-3 text-xs text-gray-400">
        Texto mostrado al cliente antes de completar la reserva. Si se deja vacío, no se muestra el paso GDPR.
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate" for="cfg-gdpr-text">
          Texto de protección de datos
        </label>
        <textarea
          id="cfg-gdpr-text"
          v-model="form.texto_proteccion_datos"
          rows="5"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Información sobre el tratamiento de datos personales..."
        />
      </div>
    </div>

    <!-- Section 8: Reservas -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Reservas</h2>
      <div>
        <span class="mb-1 block text-sm font-medium text-slate">Modo de reserva</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-1 cursor-pointer">
            <input v-model="form.modo_reserva" type="radio" value="automatica" class="h-3 w-3 accent-terracotta" />
            <span class="text-sm text-slate">Automática</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input v-model="form.modo_reserva" type="radio" value="verificada" class="h-3 w-3 accent-terracotta" />
            <span class="text-sm text-slate">Verificada (manual)</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-gray-400">
          <strong>Automática:</strong> la reserva se confirma al instante y se envía email.<br />
          <strong>Verificada:</strong> la reserva queda pendiente hasta que un administrador la confirme.
        </p>
      </div>

      <!-- Cliente elige zona -->
      <div class="mt-5">
        <span class="mb-2 block text-sm font-medium text-slate">El cliente puede elegir zona</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              v-model="form.cliente_elige_zona"
              type="radio"
              value="none"
              data-testid="cfg-elige-zona-none"
              class="h-3 w-3 accent-terracotta"
            />
            <span class="text-sm text-slate">No</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              v-model="form.cliente_elige_zona"
              type="radio"
              value="zona"
              data-testid="cfg-elige-zona-zona"
              class="h-3 w-3 accent-terracotta"
            />
            <span class="text-sm text-slate">Solo zona</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              v-model="form.cliente_elige_zona"
              type="radio"
              value="zona_mesa"
              data-testid="cfg-elige-zona-zona-mesa"
              class="h-3 w-3 accent-terracotta"
            />
            <span class="text-sm text-slate">Zona y mesa</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-gray-400">
          <strong>No:</strong> el cliente reserva sin elegir zona.<br />
          <strong>Solo zona:</strong> el cliente elige la zona del restaurante.<br />
          <strong>Zona y mesa:</strong> el cliente elige zona y mesa (requiere plano interactivo).
        </p>
      </div>

      <!-- CAPTCHA -->
      <div class="mt-5">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.captcha_habilitado" type="checkbox" class="h-4 w-4 accent-terracotta" />
          <span class="text-sm font-medium text-slate">Protección anti-bots (Cloudflare Turnstile)</span>
        </label>
        <p class="mt-1 text-xs text-gray-400">
          Muestra un CAPTCHA en el formulario de reservas para evitar spam. Requiere
          configurar <code>NUXT_PUBLIC_TURNSTILE_SITE_KEY</code> y <code>NUXT_TURNSTILE_SECRET_KEY</code> en el servidor.
        </p>
      </div>
    </div>

    <!-- Section 9: Horarios (HOR-001, HOR-003) -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Horarios</h2>

      <!-- Comida -->
      <div class="mb-4">
        <span class="mb-2 block text-sm font-medium text-slate">Comida</span>
        <div class="flex items-center gap-2">
          <input
            v-model="form.horarios_config.comida_inicio"
            type="time"
            data-testid="cfg-comida-inicio"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span class="text-gray-400">a</span>
          <input
            v-model="form.horarios_config.comida_fin"
            type="time"
            data-testid="cfg-comida-fin"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <!-- Cena -->
      <div class="mb-4">
        <span class="mb-2 block text-sm font-medium text-slate">Cena</span>
        <div class="flex items-center gap-2">
          <input
            v-model="form.horarios_config.cena_inicio"
            type="time"
            data-testid="cfg-cena-inicio"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span class="text-gray-400">a</span>
          <input
            v-model="form.horarios_config.cena_fin"
            type="time"
            data-testid="cfg-cena-fin"
            class="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <!-- Intervalo -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-slate" for="cfg-intervalo">
          Intervalo entre turnos
        </label>
        <select
          id="cfg-intervalo"
          v-model.number="form.horarios_config.intervalo_minutos"
          data-testid="cfg-intervalo"
          class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option :value="15">15 minutos</option>
          <option :value="20">20 minutos</option>
          <option :value="30">30 minutos</option>
        </select>
      </div>

      <!-- Preview -->
      <div v-if="slotPreview.length > 0" class="mt-4 rounded-lg bg-gray-50 p-3">
        <p class="mb-2 text-xs font-medium text-gray-500">Vista previa de turnos</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="slot in slotPreview"
            :key="slot.hora"
            class="rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            data-testid="slot-preview"
          >
            {{ slot.hora }}
          </span>
        </div>
      </div>
    </div>

    <!-- Section 10: Zonas del restaurante (ZON-001, ZON-002, ZON-003) -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Zonas del restaurante</h2>

      <!-- Total capacity -->
      <p class="mb-4 text-sm text-gray-600">
        Capacidad total: <strong data-testid="zona-capacidad-total">{{ totalCapacidadZonas }}</strong>
      </p>

      <!-- Zone rows -->
      <div class="space-y-2">
        <div
          v-for="(zona, index) in form.zonas_config"
          :key="zona.id"
          :class="['flex items-center gap-3 rounded-lg px-2 py-2 transition-all', zoneDragClasses(index)]"
          draggable="true"
          @dragstart="onZoneDragStart(index)"
          @dragenter="onZoneDragEnter(index)"
          @dragover="onZoneDragOver"
          @dragleave="onZoneDragLeave"
          @drop="onZoneDrop($event, index)"
          @dragend="onZoneDragEnd"
        >
          <span class="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing select-none text-lg">⠿</span>
          <input
            v-model="zona.nombre"
            type="text"
            data-testid="zona-nombre"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nombre de la zona"
          />
          <input
            v-model.number="zona.capacidad"
            type="number"
            min="0"
            max="999"
            data-testid="zona-capacidad"
            class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <label class="flex items-center gap-1 cursor-pointer text-sm">
            <input
              v-model="zona.enabled"
              type="checkbox"
              data-testid="zona-enabled"
              class="h-4 w-4 rounded"
            />
            <span class="text-slate">Activo</span>
          </label>
          <button
            type="button"
            :disabled="form.zonas_config.length <= 1"
            data-testid="zona-delete"
            class="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50 disabled:opacity-30"
            @click="removeZone(index)"
          >
            ✕
          </button>
        </div>
      </div>

      <button
        type="button"
        data-testid="zona-add"
        class="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-terracotta hover:text-terracotta"
        @click="addZone"
      >
        + Añadir zona
      </button>
    </div>

    <!-- Section 11: Días bloqueados (CFG-012, BLO-001, BLO-002) -->
    <div :class="sectionClass">
      <h2 :class="sectionTitleClass">Días bloqueados</h2>

      <!-- Add form -->
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-xs text-slate" for="cfg-dia-fecha">Fecha</label>
          <input
            id="cfg-dia-fecha"
            v-model="newDiaFecha"
            type="date"
            data-testid="dia-fecha"
            class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate" for="cfg-dia-fecha-fin">Fecha fin (rango)</label>
          <input
            id="cfg-dia-fecha-fin"
            v-model="newDiaFechaFin"
            type="date"
            data-testid="dia-fecha-fin"
            class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              v-model="newDiaRecurrente"
              type="checkbox"
              data-testid="dia-recurrente"
              class="h-4 w-4 rounded"
            />
            <span class="text-sm text-slate">Recurrente</span>
          </label>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate" for="cfg-dia-motivo">Motivo</label>
          <input
            id="cfg-dia-motivo"
            v-model="newDiaMotivo"
            type="text"
            data-testid="dia-motivo"
            class="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ej: Navidad, Fiesta local..."
          />
        </div>
        <button
          type="button"
          data-testid="dia-add"
          class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
          @click="handleAddDiaBloqueado"
        >
          Añadir
        </button>
      </div>
      <p v-if="diaBloqueadoError" class="mb-3 text-sm text-red-600">{{ diaBloqueadoError }}</p>

      <!-- Existing blocked days list -->
      <div v-if="props.existingDiasBloqueados && props.existingDiasBloqueados.length > 0" class="mt-4">
        <p class="mb-2 text-xs font-medium text-gray-500">Días bloqueados actuales</p>
        <div class="max-h-60 space-y-1 overflow-y-auto">
          <div
            v-for="dia in props.existingDiasBloqueados"
            :key="dia.id"
            class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate">{{ dia.fecha }}</span>
              <span v-if="dia.recurrente" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Cada año</span>
              <span v-if="dia.motivo" class="text-xs text-gray-400">{{ dia.motivo }}</span>
            </div>
            <button
              type="button"
              data-testid="dia-delete"
              class="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              @click="emit('deleteDiaBloqueado', dia.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <p v-else class="mt-4 text-xs text-gray-400">No hay días bloqueados configurados.</p>
    </div>

    <!-- Submit -->
    <div class="pt-4">
      <button
        type="submit"
        :disabled="saving"
        class="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
      >
        {{ saving ? 'Guardando...' : 'Guardar configuración' }}
      </button>
    </div>
  </form>
</template>
