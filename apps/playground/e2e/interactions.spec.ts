import { expect, test } from '@playwright/test'

test('Toast, Modal, and Drawer demos expose their core interaction', async ({ page }) => {
  await page.goto('/ui/toast')
  await page.getByRole('button', { name: 'Success' }).click()
  await expect(page.getByText('操作成功')).toBeVisible()

  await page.goto('/ui/modal')
  await page.getByRole('button', { name: '打开基础弹层' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.goto('/ui/drawer')
  await page.getByRole('button', { name: '打开抽屉' }).click()
  await expect(page.getByRole('dialog', { name: 'Drawer 标题' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})
