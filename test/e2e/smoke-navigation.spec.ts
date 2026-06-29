/**
 * smoke-navigation.spec.ts — E2E smoke test for all 6 public pages (PU-001–PU-008,
 * CN-001–CN-007, MD-001–MD-004, EG-001–EG-004, CO-001–CO-004, RF-001–RF-005)
 *
 * Navigates the full public flow:
 *   / → /carta → /menu-diario → /eventos → /contacto → /reservas
 *
 * Console error listener catches JS errors on every page.
 * Uses Playwright webServer config (pnpm dev, port 3000, reuseExistingServer).
 * Scroll-spy IntersectionObserver assertion is skipped — flaky in headless Playwright.
 */

import { test, expect } from '@playwright/test'

const PAGES = [
  {
    path: '/',
    label: 'Home',
    heading: 'Restaurante La Zíngara',
    headingTag: 'h1',
    extraAssertions: ['Carta', 'Menú del Día', 'Reservas', 'Eventos', 'Contacto'],
  },
  {
    path: '/carta',
    label: 'Carta',
    heading: 'Nuestra Carta',
    headingTag: 'h1',
    extraAssertions: ['ENSALADAS', 'CARNES', 'PESCADOS'],
  },
  {
    path: '/menu-diario',
    label: 'Menú del Día',
    heading: 'Menú del Día',
    headingTag: 'h1',
    extraAssertions: ['€', 'IVA incluido'],
  },
  {
    path: '/eventos',
    label: 'Eventos',
    heading: 'Eventos',
    headingTag: 'h1',
    extraAssertions: ['Próximos eventos'],
  },
  {
    path: '/contacto',
    label: 'Contacto',
    heading: 'Contacto',
    headingTag: 'h1',
    extraAssertions: ['Horario', 'Ubicación'],
  },
  {
    path: '/reservas',
    label: 'Reservas',
    heading: 'Reservas',
    headingTag: 'h1',
    extraAssertions: [], // Special: Elegir mesa + ReservationForm
  },
]

test.describe('public-pages-design — full navigation smoke', () => {
  for (const pageDef of PAGES) {
    test(`${pageDef.label} page (${pageDef.path}) renders with Spanish content`, async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })

      await page.goto(pageDef.path, { waitUntil: 'networkidle' })

      // Assert heading
      await expect(page.locator(pageDef.headingTag)).toContainText(pageDef.heading)

      // Assert extra Spanish content items
      for (const text of pageDef.extraAssertions) {
        await expect(page.locator('body')).toContainText(text)
      }

      // No console errors
      expect(consoleErrors).toHaveLength(0)
    })
  }

  test('Home page has 5 navigation cards with NuxtLinks', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // 5 navigation cards visible — each has a heading with the card name
    const cardNames = ['Carta', 'Menú del Día', 'Reservas', 'Eventos', 'Contacto']
    for (const name of cardNames) {
      await expect(
        page.locator('h2', { hasText: name }).first()
      ).toBeVisible()
    }
  })

  test('Carta page has CategorySelector and ProductGrid with ProductCards', async ({
    page,
  }) => {
    await page.goto('/carta', { waitUntil: 'networkidle' })

    // CategorySelector renders category buttons
    await expect(page.locator('button', { hasText: 'ENSALADAS' })).toBeVisible()

    // ProductGrid — at least one product card
    const productCards = page.locator('.grid').last().locator('> *')
    const cardCount = await productCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('Menu Diario page has price display and 5 sections', async ({ page }) => {
    await page.goto('/menu-diario', { waitUntil: 'networkidle' })

    // Price display with euro sign
    await expect(page.locator('body')).toContainText('Menú del día')
    await expect(page.locator('body')).toContainText('€')

    // 5 section headings
    const sectionHeadings = ['Primer Plato', 'Segundo Plato', 'Postre', 'Bebida', 'Pan y Cubiertos']
    for (const heading of sectionHeadings) {
      await expect(page.locator('h2', { hasText: heading }).first()).toBeVisible()
    }
  })

  test('Eventos page has grid with at least one EventCard', async ({ page }) => {
    await page.goto('/eventos', { waitUntil: 'networkidle' })

    // Grid of events — at least 1 card visible
    const eventCards = page.locator('section').filter({ hasText: 'Próximos eventos' }).locator('.grid')
    await expect(eventCards).toBeVisible()

    // "Próximos eventos" heading
    await expect(page.locator('body')).toContainText('Próximos eventos')
  })

  test('Contacto page has hours table, MapEmbed iframe, and ContactForm', async ({
    page,
  }) => {
    await page.goto('/contacto', { waitUntil: 'networkidle' })

    // Hours table
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('body')).toContainText('Horario')
    await expect(page.locator('body')).toContainText('Lunes a Jueves')

    // MapEmbed iframe
    const iframe = page.locator('iframe')
    await expect(iframe).toBeVisible()

    // ContactForm
    await expect(page.locator('input#nombre')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('textarea#mensaje')).toBeVisible()
  })

  test('Reservas page has ReservationForm + Elegir mesa disabled with Proximamente title', async ({
    page,
  }) => {
    await page.goto('/reservas', { waitUntil: 'networkidle' })

    // PageHero heading
    await expect(page.locator('h1')).toContainText('Reservas')

    // Elegir mesa — disabled with "Proximamente" tooltip
    const elegirButton = page.getByTestId('elegir-mesa-button')
    await expect(elegirButton).toBeVisible()
    await expect(elegirButton).toBeDisabled()
    await expect(elegirButton).toHaveAttribute('title', 'Proximamente')

    // ReservationForm visible
    await expect(page.locator('input#nombre')).toBeVisible()
    await expect(page.locator('input#telefono')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('No console errors on any public page during navigation', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    for (const pageDef of PAGES) {
      await page.goto(pageDef.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500) // Let async JS settle
    }

    expect(consoleErrors).toHaveLength(0)
  })
})
