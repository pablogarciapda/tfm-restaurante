#!/usr/bin/env node
/**
 * POS agent — prints new reservations on the restaurant's Epson TM-T20III
 * (M267D, Ethernet) via ESC/POS over TCP port 9100.
 *
 * Runs INSIDE the restaurant LAN (the VPS cannot reach a local printer).
 * Listens to Supabase Realtime POSTGRES INSERTs on the `reservas` table
 * (requires migration 008-enable-realtime-reservas.sql applied), enriches
 * each new reserva with cliente + mesa info and prints the ticket.
 *
 * Configuration (.env next to this file, see README):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (bypasses RLS — keep on the LAN device only)
 *   PRINTER_HOST               (printer IP on the LAN)
 *   PRINTER_PORT               (default 9100)
 *   CHANNEL_NAME               (default pos-printer-agent)
 *
 * Usage:  npm run start  (node --env-file=.env --experimental-strip-types agent.mjs)
 */
import { createClient } from '@supabase/supabase-js'
import net from 'node:net'
import { buildPosTicketLines, posTicketBytes } from '../../shared/utils/pos-ticket.ts'
import { generarReferencia } from '../../shared/utils/referencia.ts'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PRINTER_HOST = process.env.PRINTER_HOST
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100)
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'pos-printer-agent'

if (!SUPABASE_URL || !SUPABASE_KEY || !PRINTER_HOST) {
  console.error('[pos-agent] Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTER_HOST')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
})

/** Print queue: serializes jobs and retries on failures. */
const queue = []
let printing = false

function sendToPrinter(bytes) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: PRINTER_HOST, port: PRINTER_PORT }, () => {
      socket.write(bytes, () => {
        socket.end()
        resolve()
      })
    })
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('printer timeout'))
    })
    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })
  })
}

/** Enrich a raw reserva row with cliente + mesa data for the ticket. */
async function enrich(row) {
  const data = {
    referencia: generarReferencia(row.id, row.fecha_hora),
    fecha_hora: row.fecha_hora,
    numero_comensales: row.numero_comensales,
    nombre: '—',
    telefono: null,
    zona: null,
    mesa_num: null,
    restaurante: restaurantName,
  }

  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, apellidos, telefono')
    .eq('id', row.cliente_id)
    .maybeSingle()
  if (cliente) {
    data.nombre = [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ') || '—'
    data.telefono = cliente.telefono
  }

  if (row.mesa_id) {
    const { data: mesa } = await supabase
      .from('mesas')
      .select('numero_mesa, zona')
      .eq('id', row.mesa_id)
      .maybeSingle()
    if (mesa) {
      data.zona = mesa.zona
      data.mesa_num = mesa.numero_mesa
    }
  } else if (row.zona_id) {
    data.zona = String(row.zona_id)
  }

  return data
}

async function drainQueue() {
  if (printing) return
  printing = true
  while (queue.length > 0) {
    const row = queue[0]
    try {
      const data = await enrich(row)
      const bytes = posTicketBytes(buildPosTicketLines(data))
      await sendToPrinter(bytes)
      console.log(`[pos-agent] Printed reserva ${data.referencia} — ${data.nombre}`)
      queue.shift()
    } catch (err) {
      console.error(`[pos-agent] Print failed (${err.message}) — retrying in 5s`)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
  printing = false
}

const PRINTABLE_STATES = new Set(['pendiente', 'confirmada'])

/** Restaurant name for the ticket header (single read at startup). */
let restaurantName = null
try {
  const { data: configRow } = await supabase
    .from('configuracion')
    .select('restaurant_nombre')
    .limit(1)
    .single()
  restaurantName = configRow?.restaurant_nombre || null
} catch {
  // header simply omitted
}
supabase
  .channel(CHANNEL_NAME)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservas' }, (payload) => {
    const row = payload.new
    if (!row || !PRINTABLE_STATES.has(row.estado)) return
    queue.push(row)
    void drainQueue()
  })
  .subscribe((status) => console.log(`[pos-agent] Realtime ${CHANNEL_NAME}: ${status}`))

process.on('SIGINT', async () => {
  await supabase.removeChannel(supabase.channel(CHANNEL_NAME))
  process.exit(0)
})
