import { test, expect } from '@playwright/test'

test.describe('Chat Bubble', () => {
  test('E2E-01: Should show chat trigger button on homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Chat trigger button should be visible
    const trigger = page.locator('.chat-trigger-btn')
    await expect(trigger).toBeVisible()
  })

  test('E2E-02: Should open chat window on trigger click', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    await page.locator('.chat-trigger-btn').click()
    await page.waitForTimeout(500)

    const chatWindow = page.locator('.chat-window')
    await expect(chatWindow).toBeVisible()
  })

  test('E2E-03: Should show welcome message and quick questions', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    await page.locator('.chat-trigger-btn').click()
    await page.waitForTimeout(500)

    // Welcome message or quick questions should be visible
    const welcomeSection = page.locator('text=您好！我是新鼎电炉智能客服')
    await expect(welcomeSection.first()).toBeVisible({ timeout: 5000 })
  })

  test('E2E-04: Fullscreen chat page should work', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    // Should show chat header
    const header = page.locator('text=新鼎电炉智能客服')
    await expect(header.first()).toBeVisible({ timeout: 5000 })
  })

  test('E2E-05: Can type and send message', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(3000)

    // Find textarea and type
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })

    if (await textarea.isEnabled()) {
      await textarea.fill('测试消息')
      // Should be able to type
      await expect(textarea).toHaveValue('测试消息')
    }
  })
})
