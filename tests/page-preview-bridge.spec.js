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

  await page.goto(CONTROL_URL)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(true)
  const frame = page.frameLocator('#preview')
  await expect(frame.getByText('Generated Config Name').filter({ visible: true }).first()).toBeVisible()
  await expect(frame.getByText('Browser Local Name')).toHaveCount(0)

  await page.evaluate(() => window.sendPreviewState({
    brand: { name: 'Memory Draft Name', footerText: '' },
    home: { rankingTitle: '', pointsLabel: 0 },
    views: [
      { id: 'home', label: 'Draft Home', title: 'Home', icon: 'home', enabled: true, unknownField: { raw: 0 } },
      { id: 'events', label: 'Draft Events', title: 'Events page', icon: 'calendar', enabled: false },
    ],
  }, 'edit'))
  await expect(frame.getByText('Memory Draft Name').filter({ visible: true }).first()).toBeVisible()
  await expect(frame.getByText('Draft Events')).toHaveCount(0)
  await expect(frame.locator('[data-page-setting-target="home.rankingTitle"]')).toHaveText('')
  await expect(frame.locator('[data-page-setting-target="brand.footerText"]')).toHaveText('')

  await page.evaluate(() => window.sendPreviewState({}, 'edit'))
  await expect(frame.getByText('Generated Config Name').filter({ visible: true }).first()).toBeVisible()
  await expect(frame.getByRole('heading', { name: 'Base ranking' })).toBeVisible()
  await expect(frame.getByText('Events').filter({ visible: true }).first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('draft') ?? sessionStorage.getItem('draft'))).toBe(null)
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
  await frame.getByText('Events').filter({ visible: true }).first().click()
  await expect(frame.getByRole('heading', { name: 'Events page' })).toBeVisible()
})

test('wrong nonce and tenant state are ignored and public responsive layout is preserved', async ({ page }, testInfo) => {
  await install(page)
  await page.goto(CONTROL_URL)
  await expect.poll(() => page.evaluate(() => window.previewReady)).toBe(true)
  const frame = page.frameLocator('#preview')

  await page.evaluate(() => window.sendPreviewState({ brand: { name: 'Rejected' } }, 'edit', null, { nonce: 'wrong-nonce-0000' }))
  await page.evaluate(() => window.sendPreviewState({ brand: { name: 'Rejected' } }, 'edit', null, { tenantId: 'other-tenant' }))
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
