import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatReview,
  normalizeTierKey,
  reviewQuestionnaire,
  suggestSlug,
  validateSlug,
} from '../src/productization/questionnaire.js'

// 確認事項が無い回答。各テストはここから1点だけ崩す。
function baseAnswers() {
  return {
    urlUserName: 'yusuke',
    siteName: '歌推し様進捗スコア',
    adminPassword: 'not-reused-value',
    operationsSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/OPERATIONS/edit',
    applicationSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/APPLICATION/edit',
    themeImage: 'ダーク＋ゴールド',
    fontImage: 'やわらかい印象',
    faq: [],
    views: { home: false, benefitContents: true, benefitRights: true, frameIcons: true, events: false },
    tiers: [
      { key: '1k', label: '入門', benefit: '枠内専用ノーマルアイコン', unit: '', showUsers: false, showHistory: false, record: false },
      { key: '3k', label: 'サポーター', benefit: '名前入りアイコン', unit: '済', showUsers: true, showHistory: false, record: false },
    ],
  }
}

function confirms(review) {
  return review.findings.filter((finding) => finding.severity === 'confirm')
}

function corrections(review) {
  return review.findings.filter((finding) => finding.severity === 'correction')
}

test('表記の正規化とslug候補は機械的に決まる', () => {
  assert.equal(normalizeTierKey('１Ｋ'), '1k')
  assert.equal(normalizeTierKey('1 k'), '1k')
  assert.equal(normalizeTierKey(' 10K '), '10k')
  assert.equal(suggestSlug('😎ゆうすけ😎'), '')
  assert.equal(suggestSlug('Yusuke Tanaka'), 'yusuke-tanaka')
  assert.equal(validateSlug('yusuke').valid, true)
  assert.equal(validateSlug('ゆうすけ').valid, false)
  assert.equal(validateSlug('').reason, 'empty')
})

test('確認事項が無ければ正規化仕様を返し、特典管理列を順に組み立てる', () => {
  const review = reviewQuestionnaire(baseAnswers())
  assert.deepEqual(confirms(review), [])
  assert.equal(review.blocked, false)
  assert.equal(review.normalized.slug, 'yusuke')
  assert.deepEqual(review.normalized.enabledViews, ['benefitContents', 'benefitRights', 'frameIcons'])
  // A列はユーザー名、獲得者表示ありのティアだけを順に並べ、最後がSpecial。
  assert.deepEqual(review.normalized.rightsColumns, [
    { columnIndex: 0, header: 'ユーザー名', tierKey: '' },
    { columnIndex: 1, header: '3k', tierKey: '3k' },
    { columnIndex: 2, header: 'Special', tierKey: '' },
  ])
  // 獲得者を表示しないティアは列を持たない。
  assert.equal(review.normalized.rightsColumns.some((column) => column.tierKey === '1k'), false)
  assert.equal(review.normalized.tiers.find((tier) => tier.key === '3k').isBoolean, true)
  assert.deepEqual(review.normalized.recordTiers, [])
})

test('k/K・全角・空白の違いは補正として示し、勝手に確認を省かない', () => {
  const answers = baseAnswers()
  answers.tiers[1].key = '３Ｋ'
  const review = reviewQuestionnaire(answers)
  const correction = corrections(review).find((finding) => finding.original === '３Ｋ')
  assert.equal(correction.corrected, '3k')
  assert.equal(review.blocked, false)
  assert.equal(review.normalized.tiers[1].key, '3k')
})

test('表記を揃えると重複するティアは補正せず確認へ回す', () => {
  const answers = baseAnswers()
  answers.tiers.push({ key: '３ｋ', label: '重複', benefit: '別の特典', unit: '済', showUsers: true, showHistory: false, record: false })
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /同じティアが重複/.test(finding.concern)), true)
})

test('獲得者表示ありで単位が空欄なら確認する', () => {
  const answers = baseAnswers()
  answers.tiers[1].unit = ''
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /管理単位が決まっていません/.test(finding.concern)), true)
})

test('履歴表示とレコード機能の不一致を確認する', () => {
  const answers = baseAnswers()
  answers.tiers[1].showHistory = true
  answers.tiers[1].record = false
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /一致しません/.test(finding.concern)), true)
})

test('範囲条件のティアを済だけで管理してよいか確認する', () => {
  const answers = baseAnswers()
  answers.tiers.push({ key: '30k以上', label: 'レジェンド', benefit: '相談のうえ決定', unit: '済', showUsers: true, showHistory: false, record: false })
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /記録に残りません/.test(finding.concern)), true)
})

test('未確定の回答をそのまま掲載文にしない', () => {
  const answers = baseAnswers()
  answers.tiers[1].benefit = '要相談'
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /未確定/.test(finding.concern)), true)
})

test('日本語のURL用ユーザー名は候補を出し、作れない場合は確認する', () => {
  const withLatin = baseAnswers()
  withLatin.urlUserName = 'Yusuke さん'
  const suggested = reviewQuestionnaire(withLatin)
  assert.equal(corrections(suggested).some((finding) => finding.corrected === 'yusuke'), true)

  const withoutLatin = baseAnswers()
  withoutLatin.urlUserName = '😎ゆうすけ😎'
  const review = reviewQuestionnaire(withoutLatin)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => finding.field === 'urlUserName'), true)
})

test('申込回答シートを運用用として指定していないか確認する', () => {
  const answers = baseAnswers()
  answers.operationsSpreadsheetUrl = answers.applicationSpreadsheetUrl
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => /申込回答シート/.test(finding.concern)), true)
})

test('特典データがあるのに特典画面が無効なら確認する', () => {
  const answers = baseAnswers()
  answers.views.benefitContents = false
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(confirms(review).some((finding) => finding.field === 'views.benefitContents'), true)
})

test('確認が必要な間は正規化仕様を出さず、外部反映を始めさせない', () => {
  const answers = baseAnswers()
  answers.siteName = ''
  const review = reviewQuestionnaire(answers)
  assert.equal(review.blocked, true)
  assert.equal(review.normalized, null)
  const text = formatReview(review)
  assert.match(text, /外部反映は開始しない/)
})

test('提示形式は手順書の4見出しを保つ', () => {
  const text = formatReview(reviewQuestionnaire(baseAnswers()))
  assert.match(text, /【問題なし】/)
  assert.match(text, /【こちらで補正予定】/)
  assert.match(text, /【確認が必要】/)
  assert.match(text, /【反映予定の正規化仕様】/)
  assert.match(text, /特典管理列: ユーザー名、3k、Special/)
})

test('管理画面パスワードの値を検査結果へ出さない', () => {
  const answers = baseAnswers()
  answers.adminPassword = 'super-secret-value'
  const review = reviewQuestionnaire(answers)
  const serialized = JSON.stringify(review) + formatReview(review)
  assert.equal(serialized.includes('super-secret-value'), false)
})
