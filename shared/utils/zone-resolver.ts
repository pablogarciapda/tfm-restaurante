import type { ZonaConfig } from '#shared/contracts/reservation.contract'

export interface ResolvedZone {
  id: string
  nombre: string
}

const LEGACY_ZONE_ALIASES: Record<string, string> = {
  principal: 'principal',
  zingaro: 'zingaro',
  privado: 'reservado',
  reservado: 'reservado',
  terraza: 'terraza',
  bar: 'bar',
}

export function normalizeZoneValue(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : ''
}

/** Resolve canonical IDs first, then display names and known historical aliases. */
export function resolveZone(
  value: unknown,
  zones: ZonaConfig[] | null | undefined,
  options: { requireEnabled?: boolean } = {},
): ResolvedZone | null {
  const rawValue = typeof value === 'string' ? value.trim() : ''
  const normalized = normalizeZoneValue(value)
  if (!normalized) return null

  const requireEnabled = options.requireEnabled ?? true
  const configured = (zones ?? []).find((zone) => {
    if (requireEnabled && zone.enabled === false) return false
    return normalizeZoneValue(zone.id) === normalized || normalizeZoneValue(zone.nombre) === normalized
  })
  if (configured) return { id: configured.id, nombre: configured.nombre }

  const aliasId = LEGACY_ZONE_ALIASES[normalized]
  if (!aliasId) return null
  const aliased = (zones ?? []).find((zone) => {
    if (requireEnabled && zone.enabled === false) return false
    return normalizeZoneValue(zone.id) === aliasId
  })
  if (!aliased && (zones ?? []).length === 0) return { id: aliasId, nombre: rawValue }
  return aliased ? { id: aliased.id, nombre: aliased.nombre } : null
}

export function zoneMatches(
  value: unknown,
  zone: ResolvedZone | ZonaConfig,
  zones: ZonaConfig[] | null | undefined,
): boolean {
  const resolved = resolveZone(value, zones, { requireEnabled: false })
  return resolved?.id === zone.id
}
