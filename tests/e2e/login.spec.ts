import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/password/i)).toBeVisible()
  })

  test('should show demo accounts', async ({ page }) => {
    await expect(page.getByText(/admin@amira-capstone.com/i)).toBeVisible()
    await expect(page.getByText(/researcher@amira-capstone.com/i)).toBeVisible()
    await expect(page.getByText(/panel@amira-capstone.com/i)).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('researcher@amira-capstone.com')
    await page.getByPlaceholder(/password/i).fill('researcher123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill('researcher@amira-capstone.com')
    await page.getByPlaceholder(/password/i).fill('researcher123')
    await page.getByRole('button', { name: /sign in/i }).click()
  })

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByText(/total devices/i)).toBeVisible()
  })

  test('should navigate to testing center', async ({ page }) => {
    await page.getByRole('link', { name: /testing/i }).click()
    await expect(page.getByRole('heading', { name: /testing center/i })).toBeVisible()
  })

  test('should navigate to SDN page', async ({ page }) => {
    await page.getByRole('link', { name: /sdn network/i }).click()
    await expect(page.getByRole('heading', { name: /sdn network/i })).toBeVisible()
  })
})
