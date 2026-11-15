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
    await page.waitForLoadState('networkidle')
    // Scroll through the page so sections that fade in on view are visible before the check
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(500)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map(v => `${v.id}: ${v.help} -> ${v.nodes.slice(0, 5).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })
}
