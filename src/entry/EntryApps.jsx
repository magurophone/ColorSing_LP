import { useCallback, useMemo, useState } from 'react'
import { loadConfig } from '../lib/configIO'
import { PLACEHOLDER_NOTICE, isLocalPreview } from '../productization/localPreview'
import { FAN_PAGE_PLAN_ID, describePrice, findPlan } from '../productization/plans'
import {
  loadAcquisitionSession,
  recordAccount,
  recordEntitlement,
  selectPlan,
} from '../productization/acquisitionSession'

// 決済と認証の事業者は未確定。注入されていなければ受付を開かず、準備中として
// 正直に示す。押せない操作を置かない。
// 開発機のブラウザだけは、通しで確認できるよう仮処理を使う。仮であることは
// 画面へ明示し、本番では決して開かない。
function resolveEntryAdapters() {
  const injected = typeof window !== 'undefined' ? window.__entryAdapters : null
  // 注入されている場合は、中身が空でもそれを正とする。未接続の本番を再現できる。
  if (injected) {
    return { payment: injected.payment ?? null, identity: injected.identity ?? null, placeholder: false }
  }
  if (!isLocalPreview()) return { payment: null, identity: null, placeholder: false }
  return {
    placeholder: true,
    payment: { async requestEntitlement() { return { status: 'granted' } } },
    identity: { async createAccount() { return { status: 'ready' } } },
  }
}

const PAGES = {
  products: './products.html',
  start: './start.html',
  signup: './signup.html',
  fanpageCreate: './fanpage-create.html',
  admin: './admin.html',
}

function Shell({ title, lead, children, testId, back }) {
  return (
    <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid={testId}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold text-highlight">{title}</h1>
        {lead && <p className="mt-3 text-sm leading-relaxed text-gray-300">{lead}</p>}
        {children}
        {back && (
          <p className="mt-8 text-sm">
            <a href={back.href} className="text-light-blue underline" data-testid="entry-back">{back.label}</a>
          </p>
        )}
      </div>
    </main>
  )
}

function Waiting({ message, detail }) {
  return (
    <div className="mt-6 rounded-xl border border-light-blue/20 bg-light-blue/5 p-5" data-testid="entry-waiting">
      <p className="text-sm font-bold text-light-blue">{message}</p>
      <p className="mt-2 text-sm text-gray-300">{detail}</p>
    </div>
  )
}

