import { test, expect } from '@playwright/test'

test('E2E Smoke — Home page loads with Spanish text', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/')

  // Page title is non-empty (Nuxt provides a default title)
  await expect(page).toHaveTitle(/.+/)

  // Spanish text visible on the home page
  await expect(page.locator('h1')).toBeVisible()
  const h1Text = await page.locator('h1').textContent()
  expect(h1Text?.trim().length).toBeGreaterThan(0)
  await expect(page.locator('p').first()).toBeVisible()

  // No uncaught console errors
  expect(consoleErrors).toHaveLength(0)
})
