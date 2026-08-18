import { AVAILABILITY, useFanPageCreation } from './useFanPageCreation'
import { publicAddressPreview } from '../productization/publicAddress'

// 歌推しページを作る操作。設定の最初の手順として置く。
//
// 独立した画面にすると、そこで名前を聞き、設定でもう一度名前を聞くことになる。
// 名前は基本情報で一度だけ決め、ここでは公開URLだけを決める。

const AVAILABILITY_TONE = {
  [AVAILABILITY.UNCHECKED]: 'text-gray-400',
  [AVAILABILITY.CHECKING]: 'text-light-blue',
  [AVAILABILITY.AVAILABLE]: 'text-green-400',
  [AVAILABILITY.UNAVAILABLE]: 'text-amber',
  [AVAILABILITY.CHECK_FAILED]: 'text-amber',
}

function previewBase() {
  if (typeof window === 'undefined') return ''
  return window.__fanPagePreviewBase || window.location.origin
}

export default function FanPageCreatePanel({ pageName = '', onCreated = () => {} }) {
  const creation = useFanPageCreation({ pageName })
  const { record, view } = creation

  if (record) {
    return (
      <section
        className="mt-6 rounded-2xl border border-card-border/30 bg-black/20 p-5"
        data-testid="fanpage-progress"
        data-tone={view.tone}
      >
        <p className="text-base font-bold text-highlight">{view.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">{view.detail}</p>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="text-gray-500">公開URL</dt>
            <dd className="break-all text-gray-200">{publicAddressPreview(previewBase(), record.publicAddress)}</dd>
          </div>
        </dl>

        {view.tone === 'waiting' && (
          <p className="mt-5 text-xs text-gray-500">この画面を閉じても準備は続きます。</p>
        )}
        {view.tone === 'failed' && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={creation.retry}
              disabled={creation.running}
              data-testid="fanpage-retry"
              className="rounded-lg bg-amber px-5 py-2 text-sm font-bold text-deep-blue disabled:opacity-50"
            >
              もう一度試す
            </button>
            <button type="button" onClick={creation.startOver} className="text-sm text-gray-400 underline">
              最初からやり直す
            </button>
          </div>
        )}
        {/* 出来上がったあとは、この手順ごと一覧から消える。URLの変更は配った
            リンクを切るため、自分で押せる場所に置かない。 */}
      </section>
    )
  }

  return (
    <section className="mt-6" data-testid="fanpage-create">
      <label className="block">
        <span className="text-sm font-bold text-light-blue">公開URL</span>
        <p className="mt-1 text-xs text-gray-400">
          みんながページを開くときの住所です。半角の英小文字、数字、ハイフンが使えます。
        </p>
        <input
          type="text"
          value={creation.addressInput}
          onChange={(event) => creation.setAddressInput(event.target.value)}
          placeholder="uta-page"
          data-testid="address-input"
          className="mt-2 w-full rounded-lg border border-card-border/40 bg-black/20 px-3 py-2 text-gray-100"
        />
      </label>

      {creation.showSuggestion && (
        <button
          type="button"
          onClick={creation.applySuggestion}
          data-testid="address-suggestion"
          className="mt-3 rounded-lg border border-light-blue/40 bg-light-blue/10 px-3 py-2 text-xs text-light-blue"
        >
          表示名から「{creation.suggestion}」を使う
        </button>
      )}

      {/* 日本語の表示名からは候補を作れない。手が止まらないよう例を出す。 */}
      {!creation.addressInput.trim() && !creation.showSuggestion && (
        <p className="mt-3 text-xs text-gray-400" data-testid="address-hint">
          例: uta-page、mika-music、sing2 のように、好きな英字を入れてください。配信名のローマ字表記でも構いません。
        </p>
      )}

      {creation.preview && (
        <>
          <p className="mt-3 text-xs text-gray-400">このアドレスで公開されます</p>
          <p className="mt-1 break-all text-sm text-gray-100" data-testid="address-preview">{creation.preview}</p>
        </>
      )}

      {/* 何も打っていないうちから「入力してください」と出さない。
          すぐ下のボタンの説明と、上の例で同じことを3回言うことになる。 */}
      {creation.addressInput.trim() !== '' && (
        <p
          className={`mt-4 text-sm ${AVAILABILITY_TONE[creation.availability.status] ?? 'text-gray-400'}`}
          data-testid="availability-message"
          data-status={creation.availability.status}
          role="status"
        >
          {creation.availability.message}
        </p>
      )}

      <button
        type="button"
        onClick={async () => { await creation.start(); onCreated() }}
        disabled={!creation.canCreate}
        data-testid="fanpage-create-submit"
        className="mt-6 w-full rounded-lg bg-light-blue px-5 py-3 text-sm font-bold text-deep-blue disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        歌推しページを作成する
      </button>
      {!creation.canCreate && (
        <p className="mt-3 text-xs text-gray-500" data-testid="submit-hint">
          {!pageName.trim()
            ? '先に基本情報で表示名を決めてください。'
            : !creation.addressInput.trim()
              ? '公開URLを入力すると作成できます。'
              : creation.availability.status === AVAILABILITY.AVAILABLE
                ? '作成の準備をしています。'
                : '公開URLが使えることを確認できたら作成できます。'}
        </p>
      )}
      {creation.adapters.demo && (
        <p className="mt-5 text-xs text-gray-600">※ 公開サービスへ未接続のため、確認と作成は動作確認用の仮処理です。</p>
      )}
    </section>
  )
}
