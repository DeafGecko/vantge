import { test, expect } from '@playwright/test'

test('a wrong access code is refused', async ({ page }) => {
  await page.goto('/try')
  await page.getByLabel('Access code').fill('nope')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('That access code is not right')).toBeVisible()
})

test('the demo code opens the event name step, and an event name opens the dashboard', async ({ page }) => {
  await page.goto('/try')
  await page.getByLabel('Access code').fill('Demo')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name of your party or event').fill('Test Party')
  await page.getByRole('button', { name: 'Open event dashboard' }).click()
  await expect(page).toHaveURL(/\/try\/event$/)
  await expect(page.getByText('Test Party').first()).toBeVisible()
})

test('the demo guest page loads', async ({ page }) => {
  const response = await page.goto('/try/demo')
  expect(response?.status()).toBe(200)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('the demo frame has a reset control', async ({ page }) => {
  await page.goto('/try')
  await page.getByLabel('Access code').fill('Demo')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Use the sample party instead' }).click()
  await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible()
})