export function ProductsApp() {
  const config = useMemo(() => loadConfig(), [])
  const plan = useMemo(() => findPlan(config, FAN_PAGE_PLAN_ID), [config])
  const price = describePrice(plan)

  const start = useCallback(() => {
    selectPlan(FAN_PAGE_PLAN_ID)
    window.location.href = PAGES.start
  }, [])

  return (
    <Shell
      testId="products"
      title="歌推しページ"
      lead={`歌配信をしている方へ。${plan.summary}`}
    >
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {plan.features.map(feature => (
          <div key={feature.id} className="rounded-xl border border-card-border/30 bg-black/20 p-5">
            <h2 className="text-sm font-bold text-light-blue">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{feature.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-card-border/30 bg-black/20 p-6">
        <p className="text-lg font-bold text-highlight" data-testid="plan-price">{price.label}</p>
        <p className="mt-1 text-xs text-gray-400">{price.note}</p>
        {/* 値段が分からないうちに申し込みへ進ませない。 */}
        <button
          type="button"
          onClick={start}
          disabled={!price.available}
          data-testid="start-button"
          className="mt-5 w-full rounded-lg bg-light-blue px-5 py-3 text-sm font-bold text-deep-blue disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          歌推しページを作る
        </button>
        {!price.available && (
          <p className="mt-3 text-xs text-gray-500" data-testid="start-blocked-reason">
            料金が決まってからお申し込みいただけます。
          </p>
        )}
        {plan.sampleUrl && (
          <a href={plan.sampleUrl} target="_blank" rel="noreferrer" data-testid="sample-link" className="mt-4 block text-sm text-light-blue underline">
            サンプルのページを見る
          </a>
        )}
      </section>
    </Shell>
  )
}

export function StartApp() {
  const adapters = useMemo(resolveEntryAdapters, [])
  const config = useMemo(() => loadConfig(), [])
  const plan = useMemo(() => findPlan(config, FAN_PAGE_PLAN_ID), [config])
  const price = describePrice(plan)
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(() => loadAcquisitionSession())

  const purchase = useCallback(async () => {
    setBusy(true)
    const result = await adapters.payment.requestEntitlement({ planId: FAN_PAGE_PLAN_ID })
    setSession(recordEntitlement(result))
    setBusy(false)
    if (result?.status === 'granted') window.location.href = PAGES.signup
  }, [adapters])

  if (!adapters.payment) {
    return (
      <Shell testId="start" title="利用を開始する" lead={`${plan.name}のお申し込み手続きです。`} back={{ href: PAGES.products, label: "← 内容をもう一度見る" }}>
        <Waiting
          message="お申し込みの受付を準備しています"
          detail="準備ができ次第、この画面からお申し込みいただけます。今しばらくお待ちください。"
        />
      </Shell>
    )
  }

  if (session.entitlement?.status === 'pending') {
    return (
      <Shell testId="start" title="利用を開始する" lead={`${plan.name}のお申し込み手続きです。`} back={{ href: PAGES.products, label: "← 内容をもう一度見る" }}>
        <Waiting
          message="お申し込みを確認しています"
          detail="確認が終わると、次の手続きへ進めます。この画面を閉じても手続きは続きます。"
        />
      </Shell>
    )
  }

  return (
    <Shell testId="start" title="利用を開始する" lead={`${plan.name}のお申し込み手続きです。`} back={{ href: PAGES.products, label: "← 内容をもう一度見る" }}>
      <section className="mt-6 rounded-2xl border border-card-border/30 bg-black/20 p-6">
        <p className="text-sm text-gray-300">{plan.name}</p>
        <p className="mt-1 text-lg font-bold text-highlight">{price.label}</p>
        <p className="mt-1 text-xs text-gray-400">{price.note}</p>
        <button
          type="button"
          onClick={purchase}
          disabled={busy}
          data-testid="purchase-button"
          className="mt-5 w-full rounded-lg bg-light-blue px-5 py-3 text-sm font-bold text-deep-blue disabled:opacity-50 sm:w-auto"
        >
          お申し込みに進む
        </button>
        {adapters.placeholder && <p className="mt-5 text-xs text-gray-500" data-testid="placeholder-notice">{PLACEHOLDER_NOTICE}</p>}
      </section>
    </Shell>
  )
}

export function SignupApp() {
  const adapters = useMemo(resolveEntryAdapters, [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const register = useCallback(async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await adapters.identity.createAccount({ email: form.get('email') })
    setBusy(false)
    if (result?.status === 'ready') {
      recordAccount(result)
      window.location.href = PAGES.fanpageCreate
      return
    }
    setError('登録できませんでした。もう一度お試しください。')
  }, [adapters])

  if (!adapters.identity) {
    return (
      <Shell testId="signup" title="連絡先を登録する" lead="設定した内容をあなたのものとして保存し、大切なお知らせをお送りするために使います。">
        <Waiting
          message="登録の受付を準備しています"
          detail="準備ができ次第、この画面から登録いただけます。今しばらくお待ちください。"
        />
      </Shell>
    )
  }

  return (
    <Shell testId="signup" title="連絡先を登録する" lead="設定した内容をあなたのものとして保存し、大切なお知らせをお送りするために使います。">
      <form onSubmit={register} className="mt-6 rounded-2xl border border-card-border/30 bg-black/20 p-6">
        <label className="block">
          <span className="text-sm font-bold text-light-blue">メールアドレス</span>
          <input
            type="email"
            name="email"
            required
            data-testid="signup-email"
            className="mt-2 w-full rounded-lg border border-card-border/40 bg-black/20 px-3 py-2 text-gray-100"
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-amber">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          data-testid="signup-submit"
          className="mt-5 w-full rounded-lg bg-light-blue px-5 py-3 text-sm font-bold text-deep-blue disabled:opacity-50 sm:w-auto"
        >
          登録して次へ
        </button>
        {adapters.placeholder && <p className="mt-5 text-xs text-gray-500" data-testid="placeholder-notice">{PLACEHOLDER_NOTICE}</p>}
      </form>
    </Shell>
  )
}
