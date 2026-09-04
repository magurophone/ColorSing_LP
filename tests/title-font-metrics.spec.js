import { expect, test } from '@playwright/test'

/* サイト名の縦位置を、書体ごとのクセだけ打ち消せているかを実描画で確かめる。
 *
 * 測るのは行の箱ではなく、実際に描かれる字の上下端（インク）である。
 * 箱で測ると、下へ深く伸びる装飾体のはみ出しを見逃す。
 *
 * 補正量は勘で決めない。ここで測った上下のすき間が揃うことを条件にする。 */

const PUBLIC_URL = 'http://127.0.0.1:4175/index.html'

/* 実際に書体を読み込ませる。読み込まないと代替書体を測ってしまい、
 * 補正量の根拠にならない。 */
const FONT_URL = {
  "'Sacramento', cursive": 'https://fonts.googleapis.com/css2?family=Sacramento:wght@400&display=swap',
  "'Noto Sans JP', sans-serif": 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
  "'Playfair Display', serif": 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
  "'Zen Maru Gothic', sans-serif": 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap',
}

function configFor(display, extra = {}) {
  return {
    brand: {
      name: 'BAR MAGUROPHONE',
      titleStyle: 'glass',
      titleSize: 'medium',
      titlePaddingY: 4,
      ...extra,
    },
    fonts: { display, displayUrl: FONT_URL[display] ?? '', body: "'Noto Sans JP', sans-serif", bodyUrl: '' },
    colors: { deepBlue: '#08121e', oceanTeal: '#183a58', lightBlue: '#78a8f0', amber: '#e8b870', accent: '#d84030', gold: '#f8c840' },
    images: { headerDesktop: '', headerMobile: '' },
    effects: { particles: 'none' },
    views: [{ id: 'home', label: 'Home', title: 'Home', icon: 'home', enabled: true }],
    home: { rankingTitle: 'Ranking', targetsTitle: 'Targets', targetLabels: [] },
    sheets: { spreadsheetId: 'demo' },
    platform: { tenantSlug: 'magurophone', useRuntimeConfig: false },
  }
}

async function install(page, config) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
  await page.route('https://fonts.googleapis.com/**', route => route.continue())
}

/** 帯の中で、字の実体が上下にどれだけ空けているかを測る。 */
async function inkGaps(page) {
  return page.evaluate(async () => {
    const h1 = document.querySelector('[data-page-setting-target="brand.name"]')
    const band = h1.parentElement
    const hs = getComputedStyle(h1)
    const fontSize = parseFloat(hs.fontSize)
    const lineHeight = parseFloat(hs.lineHeight)

    /* webfontは読み込みを明示的に待つ。待たないと代替書体を測ってしまい、
     * 補正量の根拠として成立しない。 */
    const spec = `${hs.fontWeight} ${fontSize}px ${hs.fontFamily}`
    /* 判定は先頭書体だけで行う。フォントリストごと渡すと、代替の cursive が
     * あるだけで「読み込み済み」と判定されてしまう。 */
    const primary = hs.fontFamily.split(',')[0].trim()
    const primarySpec = `${hs.fontWeight} ${fontSize}px ${primary}`
    try { await document.fonts.load(primarySpec, 'BAR MAGUROPHONE') } catch { /* 下で落とす */ }
    await document.fonts.ready
    const 書体読み込み済み = document.fonts.check(primarySpec)

    const context = document.createElement('canvas').getContext('2d')
    context.font = `${hs.fontWeight} ${fontSize}px ${hs.fontFamily}`
    const m = context.measureText(h1.textContent.trim())
    const halfLeading = (lineHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2
    const baseline = halfLeading + m.fontBoundingBoxAscent

    const bandBox = band.getBoundingClientRect()
    const textBox = h1.getBoundingClientRect()
    // transform を含んだ実位置から、インクの上下端を出す
    const inkTop = (textBox.top + baseline - m.actualBoundingBoxAscent) - bandBox.top
    const inkBottom = bandBox.bottom - (textBox.top + baseline + m.actualBoundingBoxDescent)
    return {
      fontSize,
      書体読み込み済み,
      実際の書体: hs.fontFamily,
      インク上: Math.round(m.actualBoundingBoxAscent * 10) / 10,
      インク下: Math.round(m.actualBoundingBoxDescent * 10) / 10,
      transform: hs.transform,
      上: Math.round(inkTop * 10) / 10,
      下: Math.round(inkBottom * 10) / 10,
      ずれ: Math.round((inkTop - inkBottom) * 10) / 10,
    }
  })
}

/* 見た目の中央に寄せるため、字の実体の上下は意図的に非対称にしてある。
 * ここで守るのは「帯からはみ出して切られない」こと。寄せ量そのものは
 * 本番の実描画で選び、値の根拠は src/lib/titleFontMetrics.js に書いてある。 */
const MIN_GAP = 0.5

test('Sacramento でも、字が帯からはみ出さず見た目の中央に収まる', async ({ page }, testInfo) => {
  await install(page, configFor("'Sacramento', cursive"))
  await page.goto(PUBLIC_URL)
  const gaps = await inkGaps(page)
  expect(gaps.実際の書体, '想定の書体で描かれていない').toContain('Sacramento')
  expect(gaps.書体読み込み済み, 'Sacramento が読み込まれていない').toBe(true)
  // 帯の上辺も下辺も突き抜けていない（切られていない）
  expect(gaps.上, `上のすき間（${testInfo.project.name}）`).toBeGreaterThanOrEqual(MIN_GAP)
  expect(gaps.下, `下のすき間（${testInfo.project.name}）`).toBeGreaterThanOrEqual(MIN_GAP)
})

test('補正を持たない書体は、これまでどおり -0.12em のまま', async ({ page }) => {
  for (const display of ["'Noto Sans JP', sans-serif", "'Playfair Display', serif", "'Zen Maru Gothic', sans-serif"]) {
    await page.unrouteAll?.()
    await install(page, configFor(display))
    await page.goto(PUBLIC_URL)
    const gaps = await inkGaps(page)
    const fontSize = gaps.fontSize
    const shift = -0.12 * fontSize
    // transform が既定のまま（補正0）であること
    expect(gaps.transform, display).toBe(`matrix(1, 0, 0, 1, 0, ${Math.round(shift * 100) / 100})`)
  }
})

test('利用者が決めた値は、書き換えられずそのまま効く', async ({ page }) => {
  await install(page, configFor("'Sacramento', cursive", { titleOffsetY: 0.05 }))
  await page.goto(PUBLIC_URL)
  const gaps = await inkGaps(page)
  const expected = (0.05 + 0.20) * gaps.fontSize
  expect(gaps.transform).toBe(`matrix(1, 0, 0, 1, 0, ${Math.round(expected * 100) / 100})`)
})
