import { test, expect } from '@playwright/test'

const UNIQUE_EMAIL = () => `testuser+${Date.now()}@example.com`
const VALID_PASSWORD = 'Password123'

async function createUser(page: import('@playwright/test').Page, email: string) {
  await page.goto('/signup')
  await page.fill('#email', email)
  await page.fill('#password', VALID_PASSWORD)
  await page.fill('#confirm', VALID_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/)
  await page.click('button:has-text("Logout")')
  await expect(page).toHaveURL(/\/login/)
}

test.describe('Login flow', () => {
  test('valid credentials redirect to dashboard', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    await createUser(page, email)
    await page.fill('#email', email)
    await page.fill('#password', VALID_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('wrong password shows error', async ({ page }) => {
    const email = UNIQUE_EMAIL()
    await createUser(page, email)
    await page.fill('#email', email)
    await page.fill('#password', 'WrongPass999')
    await page.click('button[type="submit"]')
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('link to signup navigates to /signup', async ({ page }) => {
    await page.goto('/login')
    await page.click('a:has-text("Sign up")')
    await expect(page).toHaveURL(/\/signup/)
  })
})
