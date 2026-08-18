import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AVAILABILITY, createAddressAvailability } from '../productization/addressAvailability'
import { publicAddressPreview, suggestPublicAddress } from '../productization/publicAddress'
import { isLocalPreview } from '../productization/localPreview'
import {
  beginFanPageCreation,
  clearFanPageCreation,
  describeFanPageCreation,
  loadFanPageCreation,
  runFanPageCreation,
} from '../productization/fanPageCreation'

// 歌推しページを作る操作。画面から切り離して置く。
//
// 作成だけの独立した画面を持つと、そこで名前を聞き、設定でもう一度名前を聞く
// ことになる。実際そうなっていて、しかも同じ「ページ名」という言葉が別のものを
// 指していた。作成は設定の最初の手順として扱い、入口を1つにする。

// 公開サービスのURLは未確定。設定が無ければ今開いているoriginをそのまま使い、
// 開発中の画面であることが見た目で分かるようにする。
function previewBase() {
  if (typeof window === 'undefined') return ''
  return window.__fanPagePreviewBase || window.location.origin
}

// 確認処理と作成処理の注入点。E2Eと将来の実サービスはここへ差し込む。
export function resolveFanPageAdapters() {
  const injected = typeof window !== 'undefined' ? window.__fanPageCreateAdapters : null
  if (injected) return { ...injected, demo: false }
  // 仮実装は開発機のブラウザだけ。本番で偽の重複確認や作成を動かさない。
  if (!isLocalPreview()) return { demo: false, checkAvailability: null, provisioningAdapter: null }
  const taken = new Set(['colorsing', 'test', 'sample'])
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

/**
 * @param {object} options
 * @param {string} options.pageName 作成するページの表示名。基本情報で決めたものを使う。
 */
export function useFanPageCreation({ pageName = '' } = {}) {
  const adapters = useMemo(resolveFanPageAdapters, [])
  const availabilityRef = useRef(null)
  if (!availabilityRef.current) {
    availabilityRef.current = createAddressAvailability({ checkAvailability: adapters.checkAvailability })
  }

  const [addressInput, setAddressInput] = useState('')
  const [availability, setAvailability] = useState(() => availabilityRef.current.state)
  const [record, setRecord] = useState(() => loadFanPageCreation())
  const [running, setRunning] = useState(false)

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
    const stored = loadFanPageCreation()
    if (stored && stored.provisioning?.status !== 'complete' && stored.provisioning?.status !== 'failed') {
      setRecord(stored)
      setRunning(true)
      runFanPageCreation({ record: stored, adapter: adapters.provisioningAdapter })
        .then(setRecord)
        .finally(() => setRunning(false))
    }
  }, [adapters])

  // 公開URLは後から変えると閲覧者のリンクが切れる。名前から黙って決めてしまわず、
  // 候補を見せて本人に選ばせる。
  const suggestion = suggestPublicAddress(pageName)
  const showSuggestion = Boolean(suggestion) && suggestion.length >= 3 && !addressInput.trim()

  const applySuggestion = useCallback(() => setAddressInput(suggestion), [suggestion])

  const start = useCallback(async () => {
    setRunning(true)
    const started = beginFanPageCreation({ pageName, publicAddress: availability.address })
    setRecord(started)
    const finished = await runFanPageCreation({ record: started, adapter: adapters.provisioningAdapter })
    setRecord(finished)
    setRunning(false)
  }, [adapters, availability.address, pageName])

  const retry = useCallback(async () => {
    const stored = loadFanPageCreation()
    if (!stored) return
    setRunning(true)
    const finished = await runFanPageCreation({ record: stored, adapter: adapters.provisioningAdapter })
    setRecord(finished)
    setRunning(false)
  }, [adapters])

  const startOver = useCallback(() => {
    clearFanPageCreation()
    setAddressInput('')
    setRecord(null)
    setRunning(false)
  }, [])

  return {
    adapters,
    addressInput,
    setAddressInput,
    availability,
    record,
    running,
    suggestion,
    showSuggestion,
    applySuggestion,
    start,
    retry,
    startOver,
    view: describeFanPageCreation(record),
    // 名前は基本情報で決める。ここではアドレスだけを見る。
    canCreate: availability.canCreate && Boolean(pageName.trim()) && !running,
    preview: availability.address ? publicAddressPreview(previewBase(), availability.address) : '',
  }
}

export { AVAILABILITY }
