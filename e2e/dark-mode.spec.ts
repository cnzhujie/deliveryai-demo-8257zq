import { test, expect, type Page } from '@playwright/test'

/** Navigate from app start to the menu view where the TopBar (theme toggle) is visible. */
async function goToMenu(page: Page) {
  await page.goto('/')
  // Bind table
  await page.getByRole('button', { name: /A08/ }).first().click()
  // Welcome page - enter menu
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

/** Theme toggle button locator — aria-label is "切换主题" (zh) / "Switch theme" (en). */
function themeBtn(page: Page) {
  return page.getByRole('button', { name: '切换主题' })
}

/** Transition duration is 250ms (src/index.css); wait for transition before computed-style assertions. */
const TRANSITION_WAIT = 350

test.describe('夜间模式（Dark Mode）- E2E 验收测试', () => {
  test('E2E-DM-001: 点击主题切换按钮后背景变深色', async ({ page }) => {
    await goToMenu(page)
    // Initial mode is 'system' → resolves to light (Playwright default colorScheme: light)
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    // Cycle: system → light → dark
    await themeBtn(page).click() // system → light
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await themeBtn(page).click() // light → dark
    // Verify dark class on <html>
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    // Wait for CSS transition (250ms) before checking computed style
    await page.waitForTimeout(TRANSITION_WAIT)
    const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    // charcoal-900 = #211f1c = rgb(33, 31, 28)
    expect(bgColor).toBe('rgb(33, 31, 28)')
  })

  test('E2E-DM-002: 刷新后保持深色模式', async ({ page }) => {
    await goToMenu(page)
    // Cycle to dark mode
    await themeBtn(page).click() // system → light
    await themeBtn(page).click() // light → dark
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    // Verify localStorage persisted
    const stored = await page.evaluate(() => localStorage.getItem('theme-mode'))
    expect(stored).toBe('dark')
    // Reload — inline script in index.html sets dark class before React mounts
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  })

  test('E2E-DM-003: 夜间模式下超级辣弹窗仍正常', async ({ page }) => {
    await goToMenu(page)
    // Enable dark mode
    await themeBtn(page).click() // system → light
    await themeBtn(page).click() // light → dark
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    // Navigate to broth category and open product spec dialog
    await page.getByRole('button', { name: '锅底' }).click()
    const productCards = page.locator('article')
    await productCards.nth(0).locator('button').last().click()
    // Select super spicy
    await page.getByRole('button', { name: '超级辣' }).click()
    // Verify risk warning dialog visible in dark mode
    const warningText = page.getByText('您选择的「超级辣」辣度极高，可能对您的肠胃造成明显不适。请确认您能接受此辣度后再继续下单。')
    await expect(warningText).toBeVisible()
    await expect(page.getByRole('button', { name: '我已了解，继续下单' })).toBeVisible()
    await expect(page.getByRole('button', { name: '重新选择' })).toBeVisible()
  })

  test('E2E-DM-004: 夜间模式 + 老人模式叠加', async ({ page }) => {
    await goToMenu(page)
    // Enable dark mode
    await themeBtn(page).click() // system → light
    await themeBtn(page).click() // light → dark
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    // Enable elderly mode (aria-label toggles: initially "切换至老人模式")
    const elderlyBtn = page.getByRole('button', { name: '切换至老人模式' })
    await elderlyBtn.click()
    // Both classes should coexist on <html>
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(page.locator('html')).toHaveClass(/\belderly\b/)
    // Verify font-size is 125% (elderly mode: html { font-size: 125% })
    await page.waitForTimeout(TRANSITION_WAIT)
    const fontSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    // Browser default 16px × 125% = 20px
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(20)
  })

  test('E2E-DM-005: 三态循环切换', async ({ page }) => {
    await goToMenu(page)
    // Initial: system → light (Playwright default colorScheme: light)
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    // Click 1: system → light
    await themeBtn(page).click()
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await expect(page.getByText('已切换为日间模式')).toBeVisible()
    // Click 2: light → dark
    await themeBtn(page).click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(page.getByText('已切换为夜间模式')).toBeVisible()
    // Click 3: dark → system
    await themeBtn(page).click()
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await expect(page.getByText('已切换为跟随系统')).toBeVisible()
  })
})
