import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pages that do not need a logged-in host, so they can be scanned directly
const pages = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
]

for (const { name, path } of pages) {
  test(`${name} page has no serious or critical accessibility problems`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map(v => `${v.id}: ${v.help}`)).toEqual([])
  })
}
