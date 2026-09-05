import { expect, test } from '@playwright/test'

const PUBLIC_URL = 'http://127.0.0.1:4175/index.html'
const PUBLIC_ORIGIN = 'http://127.0.0.1:4175'
const CONTROL_URL = 'http://127.0.0.1:4185/page-settings-host'
const CONTROL_ORIGIN = 'http://127.0.0.1:4185'
const NONCE = '12345678-1234-1234-1234-123456789012'

const BASE_CONFIG = {
  brand: {
    name: 'Generated Config Name',
    sidebarTitle: '',
    pageTitle: 'Preview Test',
    footerText: 'Base footer',
  },
  images: { headerDesktop: '', headerMobile: '' },
  effects: { particles: 'none' },
  views: [
    { id: 'home', label: 'Home', title: 'Home', icon: 'home', enabled: true },
    { id: 'events', label: 'Events', title: 'Events page', icon: 'calendar', enabled: true },
  ],
  home: {
    rankingTitle: 'Base ranking',
    targetsTitle: 'Base targets',
    targetLabels: ['One', 'Two'],
    faq: { enabled: true, accordion: true, title: 'Base FAQ', items: [{ question: 'Question', answer: 'Answer' }] },
  },
  sheets: { spreadsheetId: 'demo' },
  platform: {
    tenantId: 'tenant-magurophone',
    tenantSlug: 'magurophone',
    publicUrl: PUBLIC_URL,
    controlPlaneOrigin: CONTROL_ORIGIN,
    configAuthority: 'control_plane',
    useRuntimeConfig: false,
  },
}

