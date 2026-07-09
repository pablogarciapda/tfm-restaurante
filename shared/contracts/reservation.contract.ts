/**
 * reservation.contract.ts — Reservation flow types (RFC-001, CLI-001)
 *
 * Defines ReservationRequest, ReservationResponse, ClienteData,
 * ConfigData, HorarioConfig, ZonaConfig, DiaBloqueado, TimeSlot,
 * PublicConfig, and related interfaces for the reservation pipeline.
 * Lives in shared/ for client + server visibility.
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/contracts'].
 */

// ──────────────────────────── Horarios ────────────────────────────

/** Operating hours configuration (stored in configuracion.horarios_config JSONB) */
export interface HorarioConfig {
  comida_inicio: string // "HH:MM" e.g. "13:30"
  comida_fin: string // "HH:MM" e.g. "15:30"
  cena_inicio: string // "HH:MM" e.g. "21:00"
  cena_fin: string // "HH:MM" e.g. "23:30"
  intervalo_minutos: number // e.g. 15
}

// ──────────────────────────── Zonas ───────────────────────────────

/** Single zone configuration (stored in configuracion.zonas_config JSONB array) */
export interface ZonaConfig {
  id: string
  nombre: string
  capacidad: number
  enabled: boolean
}

// ──────────────────────────── Días Bloqueados ─────────────────────

/** Blocked/closed day row from dias_bloqueados table */
export interface DiaBloqueado {
  id: string
  fecha: string // YYYY-MM-DD
  recurrente: boolean
  fecha_fin?: string | null // YYYY-MM-DD for date ranges
  motivo?: string | null
  created_at: string
}

/** Payload for creating a blocked day */
export interface CreateDiaBloqueadoPayload {
  fecha: string
  recurrente?: boolean
  fecha_fin?: string | null
  motivo?: string | null
}

// ──────────────────────────── Slots ───────────────────────────────

/** Time slot option for the reservation form */
export interface TimeSlot {
  hora: string // "HH:MM" e.g. "13:30"
  disponible: boolean
  zona?: string // zone id if zone-specific
}

// ──────────────────────────── Public Config ───────────────────────

/** Restaurant info for multi-tenant header/footer (from public-config) */
export interface RestaurantConfig {
  nombre: string
  direccion: string
  telefono: string
  maps_url: string
  logo_url: string | null
}

/** Public config (safe for public API, cached in configuracion.public_config JSONB) */
export interface PublicConfig {
  horarios: HorarioConfig
  zonas: ZonaConfig[] // only enabled zones
  texto_proteccion_datos: string | null
  modo_reserva: 'automatica' | 'verificada' // confirmation mode
  sms_verificacion: boolean // whether SMS verification is required
  cliente_elige_zona: 'none' | 'zona' | 'zona_mesa'
  captcha_habilitado: boolean
  notificacion_reserva: 'email' | 'sms' | 'ambos'
  restaurant: RestaurantConfig
}

// ──────────────────────────── Admin ───────────────────────────────

/** Admin reasignar zona/mesa payload */
export interface AdminReasignarPayload {
  reserva_id: string
  nueva_zona_id?: string
  nueva_mesa_id?: string
  motivo: string
}

// ──────────────────────────── Reservation Flow ────────────────────

/** Request body for POST /api/reservas */
export interface ReservationRequest {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  zona_id?: string // optional zone id from selector
  sms_verified?: boolean
  captcha_token?: string // Cloudflare Turnstile token (required when captcha_habilitado=true)
  gdpr_aceptado?: boolean // marks GDPR acceptance for this phone
}

/** Response from POST /api/reservas */
export interface ReservationResponse {
  success: boolean
  reserva_id: string
  estado: 'confirmada' | 'pendiente'
}

/** Payload for creating a cliente */
export interface CreateClientePayload {
  nombre: string
  apellidos?: string
  telefono: string
  email?: string
}

/** Payload for updating a cliente (telefono is read-only) */
export interface UpdateClientePayload {
  nombre?: string
  apellidos?: string
  email?: string
}

/** Safe config data — NEVER includes smtp_password */
export interface ConfigData {
  id?: string
  cliente_elige_mesa: boolean
  capacidad_total_local: number | null
  precio_menu_diario?: number | null
  precio_menu_sabado?: number | null
  mostrar_recomendados: boolean
  titulo_recomendados: string
  modo_ocupacion: 'auto' | 'manual'
  ocupacion_manual: number
  max_ancho_imagen: number
  calidad_imagen: number
  max_peso_imagen: number
  auto_comprimir_imagen: boolean
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_user?: string | null
  smtp_from_email?: string | null
  smtp_security?: string | null
  texto_proteccion_datos?: string | null
  modo_reserva: 'automatica' | 'verificada'
  // ───── Config fields ─────
  horarios_config?: HorarioConfig | null
  zonas_config?: ZonaConfig[] | null
  public_config?: PublicConfig | null
  cliente_elige_zona?: 'none' | 'zona' | 'zona_mesa'
  captcha_habilitado: boolean
  sms_verificacion: boolean
  notificacion_reserva?: 'email' | 'sms' | 'ambos'
  restaurant_nombre: string
  restaurant_direccion: string
  restaurant_telefono: string
  restaurant_maps_url: string
}

/** Cliente data from the API */
export interface ClienteData {
  id: string
  nombre: string
  apellidos?: string | null
  telefono: string
  email?: string | null
  created_at: string
  updated_at: string
}

/** Cliente with reservation count (for list view) */
export interface ClienteWithCount extends ClienteData {
  reservas_count: number
}

/** Reservation history entry for a cliente */
export interface ReservaHistory {
  id: string
  fecha_hora: string
  numero_comensales: number | null
  estado: string | null
  created_at: string
}

/** Payload for POST /api/cocina/config (smpt_password write-only) */
export interface ConfigUpdatePayload {
  cliente_elige_mesa?: boolean
  capacidad_total_local?: number | null
  precio_menu_diario?: number | null
  precio_menu_sabado?: number | null
  mostrar_recomendados?: boolean
  titulo_recomendados?: string
  modo_ocupacion?: 'auto' | 'manual'
  ocupacion_manual?: number
  max_ancho_imagen?: number
  calidad_imagen?: number
  max_peso_imagen?: number
  auto_comprimir_imagen?: boolean
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_user?: string | null
  smtp_from_email?: string | null
  smtp_security?: string | null
  smtp_password?: string // write-only; empty or "••••••••" = preserve existing
  texto_proteccion_datos?: string | null
  modo_reserva?: 'automatica' | 'verificada'
  horarios_config?: HorarioConfig | null
  zonas_config?: ZonaConfig[] | null
  public_config?: PublicConfig | null
  cliente_elige_zona?: 'none' | 'zona' | 'zona_mesa'
  captcha_habilitado?: boolean
  sms_verificacion?: boolean
  notificacion_reserva?: 'email' | 'sms' | 'ambos'
  restaurant_nombre?: string
  restaurant_direccion?: string
  restaurant_telefono?: string
  restaurant_maps_url?: string
}
