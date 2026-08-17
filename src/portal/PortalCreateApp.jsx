import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AVAILABILITY, createAddressAvailability } from '../productization/addressAvailability'
import { publicAddressPreview, suggestPublicAddress } from '../productization/publicAddress'
import {
  beginPortalCreation,
  clearPortalCreation,
  describePortalCreation,
  loadPortalCreation,
  runPortalCreation,
} from '../productization/portalCreation'

// 実サービスのURLは未確定なので、表示用の見本として扱う。
const PREVIEW_BASE = 'https://service.example.com'

// 確認処理と作成処理の注入点。E2Eと将来の実サービスはここへ差し込む。
function resolveAdapters() {
  const injected = typeof window !== 'undefined' ? window.__portalCreateAdapters : null
  if (injected) return { ...injected, demo: false }
  // 未接続時の仮実装。画面の状態を確認できるようにするためのもの。
  const taken = new Set(['magurophone', 'colorsing', 'test'])
  return {
    demo: true,
    async checkAvailability(address) {
      await new Promise(resolve => setTimeout(resolve, 600))
      if (address.includes('error')) throw new Error('check failed')
      return !taken.has(address)
    },
    provisioningAdapter: {
      async executeStep(stepId, { tenant }) {
        await new Promise(resolve => setTimeout(resolve, 400))
        if (tenant.slug.includes('fail') && stepId === 'hosting') {
          const error = new Error('hosting failed')
          error.code = 'HOSTING_FAILED'
          throw error
        }
        return { resource: `${stepId}:${tenant.slug}` }
      },
    },
  }
}

const AVAILABILITY_TONE = {
  [AVAILABILITY.UNCHECKED]: 'text-gray-400',
  [AVAILABILITY.CHECKING]: 'text-light-blue',
  [AVAILABILITY.AVAILABLE]: 'text-green-400',
  [AVAILABILITY.UNAVAILABLE]: 'text-amber',
  [AVAILABILITY.CHECK_FAILED]: 'text-amber',
}

