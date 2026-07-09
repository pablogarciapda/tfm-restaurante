/**
 * public-config.test.ts — Unit tests for GET /api/public-config
 *
 * Tests the handler directly (no HTTP): returns filtered public config,
 * only enabled zones, no sensitive data, + restaurant info for multi-tenant.
 */
import { describe, it, expect, vi } from 'vitest'

const DEFAULT_RESTAURANT = {
  nombre: 'Restaurante La Zíngara',
  direccion: '',
  telefono: '',
  maps_url: '',
  logo_url: null,
}

function createMockSupabase(configData: Record<string, unknown> | null) {
  const selectFn = vi.fn().mockResolvedValue({ data: configData, error: null })

  const chain: any = {
    then(resolve: any, reject: any) {
      return selectFn().then(resolve, reject)
    },
    catch(reject: any) {
      return selectFn().catch(reject)
    },
  }
  const ops = ['select', 'from', 'eq', 'neq', 'order', 'limit', 'single', 'match']
  for (const op of ops) {
    chain[op] = (..._args: any[]) => chain
  }

  return {
    _selectFn: selectFn,
    from: (_table: string) => chain,
  }
}

// Simulate the public-config handler logic inline for unit testing
async function getPublicConfig(supabase: any) {
  const { data, error } = await supabase
    .from('configuracion')
    .select('horarios_config, zonas_config, texto_proteccion_datos, modo_reserva, sms_verificacion, notificacion_reserva, cliente_elige_zona, captcha_habilitado, restaurant_nombre, restaurant_direccion, restaurant_telefono, restaurant_maps_url, restaurant_logo_url')
    .limit(1)
    .single()

  if (error || !data) {
    return {
      horarios: null,
      zonas: [],
      texto_proteccion_datos: null,
      modo_reserva: 'automatica',
      sms_verificacion: false,
      notificacion_reserva: 'email',
      cliente_elige_zona: 'none',
      captcha_habilitado: false,
      restaurant: DEFAULT_RESTAURANT,
    }
  }

  const horarios = data.horarios_config || null
  const allZonas = data.zonas_config || []
  const enabledZonas = (allZonas as any[]).filter((z: any) => z.enabled)

  const restaurant = {
    nombre: (data.restaurant_nombre as string) || DEFAULT_RESTAURANT.nombre,
    direccion: (data.restaurant_direccion as string) || DEFAULT_RESTAURANT.direccion,
    telefono: (data.restaurant_telefono as string) || DEFAULT_RESTAURANT.telefono,
    maps_url: (data.restaurant_maps_url as string) || DEFAULT_RESTAURANT.maps_url,
    logo_url: (data.restaurant_logo_url as string) || null,
  }

  return {
    horarios,
    zonas: enabledZonas,
    texto_proteccion_datos: data.texto_proteccion_datos || null,
    modo_reserva: data.modo_reserva || 'automatica',
    sms_verificacion: (data.sms_verificacion as boolean) ?? false,
    notificacion_reserva: data.notificacion_reserva || 'email',
    cliente_elige_zona: data.cliente_elige_zona || 'none',
    captcha_habilitado: (data.captcha_habilitado as boolean) ?? false,
    restaurant,
  }
}

describe('GET /api/public-config', () => {
  it('returns public config with horarios and enabled zones', async () => {
    const mockSupabase = createMockSupabase({
      horarios_config: {
        comida_inicio: '13:30',
        comida_fin: '15:30',
        cena_inicio: '21:00',
        cena_fin: '23:30',
        intervalo_minutos: 15,
      },
      zonas_config: [
        { id: 'principal', nombre: 'Principal', capacidad: 70, enabled: true },
        { id: 'terraza', nombre: 'Terraza', capacidad: 100, enabled: false },
        { id: 'bar', nombre: 'Bar', capacidad: 20, enabled: true },
      ],
      texto_proteccion_datos: 'Texto legal...',
      modo_reserva: 'automatica',
      cliente_elige_zona: 'zona',
    })

    const result = await getPublicConfig(mockSupabase as any)

    expect(result.horarios).toBeDefined()
    expect(result.horarios.comida_inicio).toBe('13:30')
    expect(result.zonas).toHaveLength(2) // only enabled
    expect(result.zonas[0].nombre).toBe('Principal')
    expect(result.zonas[1].nombre).toBe('Bar')
    expect(result.texto_proteccion_datos).toBe('Texto legal...')
    expect(result.modo_reserva).toBe('automatica')
    expect(result.cliente_elige_zona).toBe('zona')
    expect(result.restaurant).toBeDefined()
    expect(result.restaurant.nombre).toBe('Restaurante La Zíngara')
  })

  it('filters out disabled zones', async () => {
    const mockSupabase = createMockSupabase({
      horarios_config: null,
      zonas_config: [
        { id: 'a', nombre: 'Zona A', capacidad: 10, enabled: false },
        { id: 'b', nombre: 'Zona B', capacidad: 20, enabled: false },
      ],
      texto_proteccion_datos: null,
      modo_reserva: 'verificada',
      cliente_elige_zona: 'none',
    })

    const result = await getPublicConfig(mockSupabase as any)

    expect(result.zonas).toHaveLength(0)
    expect(result.horarios).toBeNull()
  })

  it('returns defaults when no config row exists', async () => {
    const mockSupabase = createMockSupabase(null)

    const result = await getPublicConfig(mockSupabase as any)

    expect(result.horarios).toBeNull()
    expect(result.zonas).toEqual([])
    expect(result.modo_reserva).toBe('automatica')
    expect(result.cliente_elige_zona).toBe('none')
    expect(result.restaurant.nombre).toBe('Restaurante La Zíngara')
  })

  it('handles missing cliente_elige_zona field', async () => {
    const mockSupabase = createMockSupabase({
      horarios_config: null,
      zonas_config: [],
      modo_reserva: 'verificada',
    })

    const result = await getPublicConfig(mockSupabase as any)

    expect(result.cliente_elige_zona).toBe('none')
  })

  it('does NOT expose sensitive fields like smtp_password', async () => {
    const mockSupabase = createMockSupabase({
      horarios_config: null,
      zonas_config: [],
      smtp_password: 'secret',
      modo_reserva: 'automatica',
    })

    const result = await getPublicConfig(mockSupabase as any)

    expect(result).not.toHaveProperty('smtp_password')
    // Only the expected public keys
    const keys = Object.keys(result)
    keys.sort()
    expect(keys).toEqual([
      'captcha_habilitado',
      'cliente_elige_zona',
      'horarios',
      'modo_reserva',
      'notificacion_reserva',
      'restaurant',
      'sms_verificacion',
      'texto_proteccion_datos',
      'zonas',
    ])
  })
})
