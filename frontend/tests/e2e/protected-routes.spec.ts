import { test, expect } from '@playwright/test'

const UNIQUE_EMAIL = () => `testuser+${Date.now()}@example.com`
const VALID_PASSWORD = 'Password123'

test.describe('Protected routes', () => {
  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Clear cookies to ensure no session
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('after login, /dashboard loads', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    await page.goto('/signup')
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Dashboard')).toBeVisible()
  })

  test('logout redirects to /login', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    await page.goto('/signup')
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL(/\/login/)
  })

  test('after logout, /dashboard redirects to /login', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    await page.goto('/signup')
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