export default function PortalCreateApp() {
  const adapters = useMemo(resolveAdapters, [])
  const availabilityRef = useRef(null)
  if (!availabilityRef.current) {
    availabilityRef.current = createAddressAvailability({ checkAvailability: adapters.checkAvailability })
  }

  const [pageName, setPageName] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [availability, setAvailability] = useState(() => availabilityRef.current.state)
  const [record, setRecord] = useState(() => loadPortalCreation())
  const [running, setRunning] = useState(false)
  const addressTouchedRef = useRef(false)

  // 入力が止まってから確認する。打鍵のたびに問い合わせない。
  useEffect(() => {
    setAvailability(availabilityRef.current.setInput(addressInput))
    if (!addressInput) return undefined
    const timer = setTimeout(() => {
      const settled = availabilityRef.current.check()
      // 確認中であることを先に見せる。結果を待ってから更新すると、
      // 利用者には未確認のまま固まったように見える。
      setAvailability(availabilityRef.current.state)
      settled.then(setAvailability)
    }, 400)
    return () => clearTimeout(timer)
  }, [addressInput])

  // 進行中の作成があれば、開き直しても続きから見せる。
  useEffect(() => {
    const stored = loadPortalCreation()
    if (stored && stored.provisioning?.status !== 'complete' && stored.provisioning?.status !== 'failed') {
      setRecord(stored)
      setRunning(true)
      runPortalCreation({ record: stored, adapter: adapters.provisioningAdapter })
        .then(setRecord)
        .finally(() => setRunning(false))
    }
  }, [adapters])

  const onPageNameChange = useCallback((value) => {
    setPageName(value)
    // 利用者がURLを触るまでは、ページ名から候補を作って手間を減らす。
    if (!addressTouchedRef.current) setAddressInput(suggestPublicAddress(value))
  }, [])

  const start = useCallback(async () => {
    setRunning(true)
    const started = beginPortalCreation({ pageName, publicAddress: availability.address })
    setRecord(started)
    const finished = await runPortalCreation({ record: started, adapter: adapters.provisioningAdapter })
    setRecord(finished)
    setRunning(false)
  }, [adapters, availability.address, pageName])

  const retry = useCallback(async () => {
    const stored = loadPortalCreation()
    if (!stored) return
    setRunning(true)
    const finished = await runPortalCreation({ record: stored, adapter: adapters.provisioningAdapter })
    setRecord(finished)
    setRunning(false)
  }, [adapters])

  const startOver = useCallback(() => {
    clearPortalCreation()
    setRecord(null)
    setRunning(false)
  }, [])

  const view = describePortalCreation(record)
  const canCreate = availability.canCreate && Boolean(pageName.trim()) && !running
  const preview = publicAddressPreview(PREVIEW_BASE, availability.address || 'あなたのページ')

  if (record) {
    return (
      <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid="portal-create">
        <div className="mx-auto w-full max-w-xl">
          <section
            className="glass-effect rounded-2xl border border-card-border/30 p-6 md:p-8"
            data-testid="portal-progress"
            data-tone={view.tone}
          >
            <h1 className="text-xl md:text-2xl font-bold text-highlight">{view.headline}</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{view.detail}</p>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-gray-500">ページ名</dt>
                <dd className="text-gray-200">{record.pageName}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-gray-500">公開URL</dt>
                <dd className="break-all text-gray-200">{publicAddressPreview(PREVIEW_BASE, record.publicAddress)}</dd>
              </div>
            </dl>

            {view.tone === 'waiting' && (
              <p className="mt-6 text-xs text-gray-500">この画面を閉じても準備は続きます。</p>
            )}
            {view.tone === 'failed' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retry}
                  disabled={running}
                  data-testid="portal-retry"
                  className="rounded-lg bg-amber px-5 py-2 text-sm font-bold text-deep-blue disabled:opacity-50"
                >
                  もう一度試す
                </button>
                <button type="button" onClick={startOver} className="text-sm text-gray-400 underline">
                  最初からやり直す
                </button>
              </div>
            )}
            {view.tone === 'ready' && (
              <a
                href="/onboarding.html"
                data-testid="portal-next"
                className="mt-6 inline-block rounded-lg bg-light-blue px-5 py-2 text-sm font-bold text-deep-blue"
              >
                公開する内容を設定する
              </a>
            )}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid="portal-create">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-xl md:text-2xl font-bold text-highlight">公開ページを作る</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          あなたの歌推しページを作ります。表示する名前と、ページのアドレスを決めてください。
        </p>

        <section className="mt-8 glass-effect rounded-2xl border border-card-border/30 p-6 md:p-8">
          <label className="block">
            <span className="text-sm font-bold text-light-blue">ページ名</span>
            <p className="mt-1 text-xs text-gray-400">ページの一番上に表示されます。日本語や絵文字も使えます。</p>
            <input
              type="text"
              value={pageName}
              onChange={(event) => onPageNameChange(event.target.value)}
              placeholder="まぐろふぉん 歌推しページ"
              data-testid="page-name-input"
              className="mt-2 w-full rounded-lg border border-card-border/40 bg-black/20 px-3 py-2 text-gray-100"
            />
          </label>

          <label className="mt-8 block">
            <span className="text-sm font-bold text-light-blue">公開URL</span>
            <p className="mt-1 text-xs text-gray-400">
              みんながページを開くときの住所です。半角の英小文字、数字、ハイフンが使えます。
            </p>
            <input
              type="text"
              value={addressInput}
              onChange={(event) => { addressTouchedRef.current = true; setAddressInput(event.target.value) }}
              placeholder="magurophone"
              data-testid="address-input"
              className="mt-2 w-full rounded-lg border border-card-border/40 bg-black/20 px-3 py-2 text-gray-100"
            />
          </label>

          <p className="mt-3 text-xs text-gray-400">このアドレスで公開されます</p>
          <p className="mt-1 break-all text-sm text-gray-100" data-testid="address-preview">{preview}</p>

          <p
            className={`mt-4 text-sm ${AVAILABILITY_TONE[availability.status] ?? 'text-gray-400'}`}
            data-testid="availability-message"
            data-status={availability.status}
            role="status"
          >
            {availability.message}
          </p>

          <button
            type="button"
            onClick={start}
            disabled={!canCreate}
            data-testid="portal-create-submit"
            className="mt-8 w-full rounded-lg bg-light-blue px-5 py-3 text-sm font-bold text-deep-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            Portalを作成する
          </button>
          {!canCreate && (
            <p className="mt-3 text-xs text-gray-500" data-testid="submit-hint">
              {!pageName.trim()
                ? 'ページ名を入力すると作成できます。'
                : availability.status === AVAILABILITY.AVAILABLE
                  ? '作成の準備をしています。'
                  : '公開URLが使えることを確認できたら作成できます。'}
            </p>
          )}
          {adapters.demo && (
            <p className="mt-6 text-xs text-gray-600">※ 公開サービスへ未接続のため、確認と作成は動作確認用の仮処理です。</p>
          )}
        </section>
      </div>
    </main>
  )
}
