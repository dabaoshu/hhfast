import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/ui/toast', '/ui/modal', '/ui/icon', '/ui/table', '/ui/tooltip', '/ui/popover',
  '/ui/splitter', '/ui/tree', '/ui/drawer', '/utils/background-task-manager',
  '/utils/task-execution-chain', '/utils/resumable-transfer', '/utils/json-to-tree',
  '/utils/curl-parser', '/utils/works-chain',
]

for (const route of routes) {
  test(`${route} renders without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(route)
    await expect(page.locator('.pg-main')).not.toBeEmpty()
    if (route === '/') {
      await expect(page.getByRole('heading', { name: /Vue 3 UI primitives/ })).toBeVisible()
      await expect(page.getByRole('link', { name: 'View UI demos' })).toHaveAttribute('href', '/ui/table')
    }
    expect(errors).toEqual([])
  })
}