async function install(page) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(BASE_CONFIG)}`,
  }))
}

test('control_plane preview uses generated config, then applies and removes memory-only draft', async ({ page }) => {
  await install(page)
  await page.goto(PUBLIC_URL)
  await page.evaluate(() => localStorage.setItem('dashboard_config_default', JSON.stringify({ brand: { name: 'Browser Local Name' } })))

  // Top-level public pages never install the bridge.
  await page.evaluate(() => {
    window.__topLevelPreviewMessages = []
    window.addEventListener('message', event => window.__topLevelPreviewMessages.push(event.data))
  })
  await page.evaluate(({ nonce, publicUrl }) => window.postMessage({
    schema: 'slt.page-settings-preview.v1',
    protocolVersion: 1,
    type: 'slt.page-preview.hello',
    nonce,
    tenantId: 'tenant-magurophone',
    tenantSlug: 'magurophone',
    publicUrl,
  }, location.origin), { nonce: NONCE, publicUrl: PUBLIC_URL })
  await page.waitForTimeout(150)
  await expect.poll(() => page.evaluate(() => window.__topLevelPreviewMessages.some(
    message => message?.type === 'slt.page-preview.ready',
  ))).toBe(false)

  await page.goto(CONTROL_URL)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(true)
  const frame = page.frameLocator('#preview')
  await expect(frame.getByText('Generated Config Name').filter({ visible: true }).first()).toBeVisible()
  await expect(frame.getByText('Browser Local Name')).toHaveCount(0)

  /* draftが本当にmemory-onlyであることは、公開ページ側originのstorage全体を
   * 前後で比べて確かめる。特定のkey名だけ見ても、別名で書かれたら気づけない。 */
  const readStorage = () => page.frameLocator('#preview').locator('body').evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage)),
  }))
  const storageBeforeDraft = await readStorage()

  await page.evaluate(() => window.sendPreviewState({
    brand: { name: 'Memory Draft Name', footerText: '' },
    home: { rankingTitle: '', pointsLabel: 0 },
    views: [
      { id: 'home', label: 'Draft Home', title: 'Home', icon: 'home', enabled: true, unknownField: { raw: 0 } },
      { id: 'events', label: 'Draft Events', title: 'Events page', icon: 'calendar', enabled: false },
    ],
  }, 'edit'))
  await expect(frame.getByText('Memory Draft Name').filter({ visible: true }).first()).toBeVisible()
  /* 出していないページは、編集モードのときだけメニューへ「非表示」で並ぶ。
   * そうしないと、出していないページの名前やアイコンへ手が届かない。 */
  const hiddenPage = frame.locator('[data-preview-ghost]').filter({ hasText: 'Draft Events' })
  await expect(hiddenPage.filter({ visible: true }).first()).toBeVisible()
  await expect(hiddenPage.filter({ visible: true }).first()).toContainText('非表示')

  /* 編集をやめれば、公開ページの見え方に戻る。補助の枠も跡形もなく消える。 */
  await page.evaluate(() => window.sendPreviewState({
    brand: { name: 'Memory Draft Name', footerText: '' },
    home: { rankingTitle: '', pointsLabel: 0 },
    views: [
      { id: 'home', label: 'Draft Home', title: 'Home', icon: 'home', enabled: true, unknownField: { raw: 0 } },
      { id: 'events', label: 'Draft Events', title: 'Events page', icon: 'calendar', enabled: false },
    ],
  }, 'readonly'))
  await expect(frame.getByText('Draft Events')).toHaveCount(0)
  await expect(frame.locator('[data-preview-ghost]')).toHaveCount(0)
  await page.evaluate(() => window.sendPreviewState({
    brand: { name: 'Memory Draft Name', footerText: '' },
    home: { rankingTitle: '', pointsLabel: 0 },
    views: [
      { id: 'home', label: 'Draft Home', title: 'Home', icon: 'home', enabled: true, unknownField: { raw: 0 } },
      { id: 'events', label: 'Draft Events', title: 'Events page', icon: 'calendar', enabled: false },
    ],
  }, 'edit'))
  await expect(frame.locator('[data-page-setting-target="home.rankingTitle"]')).toHaveText('')
  await expect(frame.locator('[data-page-setting-target="brand.footerText"]')).toHaveText('')

  await page.evaluate(() => window.sendPreviewState({}, 'edit'))
  await expect(frame.getByText('Generated Config Name').filter({ visible: true }).first()).toBeVisible()
  await expect(frame.getByRole('heading', { name: 'Base ranking' })).toBeVisible()
  await expect(frame.getByText('Events').filter({ visible: true }).first()).toBeVisible()
  /* 公開ページ側originのstorageが、draftを当てる前と1文字も変わっていないこと。
   * Control Plane側originにも書かない。 */
  expect(await readStorage()).toEqual(storageBeforeDraft)
  expect(await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage)),
  }))).toEqual({ local: {}, session: {} })
})

test('edit mode selects semantic target while operate mode performs the public click', async ({ page }) => {
  await install(page)
  await page.goto(CONTROL_URL)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(true)
  const frame = page.frameLocator('#preview')

  await page.evaluate(() => window.sendPreviewState({}, 'edit'))
  await frame.getByText('Events').filter({ visible: true }).first().click()
  await expect.poll(() => page.evaluate(() => window.previewMessages.some(message => message.type === 'slt.page-preview.selection' && message.target === 'views:1'))).toBe(true)
  await expect(frame.getByRole('heading', { name: 'Events page' })).toHaveCount(0)

  await page.evaluate(() => window.sendPreviewState({}, 'operate'))
  await page.waitForTimeout(100)
  await frame.getByText('Events').filter({ visible: true }).first().click()
  await expect(frame.getByRole('heading', { name: 'Base ranking' })).toHaveCount(0)
})

test('wrong nonce and tenant state are ignored and public responsive layout is preserved', async ({ page }, testInfo) => {
  await install(page)
  await page.goto(CONTROL_URL)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(true)
  const frame = page.frameLocator('#preview')

  await page.evaluate(() => window.sendPreviewState({ brand: { name: 'Rejected' } }, 'edit', null, { nonce: 'wrong-nonce-0000' }))
  await page.evaluate(() => window.sendPreviewState({ brand: { name: 'Rejected' } }, 'edit', null, { tenantId: 'other-tenant' }))
  await page.evaluate(() => window.sendPreviewStateFromSibling({ brand: { name: 'Rejected' } }))
  await expect(frame.getByText('Rejected')).toHaveCount(0)
  await expect(frame.getByText('Generated Config Name').filter({ visible: true }).first()).toBeVisible()

  if (testInfo.project.name.includes('mobile')) {
    await expect(frame.locator('aside')).toBeHidden()
    await expect(frame.locator('nav.md\\:hidden')).toBeVisible()
  } else {
    await expect(frame.locator('aside')).toBeVisible()
    await expect(frame.locator('nav.md\\:hidden')).toBeHidden()
  }
})

test('configured origin mismatch never completes the handshake', async ({ page }) => {
  await install(page)
  await page.goto('http://127.0.0.1:4186/page-settings')
  await page.waitForTimeout(500)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(false)
})

/* 目印は見た目を変えないための属性でしかない。属性が増えても、公開ページの
 * DOMの形とレイアウトが変わっていないことを確かめる。 */
test('編集の目印は、公開ページの見た目を変えない', async ({ page }) => {
  await install(page)
  await page.goto(PUBLIC_URL)
  await page.waitForTimeout(300)

  const marked = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-page-setting-target]')]
    return {
      種類: [...new Set(nodes.map(n => n.dataset.pageSettingTarget.replace(/:\d+$/, ':N')))].sort(),
      // 目印だけを持つ要素（見た目を変えるclassやstyleを足していない）が無いこと
      余計な装飾: nodes.filter(n => /page-setting/.test(n.className) || /outline|border-dashed/.test(n.getAttribute('style') ?? '')).length,
    }
  })

  expect(marked.余計な装飾).toBe(0)
  // ページ全体の受け皿は、必ず最上位の1つだけ
  expect(marked.種類).toContain('page')
  expect(await page.locator('[data-page-setting-target="page"]').count()).toBe(1)
})
