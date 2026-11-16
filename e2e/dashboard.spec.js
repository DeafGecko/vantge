import { test, expect } from '@playwright/test'

async function openSampleDashboard(page) {
  await page.goto('/try')
  await page.getByLabel('Access code').fill('Demo')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Use the sample party instead' }).click()
  await expect(page).toHaveURL(/\/try\/event$/)
}

test('typing a display name updates the live preview', async ({ page }) => {
  await openSampleDashboard(page)
  await page.getByPlaceholder('e.g. Columbia Deaf Church').fill('Riverside Wedding')
  await expect(page.getByText('Riverside Wedding').first()).toBeVisible()
})

test('the gallery switch toggles between open and closed', async ({ page }) => {
  await openSampleDashboard(page)
  const toggle = page.getByRole('button', { name: /Gallery (Open|Closed)/ }).first()
  const before = await toggle.textContent()
  await toggle.click()
  await expect(page.getByRole('button', { name: /Gallery (Open|Closed)/ }).first()).not.toHaveText(before ?? '')
})
