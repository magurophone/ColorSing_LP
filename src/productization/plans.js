// 販売する商品の定義。
//
// 商品は2つある。歌推しページ単体と、上位の総合管理ツールを含むフルパッケージ
// （Pro）。いま売るのは歌推しページだけだが、構造まで歌推しページ専用にすると、
// Proを足すときに獲得導線と利用権の設計をやり直すことになる。
//
// 価格はコードへ固定しない。設定から与えられていなければ金額を作らず、準備中
// として扱う。未設定と0円を取り違えない。
//
// 利用権（entitlement）は、この商品IDでサーバー側が判定する。ブラウザが持って
// いる「購入済み」を認可の根拠にしない。

export const PRODUCT_ID = Object.freeze({
  FAN_PAGE: 'fanpage',
  PRO: 'pro',
})

// 販売中か、まだ出していないか。出していない商品は選ばせない。
export const PRODUCT_AVAILABILITY = Object.freeze({
  AVAILABLE: 'available',
  COMING_SOON: 'coming_soon',
})

// 後方互換。既存の呼び出しを壊さない。
export const FAN_PAGE_PLAN_ID = PRODUCT_ID.FAN_PAGE

// 歌推しページで見せられるもの。商品説明の根拠は既存のViewに限る。
const FAN_PAGE_FEATURES = [
  { id: 'listeners', title: 'リスナー一覧', detail: '応援してくれている人を、獲得した特典つきで並べられます。' },
  { id: 'ranking', title: 'ランキングと目標', detail: '今月の順位や目標までの進み具合を見せられます。' },
  { id: 'benefits', title: '特典の内容と獲得者', detail: 'どの応援でどの特典が受け取れるかと、受け取った人を公開できます。' },
  { id: 'icons', title: '枠内アイコン', detail: '配信の枠内で使うアイコンを、月ごとに掲載できます。' },
  { id: 'events', title: 'イベント', detail: '開催予定と過去の記録を残せます。' },
  { id: 'theme', title: '色とロゴの変更', detail: '配色、ロゴ、ヘッダー画像を自分のものに変えられます。' },
]

// Proの内訳はまだ確定していない。決まっていないものを箇条書きにして、
// 約束したように見せない。
const PRO_FEATURES = []

const CATALOG = [
  {
    id: PRODUCT_ID.FAN_PAGE,
    name: '歌推しページ',
    summary: '応援してくれるリスナーへ、特典とランキングを公開できる自分専用のページ。',
    features: FAN_PAGE_FEATURES,
    availability: PRODUCT_AVAILABILITY.AVAILABLE,
    // この商品で作れるもの。利用権の判定に使う。
    grants: ['fanpage'],
  },
  {
    id: PRODUCT_ID.PRO,
    name: 'Pro',
    summary: '歌推しページに加えて、配信まわりの管理をまとめて扱えるようにするもの。',
    features: PRO_FEATURES,
    availability: PRODUCT_AVAILABILITY.COMING_SOON,
    grants: ['fanpage', 'slt'],
  },
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
  return CATALOG.map(product => {
    const settings = configured.find(plan => plan?.id === product.id) ?? {}
    return {
      ...product,
      // 未設定なら金額を作らない。仮の数字を商品仕様に見せない。
      monthlyAmount: normalizeAmount(settings.monthlyAmount),
      currency: typeof settings.currency === 'string' && settings.currency ? settings.currency : 'JPY',
      sampleUrl: typeof settings.sampleUrl === 'string' ? settings.sampleUrl : '',
    }
  })
}

/** いま申し込める商品だけ。準備中のものを選ばせない。 */
export function resolvePurchasablePlans(config = {}) {
  return resolvePlans(config).filter(plan => plan.availability === PRODUCT_AVAILABILITY.AVAILABLE)
}

export function findPlan(config, planId) {
  return resolvePlans(config).find(plan => plan.id === planId) ?? null
}

/** この商品で歌推しページを作れるか。利用権の判定はサーバー側が正だが、画面の出し分けに使う。 */
export function grantsFanPage(plan) {
  return Array.isArray(plan?.grants) && plan.grants.includes('fanpage')
}

export function describePrice(plan) {
  if (plan && plan.availability === PRODUCT_AVAILABILITY.COMING_SOON) {
    return { available: false, label: '準備中', note: '公開までお待ちください。' }
  }
  if (!plan || plan.monthlyAmount === null) {
    return { available: false, label: '料金は準備中です', note: '決まり次第この画面でお知らせします。' }
  }
  const amount = plan.currency === 'JPY'
    ? `${plan.monthlyAmount.toLocaleString('ja-JP')}円`
    : `${plan.monthlyAmount.toLocaleString('ja-JP')} ${plan.currency}`
  return { available: true, label: `月額 ${amount}`, note: 'いつでも停止できます。' }
}
