import { useCallback, useState } from 'react'
import { isLocalPreview } from '../productization/localPreview'
import { inspectSetupState, resetCustomerSettings, resetSetupProgress } from '../productization/setupReset'

// 開発・検証用。購入導線をまっさらな状態から確認するためのもので、
// 顧客設定の初期化ではない。開発機のブラウザ以外では動かさない。

function KeyList({ title, keys, tone }) {
  return (
    <div className="mt-5">
      <p className={`text-xs font-bold ${tone}`}>{title}</p>
      {keys.length === 0
        ? <p className="mt-2 text-sm text-gray-500">なし</p>
        : (
          <ul className="mt-2 space-y-1">
            {keys.map(key => <li key={key} className="break-all text-sm text-gray-300">{key}</li>)}
          </ul>
        )}
    </div>
  )
}

export default function DevResetApp() {
  const local = typeof window !== 'undefined' ? window.localStorage : null
  const session = typeof window !== 'undefined' ? window.sessionStorage : null
  const [found, setFound] = useState(() => inspectSetupState({ local, session }))
  const [done, setDone] = useState(null)

  const refresh = useCallback(() => {
    setFound(inspectSetupState({ local, session }))
  }, [local, session])

  // 設定の初期化は別操作。色や特典を変えた状態からやり直すときに使う。
  const resetSettings = useCallback(() => {
    const result = resetCustomerSettings({ local })
    setDone({ cleared: result.cleared, clearedSession: [], kept: [] })
    refresh()
  }, [local, refresh])

  const reset = useCallback(() => {
    const result = resetSetupProgress({ local, session })
    setDone(result)
    refresh()
  }, [local, session, refresh])

  if (!isLocalPreview()) {
    return (
      <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid="dev-reset">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-xl font-bold text-highlight">この画面は開発機でのみ使えます</h1>
          <p className="mt-3 text-sm text-gray-300">動作確認用のため、公開環境では操作できません。</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid="dev-reset">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl md:text-2xl font-bold text-highlight">確認用の状態をリセットする</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          購入導線とセットアップの進行状況だけを消して、まっさらな状態から確認できるようにします。
          顧客の設定（表示名・色・特典など）は消しません。
        </p>

        <section className="mt-8 rounded-2xl border border-card-border/30 bg-black/20 p-6">
          <KeyList title="消すもの（導線の進行状況）" keys={found.clearable} tone="text-amber" />
          <KeyList title="消さないもの（顧客の設定）" keys={found.protectedKeys} tone="text-green-400" />

          <button
            type="button"
            onClick={reset}
            data-testid="dev-reset-run"
            className="mt-7 w-full rounded-lg bg-amber px-5 py-3 text-sm font-bold text-deep-blue disabled:opacity-40 sm:w-auto"
          >
            進行状況を消す
          </button>

          <div className="mt-4 border-t border-card-border/20 pt-5">
            <p className="text-xs font-bold text-gray-400">色や特典も含めて完全にやり直す</p>
            <p className="mt-2 text-sm text-gray-400">
              上のボタンは進行状況だけを消します。色や特典など、設定した内容も消して最初から確認する場合はこちらです。
            </p>
            <button
              type="button"
              onClick={resetSettings}
              data-testid="dev-reset-settings"
              className="mt-4 rounded-lg border border-amber/50 px-4 py-2 text-sm font-bold text-amber"
            >
              設定も消す
            </button>
          </div>

          {done && (
            <p className="mt-4 text-sm text-green-400" role="status" data-testid="dev-reset-result">
              {done.cleared.length + done.clearedSession.length}件を消しました。{done.kept.length > 0 ? `設定は${done.kept.length}件そのまま残っています。` : ''}
            </p>
          )}
        </section>

        <p className="mt-8 text-sm text-gray-400">
          <a href="./products.html" className="text-light-blue underline" data-testid="dev-reset-start">
            商品ページから確認を始める
          </a>
        </p>
      </div>
    </main>
  )
}
