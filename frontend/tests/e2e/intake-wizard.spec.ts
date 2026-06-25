import { test, expect } from '@playwright/test'

const VALID_PASSWORD = 'Password123'

async function signUpAndLogin(page: import('@playwright/test').Page) {
  const email = `wizard+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.fill('#email', email)
  await page.fill('#password', VALID_PASSWORD)
  await page.fill('#confirm', VALID_PASSWORD)
  await page.click('button[type="submit"]')
  // Signup auto-logs in. May redirect through /settings then / depending on LLM config.
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 8000 })
  // Ensure we land on a protected page (/ or /settings)
  await page.waitForURL(/\/(settings|$)/, { timeout: 8000 })
  return email
}

test.describe('Client Intake Wizard', () => {
  test('opens wizard from dashboard', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add Client with AI' })).toBeVisible()
  })

  test('Cancel closes the dialog', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.click('button:has-text("Cancel")')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Generate scope button disabled until company name entered', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')
    const generateBtn = page.getByRole('button', { name: /generate scope/i })
    const skipBtn = page.getByRole('button', { name: /skip ai/i })
    await expect(generateBtn).toBeDisabled()
    await expect(skipBtn).toBeDisabled()
    await page.fill('#intake-name', 'Acme Corp')
    await expect(generateBtn).toBeEnabled()
    await expect(skipBtn).toBeEnabled()
  })

  test('Skip AI path → Step 3 shows review card → Confirm navigates to client page', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')

    // Step 1
    await page.fill('#intake-name', 'E2E Test Client')
    await page.fill('#intake-context', 'B2B SaaS startup selling to HR teams')
    await page.fill('#intake-win', 'Signed first 10 enterprise deals')
    await page.click('button:has-text("Skip AI")')

    // Step 3 — review card
    await expect(page.getByRole('heading', { name: 'Review & Confirm' })).toBeVisible()
    await expect(page.getByText('E2E Test Client')).toBeVisible()
    await expect(page.getByText('Discovery (onboarding)')).toBeVisible()

    // Confirm & Create
    await page.click('button:has-text("Confirm & Create")')

    // Should navigate to the new client's page
    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'E2E Test Client' })).toBeVisible()
  })

  test('Skip AI with contact info → contact details visible on client page', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')

    await page.fill('#intake-name', 'Contact Test Co')
    await page.fill('#intake-contact-name', 'Jane Smith')
    await page.fill('#intake-contact-email', 'jane@example.com')
    await page.fill('#intake-website', 'https://example.com')
    await page.click('button:has-text("Skip AI")')

    await expect(page.getByRole('heading', { name: 'Review & Confirm' })).toBeVisible()
    await page.click('button:has-text("Confirm & Create")')

    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 10000 })
    await expect(page.getByText('Jane Smith')).toBeVisible()
    await expect(page.getByText('jane@example.com')).toBeVisible()
  })

  test('Back navigation from Step 3 returns to Step 1 with name preserved', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')

    await page.fill('#intake-name', 'Back Test Corp')
    await page.click('button:has-text("Skip AI")')
    await expect(page.getByRole('heading', { name: 'Review & Confirm' })).toBeVisible()

    await page.click('button:has-text("Back")')
    await expect(page.getByRole('heading', { name: 'Add Client with AI' })).toBeVisible()
    // Company name should be preserved
    await expect(page.locator('#intake-name')).toHaveValue('Back Test Corp')
  })

  test('new client appears in dashboard after creation', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/')
    await page.click('button:has-text("Add with AI")')

    const clientName = `List Test ${Date.now()}`
    await page.fill('#intake-name', clientName)
    await page.click('button:has-text("Skip AI")')
    await page.click('button:has-text("Confirm & Create")')

    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 10000 })

    // Navigate back to dashboard
    await page.goto('/')
    await expect(page.getByText(clientName)).toBeVisible()
  })
})
