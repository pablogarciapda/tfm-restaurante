/**
 * Seed SQL generator — reads shared/fixtures/*-mock.ts
 * and outputs shared/db/seed.sql with idempotent INSERTs.
 *
 * Usage: npx tsx shared/db/generate-seed.ts > shared/db/seed.sql
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Price parsing: mock strings → numeric(6,2)
// "26" → 26.00, "16,5" → 16.50, "33/Pers." → 33.00, "75€/kg" → 75.00,
// "42/Kg" → 42.00, "CONSULTAR" → 0.00, "" → 0.00
// ---------------------------------------------------------------------------
function parsePrecio(raw: string | undefined): string {
  if (!raw || raw.trim() === '') return '0.00'
  let cleaned = raw.trim()
  // Replace comma decimal separator
  cleaned = cleaned.replace(',', '.')
  // Strip trailing suffix patterns like /Pers., €/kg, /Kg
  cleaned = cleaned.replace(/[/€].*$/, '')
  cleaned = cleaned.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// ---------------------------------------------------------------------------
// SQL escape: double single quotes
// ---------------------------------------------------------------------------
function esc(s: string): string {
  return s.replace(/'/g, "''")
}

// ---------------------------------------------------------------------------
// alergenos string[] → ARRAY['a','b'] or ARRAY[]::text[]
// ---------------------------------------------------------------------------
function formatAlergenos(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return "ARRAY[]::text[]"
  const vals = arr.map(a => `'${esc(a)}'`)
  return `ARRAY[${vals.join(',')}]`
}

// ---------------------------------------------------------------------------
// Carta: flat list of unique dishes (de-duplicated by nombre, first wins)
// ---------------------------------------------------------------------------
interface CartaPlato {
  plato: string
  precio: string
  stock?: string
  descripcion?: string
  imagen_url?: string
  alergenos?: string[]
  calorias?: number
}

async function main() {
  // Dynamically import mock data
  const cartaMod = await import('../../shared/fixtures/carta-mock')
  const eventosMod = await import('../../shared/fixtures/eventos-mock')
  const menuMod = await import('../../shared/fixtures/menu-diario-mock')

  const { mockCarta } = cartaMod
  const { mockEventos } = eventosMod
  const { mockMenuDiario } = menuMod

  const lines: string[] = [
    '-- =============================================================================',
    '-- Restaurante La Zíngara — Seed Data',
    '-- Generated from shared/fixtures/*-mock.ts',
    '-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING)',
    '-- =============================================================================',
    '',
    'BEGIN;',
    '',
  ]

  // -----------------------------------------------------------------------
  // PLATOS — de-duplicate by nombre, skip section separators
  // -----------------------------------------------------------------------
  const seenNombres = new Set<string>()
  const allPlatos: { plato: CartaPlato; categoria: string; puesto: number }[] = []

  for (const cat of mockCarta) {
    for (const p of cat.platos) {
      // Skip section separators (plato starts with "— ")
      if (p.plato.startsWith('— ')) continue
      // Skip if precio is empty (non-dish entries)
      if (!p.precio || p.precio.trim() === '') continue
      const nombre = p.plato.trim().toUpperCase()
      if (seenNombres.has(nombre)) continue
      seenNombres.add(nombre)
      allPlatos.push({ plato: p, categoria: cat.categoria, puesto: cat.puesto })
    }
  }

  lines.push('-- =============================================================================')
  lines.push('-- PLATOS')
  lines.push('-- =============================================================================')
  lines.push('')

  for (const { plato: p, categoria, puesto } of allPlatos) {
    const id = `plato-${p.plato.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
    const nombre = esc(p.plato.trim())
    const desc = p.descripcion ? `'${esc(p.descripcion)}'` : 'NULL'
    const precio = parsePrecio(p.precio)
    const img = p.imagen_url ? `'${esc(p.imagen_url)}'` : 'NULL'
    const calorias = p.calorias !== undefined ? String(p.calorias) : 'NULL'
    const alergenos = formatAlergenos(p.alergenos)
    const disponible = p.stock && p.stock !== '' ? 'true' : 'false'

    lines.push(
      `INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)`,
      `VALUES (`,
      `  '${id}'::uuid,`,
      `  '${nombre}',`,
      `  ${desc},`,
      `  ${precio}::numeric,`,
      `  '${esc(categoria)}',`,
      `  'carta',`,
      `  ${img},`,
      `  ${disponible},`,
      `  ${calorias},`,
      `  ${alergenos},`,
      `  ${puesto},`,
      `  now(),`,
      `  now()`,
      `)`,
      `ON CONFLICT (nombre) DO NOTHING;`,
      ``,
    )
  }

  // -----------------------------------------------------------------------
  // EVENTOS
  // -----------------------------------------------------------------------
  lines.push('-- =============================================================================')
  lines.push('-- EVENTOS')
  lines.push('-- =============================================================================')
  lines.push('')

  for (const ev of mockEventos) {
    const titulo = esc(ev.titulo)
    const desc = esc(ev.descripcion)
    const fecha = ev.fecha
    const categoria = ev.categoria
    const img = ev.imagen_url ? `'${esc(ev.imagen_url)}'` : 'NULL'
    const capacidad = ev.soldOut ? '0' : '50'
    const estado = ev.fecha < '2026-06-30' ? "'finalizado'" : "'programado'"

    // Use ev.fecha as part of identifier to determine activo
    const activo = ev.fecha >= '2026-06-30'

    lines.push(
      `INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)`,
      `VALUES (`,
      `  '${ev.id}'::uuid,`,
      `  '${titulo}',`,
      `  '${desc}',`,
      `  '${fecha}T20:00:00Z'::timestamptz,`,
      `  '${categoria}',`,
      `  ${img},`,
      `  ${capacidad},`,
      `  ${estado},`,
      `  ${activo},`,
      `  now(),`,
      `  now()`,
      `)`,
      `ON CONFLICT (id) DO NOTHING;`,
      ``,
    )
  }

  // -----------------------------------------------------------------------
  // MENU DIARIO CONFIG — 7 days, pricing per task instructions
  // -----------------------------------------------------------------------
  lines.push('-- =============================================================================')
  lines.push('-- MENU DIARIO CONFIG')
  lines.push('-- =============================================================================')
  lines.push('')
  lines.push('-- Pricing: Mon-Fri 16€, Sat 25€, Sun 20€ (all active)')
  lines.push('')

  const dayPricing: Record<number, { precio: string; activo: boolean }> = {
    0: { precio: '20', activo: true },   // Sunday
    1: { precio: '16', activo: true },   // Monday
    2: { precio: '16', activo: true },   // Tuesday
    3: { precio: '16', activo: true },   // Wednesday
    4: { precio: '16', activo: true },   // Thursday
    5: { precio: '16', activo: true },   // Friday
    6: { precio: '25', activo: true },   // Saturday
  }

  const configIds: Record<number, string> = {}

  for (let d = 0; d <= 6; d++) {
    const cfgId = `menu-config-day-${d}`
    configIds[d] = cfgId
    const { precio, activo } = dayPricing[d]!

    lines.push(
      `INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)`,
      `VALUES (`,
      `  '${cfgId}'::uuid,`,
      `  ${d},`,
      `  '${precio}',`,
      `  ${activo},`,
      `  now(),`,
      `  now()`,
      `)`,
      `ON CONFLICT (day_of_week) DO NOTHING;`,
      ``,
    )
  }

  // -----------------------------------------------------------------------
  // MENU DIARIO ITEMS — from mock per day
  // -----------------------------------------------------------------------
  lines.push('-- =============================================================================')
  lines.push('-- MENU DIARIO ITEMS')
  lines.push('-- =============================================================================')
  lines.push('')

  for (const day of mockMenuDiario) {
    const configId = configIds[day.dia]
    if (!configId) continue

    for (const seccion of day.secciones) {
      // Map section name to seccion enum
      const secMap: Record<string, string> = {
        'Primer Plato': 'primer',
        'Segundo Plato': 'segundo',
        'Postre': 'postre',
        'Bebida': 'bebida',
        'Pan y Cubiertos': 'pan',
      }
      const seccionKey = secMap[seccion.nombre] || 'primer'

      seccion.platos.forEach((plat, idx) => {
        const itemId = `menu-item-day${day.dia}-${seccionKey}-${idx}`
        const nombre = esc(plat.nombre)
        const desc = plat.descripcion ? `'${esc(plat.descripcion)}'` : 'NULL'

        lines.push(
          `INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)`,
          `VALUES (`,
          `  '${itemId}'::uuid,`,
          `  '${configId}'::uuid,`,
          `  '${seccionKey}',`,
          `  '${nombre}',`,
          `  ${desc},`,
          `  ${idx},`,
          `  now(),`,
          `  now()`,
          `)`,
          `ON CONFLICT (id) DO NOTHING;`,
          ``,
        )
      })
    }
  }

  // -----------------------------------------------------------------------
  // CONFIGURACION singleton
  // -----------------------------------------------------------------------
  lines.push('-- =============================================================================')
  lines.push('-- CONFIGURACION — singleton row (upsert)')
  lines.push('-- =============================================================================')
  lines.push('')
  lines.push(
    `INSERT INTO configuracion (id, cliente_elige_mesa, capacidad_total_local, created_at, updated_at)`,
    `VALUES (`,
    `  gen_random_uuid(),`,
    `  false,`,
    `  80,`,
    `  now(),`,
    `  now()`,
    `)`,
    `ON CONFLICT DO NOTHING;`,
    ``,
  )

  lines.push('COMMIT;')
  lines.push('')

  const outPath = resolve(import.meta.dirname, 'seed.sql')
  writeFileSync(outPath, lines.join('\n'), 'utf-8')
  console.log(`✅ Seed SQL written to ${outPath}`)
  console.log(`   ${allPlatos.length} platos, ${mockEventos.length} eventos, ${mockMenuDiario.length} menu days`)
}

main().catch(console.error)
