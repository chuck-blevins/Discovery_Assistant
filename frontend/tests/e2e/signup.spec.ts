import { test, expect } from '@playwright/test'

const UNIQUE_EMAIL = () => `testuser+${Date.now()}@example.com`
const VALID_PASSWORD = 'Password123'

test.describe('Sign Up flow', () => {
  test('valid signup redirects to dashboard', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('#email', UNIQUE_EMAIL())
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('duplicate email shows error', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    // First signup
    await page.goto('/signup')
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)

    // Logout
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL(/\/login/)

    // Second signup with same email
    await page.goto('/signup')
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.fill('#confirm', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('invalid password shows validation error', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('#email', UNIQUE_EMAIL())
    await page.fill('#password', 'short')
    await page.fill('#confirm', 'short')
    await page.click('button[type="submit"]')
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('link to login navigates to /login', async ({ page }) => {
    await page.goto('/signup')
    await page.click('a:has-text("Sign in")')
    await expect(page).toHaveURL(/\/login/)
  })
})
