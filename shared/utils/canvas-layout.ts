export type CanvasTurno = 'comida' | 'cena'

export function isCanvasDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isCanvasTurno(value: unknown): value is CanvasTurno {
  return value === 'comida' || value === 'cena'
}
