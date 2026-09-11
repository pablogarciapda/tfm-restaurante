/**
 * shared/utils/pos-ticket.ts — ESC/POS ticket builder for reservation printing
 *
 * Pure functions — no I/O. The POS agent (tools/pos-agent) sends the resulting
 * bytes to the Epson TM-T20III (M267D, Ethernet) on TCP port 9100.
 *
 * Printer targets: 80mm thermal, ~42 printable columns (font A).
 * Accents are transliterated so the ticket is safe regardless of the
 * printer's active codepage.
 *
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/utils'].
 */

export const POS_INIT = Uint8Array.from([0x1b, 0x40]) // ESC @ — initialize
export const POS_PARTIAL_CUT = Uint8Array.from([0x1d, 0x56]) // GS V — cut
export const POS_CUT_FEED_LINES = Uint8Array.from([0x42, 0x00]) // 'B', feed lines param 0

/** ESC/POS ticket width in monospace characters (80mm, font A, safe margin). */
export const POS_TICKET_WIDTH = 42

/** Rough byte-visual width for accented chars when transliteration is off. */
export function transliterate(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
}

export interface PosTicketData {
  referencia: string
  fecha_hora: string
  numero_comensales: number | null
  nombre: string
  apellidos?: string | null
  telefono?: string | null
  zona?: string | null
  mesa_num?: number | null
  restaurante?: string | null
}

/** Format fecha_hora as Europe/Madrid local "dd/mm/yyyy  HH:MMh". */
function fechaLocal(fecha_hora: string): string {
  const d = new Date(fecha_hora)
  const dia = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' })
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
  return `${dia}  ${hora}h`
}

function repeat(char: string, n = POS_TICKET_WIDTH): string {
  return char.repeat(n)
}

/** Center a line within the ticket width. */
function center(text: string, width = POS_TICKET_WIDTH): string {
  const t = transliterate(text).slice(0, width)
  const pad = Math.max(0, Math.floor((width - t.length) / 2))
  return ' '.repeat(pad) + t
}

/** Aligned column pair: label left, value right-padded at col 14. */
function row(label: string, value: string, labelWidth = 13): string {
  const l = transliterate(label).slice(0, labelWidth)
  const v = transliterate(value)
  return l.padEnd(labelWidth) + v
}

/**
 * Build the ticket as plain text lines (pure, easy to test).
 * The agent then wraps them with ESC/POS commands via posTicketBytes().
 */
export function buildPosTicketLines(data: PosTicketData): string[] {
  const nombreCompleto = data.apellidos ? `${data.nombre} ${data.apellidos}` : data.nombre
  const sep = '-'.repeat(POS_TICKET_WIDTH)
  const nombreCompletoDiv = nombreCompleto ? `${nombreCompleto}` : '—'
  const zonaValue = data.mesa_num != null ? `${data.zona || ''} — Mesa ${data.mesa_num}` : (data.zona || '')

  const lines: string[] = []
  lines.push(sep)
  if (data.restaurante) lines.push(center(data.restaurante.toUpperCase()))
  lines.push(center('NUEVA RESERVA WEB'))
  lines.push(sep)
  lines.push('')
  lines.push(`Ref:  ${transliterate(data.referencia)}`)
  lines.push(fechaLocal(data.fecha_hora))
  lines.push('')
  lines.push(row('Pax:', `${data.numero_comensales ?? '—'}`))
  lines.push(row('Cliente:', nombreCompletoDiv, 13).slice(0, POS_TICKET_WIDTH))
  if (data.telefono) lines.push(row('Telf:', data.telefono))
  if (zonaValue) lines.push(row('Zona:', zonaValue, 13))
  lines.push('')
  lines.push(sep)

  return lines
}



/**
 * Wrap text lines into raw ESC/POS bytes: init, LF-terminated lines,
 * paper feed and partial cut.
 */
export function posTicketBytes(lines: string[]): Uint8Array {
  const text = lines.map((l) => transliterate(l)).join('\n') + '\n\n\n'
  const textBytes: number[] = Array.from(new TextEncoder().encode(text))
  return Uint8Array.from([...POS_INIT, ...textBytes, 0x0a, 0x0a, 0x0a, ...POS_PARTIAL_CUT, ...POS_CUT_FEED_LINES])
}
