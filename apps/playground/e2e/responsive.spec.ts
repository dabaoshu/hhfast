import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('mobile navigation fits the viewport and closes after navigation', async ({ page }) => {
  await page.goto('/ui/modal')
  await expect(page.getByRole('button', { name: '打开示例导航' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('button', { name: '打开示例导航' }).click()
  await expect(page.locator('.pg-sidebar')).toHaveClass(/pg-sidebar--open/)
  await page.getByRole('link', { name: 'Drawer' }).click()
  await expect(page).toHaveURL(/\/ui\/drawer$/)
  await expect(page.locator('.pg-sidebar')).not.toHaveClass(/pg-sidebar--open/)
})
