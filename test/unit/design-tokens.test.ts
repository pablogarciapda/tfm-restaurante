import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * RED — Design tokens test (PU-001, PU-002)
 *
 * Asserts the @theme block in app/assets/css/main.css contains
 * the required terracotta-cream-slate palette and serif/sans font families.
 * The test reads the raw CSS file content rather than testing computed
 * browser styles, since happy-dom cannot resolve CSS cascade.
 */

function readMainCss(): string {
  const cssPath = resolve(__dirname, '../../app/assets/css/main.css')
  return readFileSync(cssPath, 'utf-8')
}

describe('PU-001: Design Tokens — @theme block', () => {
  it('defines --color-terracotta token (#C67B5C)', () => {
    const css = readMainCss()
    expect(css).toContain('--color-terracotta')
    expect(css).toMatch(/--color-terracotta\s*:\s*#C67B5C/)
  })

  it('defines --color-cream token (#FAF7F2)', () => {
    const css = readMainCss()
    expect(css).toContain('--color-cream')
    expect(css).toMatch(/--color-cream\s*:\s*#FAF7F2/)
  })

  it('defines --color-slate token (#2D3748)', () => {
    const css = readMainCss()
    expect(css).toContain('--color-slate')
    expect(css).toMatch(/--color-slate\s*:\s*#2D3748/)
  })
})

describe('PU-002: Typography — font tokens', () => {
  it('defines a serif font family', () => {
    const css = readMainCss()
    expect(css).toContain('--font-serif')
    expect(css).toMatch(/Playfair Display/)
  })

  it('defines a sans font family', () => {
    const css = readMainCss()
    expect(css).toContain('--font-sans')
    expect(css).toMatch(/Inter/)
  })
})
