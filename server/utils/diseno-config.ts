/**
 * diseno-config.ts — File-based canvas design config
 *
 * Stores canvas base width/height in a JSON file so the admin
 * can configure them without needing a DB migration.
 *
 * CAN-001 — Canvas dimensions are persisted here and loaded
 *            by useDisenoConfig on the client.
 */

import { resolve } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

export interface DisenoConfig {
  canvas_ancho_base: number
  canvas_alto_base: number
}

const DEFAULT_CONFIG: DisenoConfig = {
  canvas_ancho_base: 1400,
  canvas_alto_base: 900,
}

function getConfigPath(): string {
  return resolve(process.cwd(), 'server/data/diseno-config.json')
}

export function readDisenoConfig(): DisenoConfig {
  const path = getConfigPath()
  if (!existsSync(path)) {
    return DEFAULT_CONFIG
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<DisenoConfig>
    return {
      canvas_ancho_base: parsed.canvas_ancho_base ?? DEFAULT_CONFIG.canvas_ancho_base,
      canvas_alto_base: parsed.canvas_alto_base ?? DEFAULT_CONFIG.canvas_alto_base,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function writeDisenoConfig(config: DisenoConfig): void {
  const path = getConfigPath()
  const dir = resolve(path, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8')
}
