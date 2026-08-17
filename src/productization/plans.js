// 販売するプランの定義。
//
// ここで売っているのは歌推しページだけ。上位の総合管理ツールやSLTを混ぜない。
// 価格は上位指示書のとおりコードへ固定しない。設定から与えられていなければ
// 金額を作らず、準備中として扱う。

export const FAN_PAGE_PLAN_ID = 'fanpage'

// 歌推しページで見せられるもの。商品説明の根拠は既存のViewに限る。
const FAN_PAGE_FEATURES = [
  { id: 'listeners', title: 'リスナー一覧', detail: '応援してくれている人を、獲得した特典つきで並べられます。' },
  { id: 'ranking', title: 'ランキングと目標', detail: '今月の順位や目標までの進み具合を見せられます。' },
  { id: 'benefits', title: '特典の内容と獲得者', detail: 'どの応援でどの特典が受け取れるかと、受け取った人を公開できます。' },
  { id: 'icons', title: '枠内アイコン', detail: '配信の枠内で使うアイコンを、月ごとに掲載できます。' },
  { id: 'events', title: 'イベント', detail: '開催予定と過去の記録を残せます。' },
  { id: 'theme', title: '色とロゴの変更', detail: '配色、ロゴ、ヘッダー画像を自分のものに変えられます。' },
]

function normalizeAmount(value) {
  // 未設定と0円を取り違えない。Number(null) は 0 になるため型で先に弾く。
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null
}

export function resolvePlans(config = {}) {
  const configured = Array.isArray(config.plans) ? config.plans : []
  const fanPage = configured.find(plan => plan?.id === FAN_PAGE_PLAN_ID) ?? {}
  return [{
    id: FAN_PAGE_PLAN_ID,
    name: '歌推しページ',
    summary: '応援してくれるリスナーへ、特典とランキングを公開できる自分専用のページ。',
    features: FAN_PAGE_FEATURES,
    // 未設定なら金額を作らない。仮の数字を商品仕様に見せない。
    monthlyAmount: normalizeAmount(fanPage.monthlyAmount),
    currency: typeof fanPage.currency === 'string' && fanPage.currency ? fanPage.currency : 'JPY',
    sampleUrl: typeof fanPage.sampleUrl === 'string' ? fanPage.sampleUrl : '',
  }]
}

export function findPlan(config, planId) {
  return resolvePlans(config).find(plan => plan.id === planId) ?? null
}

export function describePrice(plan) {
  if (!plan || plan.monthlyAmount === null) {
    return { available: false, label: '料金は準備中です', note: '決まり次第この画面でお知らせします。' }
  }
  const amount = plan.currency === 'JPY'
    ? `${plan.monthlyAmount.toLocaleString('ja-JP')}円`
    : `${plan.monthlyAmount.toLocaleString('ja-JP')} ${plan.currency}`
  return { available: true, label: `月額 ${amount}`, note: 'いつでも停止できます。' }
}
