/**
 * GET /api/dashboard/stats — Dashboard aggregated metrics (DASH-002)
 *
 * Returns pre-aggregated stats for the admin dashboard.
 * Single endpoint, one service-role query block.
 */
import { serverSupabaseServiceRole } from '#supabase/server'

interface DashboardStats {
  totalPlatos: number
  reservasHoy: number
  eventosActivos: number
  reservasUltimos30: { fecha: string; total: number }[]
  topClientes: { nombre: string; telefono: string; total: number }[]
  reservasPorDiaSemana: { dia: number; total: number }[]
  reservasPorEstado: { estado: string; total: number }[]
  aforoActual: { ocupadas: number; capacidad: number }
  mediaComensales: number
  totalClientes: number
  totalReservas: number
}

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)

  // Today boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  // 30 days ago for trend
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // ── Parallel queries ──────────────────────────────────────────

    // 1. Total platos disponibles
    const { count: totalPlatos } = await supabase
      .from('platos')
      .select('*', { count: 'exact', head: true })
      .eq('disponible', true)

    // 2. Reservas hoy
    const { count: reservasHoy } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_hora', todayStart)
      .lt('fecha_hora', todayEnd)

    // 3. Eventos activos futuros
    const { count: eventosActivos } = await supabase
      .from('eventos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gte('fecha', todayStart)

    // 4. Reservas últimos 30 días (agrupado por fecha)
    const { data: reservas30 } = await supabase
      .from('reservas')
      .select('fecha_hora')
      .gte('fecha_hora', thirtyDaysAgo)
      .lt('fecha_hora', todayEnd)

    // 5. Top 5 clientes
    const { data: topClientesRaw } = await supabase
      .from('reservas')
      .select('cliente_id')
      .not('cliente_id', 'is', null)

    // 6. Reservas por estado
    const { data: reservasEstado } = await supabase
      .from('reservas')
      .select('estado')

    // 7. Aforo — mesas totales (sumar capacidad_actual, no contar filas)
    const { data: mesas } = await supabase
      .from('mesas')
      .select('capacidad_actual')

    // 8. Total clientes
    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    // ── Process results ───────────────────────────────────────────

    // Reservas últimos 30 días: agrupar por fecha YYYY-MM-DD
    const fechaCount = new Map<string, number>()
    for (const r of reservas30 || []) {
      const d = (r.fecha_hora as string).slice(0, 10)
      fechaCount.set(d, (fechaCount.get(d) || 0) + 1)
    }
    const reservasUltimos30 = Array.from(fechaCount.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total }))

    // Top 5 clientes: contar por cliente_id, luego buscar nombres
    const clienteCount = new Map<string, number>()
    for (const r of topClientesRaw || []) {
      const id = r.cliente_id as string
      clienteCount.set(id, (clienteCount.get(id) || 0) + 1)
    }
    const topIds = Array.from(clienteCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    let topClientes: { nombre: string; telefono: string; total: number }[] = []
    if (topIds.length > 0) {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .in('id', topIds)

      topClientes = (clientes || [])
        .map((c) => ({
          nombre: (c.nombre as string) || '—',
          telefono: (c.telefono as string) || '—',
          total: clienteCount.get(c.id as string) || 0,
        }))
        .sort((a, b) => b.total - a.total)
    }

    // Reservas por día de la semana (0=domingo…6=sábado)
    const diaCount = [0, 0, 0, 0, 0, 0, 0]
    for (const r of reservas30 || []) {
      const dia = new Date(r.fecha_hora as string).getDay()
      diaCount[dia]++
    }
    const reservasPorDiaSemana = diaCount.map((total, dia) => ({ dia, total }))

    // Reservas por estado
    const estadoCount = new Map<string, number>()
    for (const r of reservasEstado || []) {
      const est = (r.estado as string) || 'unknown'
      estadoCount.set(est, (estadoCount.get(est) || 0) + 1)
    }
    const reservasPorEstado = Array.from(estadoCount.entries()).map(([estado, total]) => ({ estado, total }))

    // Aforo actual: mesas ocupadas hoy (confirmadas con mesa asignada) vs total
    const { data: reservasHoyData } = await supabase
      .from('reservas')
      .select('mesa_id')
      .gte('fecha_hora', todayStart)
      .lt('fecha_hora', todayEnd)
      .in('estado', ['confirmada', 'completada'])
      .not('mesa_id', 'is', null)

    const mesasOcupadas = new Set((reservasHoyData || []).map((r) => r.mesa_id as string)).size
    const capacidad = (mesas || []).reduce((sum, m) => sum + (m.capacidad_actual as number), 0)

    // Media de comensales
    const { data: comensales } = await supabase
      .from('reservas')
      .select('numero_comensales')
      .not('numero_comensales', 'is', null)

    const totalComensales = (comensales || []).reduce((sum, r) => sum + (r.numero_comensales as number), 0)
    const totalReservasConComensales = (comensales || []).length
    const mediaComensales = totalReservasConComensales > 0
      ? Math.round((totalComensales / totalReservasConComensales) * 10) / 10
      : 0

    // Total reservas
    const { count: totalReservas } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })

    const stats: DashboardStats = {
      totalPlatos: totalPlatos ?? 0,
      reservasHoy: reservasHoy ?? 0,
      eventosActivos: eventosActivos ?? 0,
      reservasUltimos30,
      topClientes,
      reservasPorDiaSemana,
      reservasPorEstado,
      aforoActual: { ocupadas: mesasOcupadas, capacidad },
      mediaComensales,
      totalClientes: totalClientes ?? 0,
      totalReservas: totalReservas ?? 0,
    }

    return stats
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al obtener estadísticas del dashboard',
      cause: err,
    })
  }
})
