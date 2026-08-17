import { useEffect, useMemo, useRef, useState } from 'react'
import { loadConfig, loadConfigMeta, saveConfig, saveConfigMeta } from '../lib/configIO'
import { extractSpreadsheetId, normalizeSpreadsheetInput, validateSpreadsheetConnection } from '../lib/spreadsheetConnection'
import { createLegacyClientPublishAdapter, createPublishService } from '../productization/publish'
import { deriveOnboardingSteps } from './state'

const STATUS_LABELS = {
  pending: '未着手',
  in_progress: '設定中',
  complete: '完了',
  warning: '要確認',
  blocked: '準備待ち',
  optional: '任意',
}

const STATUS_STYLES = {
  pending: 'border-gray-500/30 text-gray-400 bg-gray-500/5',
  in_progress: 'border-light-blue/40 text-light-blue bg-light-blue/10',
  complete: 'border-green-500/40 text-green-400 bg-green-500/10',
  warning: 'border-amber/50 text-amber bg-amber/10',
  blocked: 'border-tuna-red/40 text-tuna-red bg-tuna-red/10',
  optional: 'border-gray-500/30 text-gray-400 bg-black/10',
}

const GUIDANCE = {
  account_created: {
    now: '現在の管理画面の利用方法をそのまま使えます。',
    why: '将来のSaaSアカウント方式は未確定のため、この画面では新しい登録を要求しません。',
    completion: '認証方式が決まるまでは任意項目です。',
    later: '認証導入後も既存顧客を自動移行しません。',
  },
  portal_created: {
    now: 'あなたのPortalが準備済みか確認します。',
    why: '設定と公開先を安全に同じ利用者へ結び付けるためです。',
    completion: 'Portalの識別情報が現在の設定から確認できること。',
    later: 'URL変更は影響が大きいため、運営への確認が必要です。',
  },
  basic_profile_complete: {
    now: '公開ページに表示する名前を入力してください。',
    why: '閲覧者が誰のページか分かるようにするためです。',
    completion: '表示名とブラウザに表示するページ名の両方が入力済み。',
    later: '公開後も変更できます。',
  },
  theme_complete: {
    now: '現在の配色を確認し、必要なら管理画面で調整してください。',
    why: '文字が読める安全な初期テーマで公開するためです。',
    completion: '必要な基本色が有効なカラーコードで設定済み。',
    later: '公開後もプレビューしてから変更できます。',
  },
  data_source_selected: {
    now: '現在利用できるGoogle Sheets方式を使用します。',
    why: 'ランキングや特典内容を公開ページへ反映するためです。',
    completion: '利用するデータ管理方法が設定済み。',
    later: '将来の中央管理方式への変更は、移行プレビューとrollbackを伴う別手順で行います。',
  },
  data_source_connected: {
    now: 'スプレッドシートのURLを貼り付け、接続結果を確認してください。',
    why: '必要なデータを実際に読み取れるか自動確認するためです。',
    completion: 'URL、ランキング・目標、特典内容、特典管理、Special列の確認がすべて成功。',
    later: '接続先は公開後も変更できます。',
  },
  benefit_structure_complete: {
    now: '公開する画面と特典内容が意図どおりか確認してください。',
    why: '獲得条件と表示内容の食い違いを防ぐためです。',
    completion: '特典画面を使う場合は、少なくとも1つの特典設定があること。',
    later: '公開後も追加・変更できます。',
  },
  preview_verified: {
    now: 'PCとスマートフォンの表示をプレビューしてください。',
    why: 'デザインと文章の最終判断は自動化できないため、目視確認が必要です。',
    completion: '表示名、色、公開内容、操作を確認し、確認ボタンを押すこと。',
    later: '設定を変更すると、もう一度プレビュー確認してください。',
  },
  publish_ready: {
    now: '必須項目と公開サービスの準備状態を確認します。',
    why: '不完全なページを誤って公開しないためです。',
    completion: '前の必須項目が完了し、公開サービスが利用可能。',
    later: '公開サービスの接続は運営側で変更できます。',
  },
  published: {
    now: '設定を公開し、公開ページへ反映されたことを確認します。',
    why: '公開操作の受付だけでなく、実際の反映まで確認するためです。',
    completion: '公開先の設定内容が現在の設定と一致すること。',
    later: '変更後はいつでも再公開できます。',
  },
}

function setAtPath(source, path, value) {
  const next = structuredClone(source)
  const keys = path.split('.')
  let target = next
  for (const key of keys.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {}
    target = target[key]
  }
  target[keys.at(-1)] = value
  return next
}

function onboardingStorageKey() {
  const segment = window.location.pathname.split('/').filter(Boolean)[0] || ''
  const slug = (!segment || /\.html$/i.test(segment)) ? 'default' : segment
  return `onboarding_state_${slug}`
}

function loadLocalState() {
  try {
    return JSON.parse(localStorage.getItem(onboardingStorageKey()) || '{}')
  } catch {
    return {}
  }
}

function saveLocalState(value) {
  try {
    localStorage.setItem(onboardingStorageKey(), JSON.stringify(value))
  } catch {
    // localStorageが使用できない場合は、この端末の確認状態だけ保持しない。
  }
}

function AuthGate({ password, onAuthenticated }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const submit = event => {
    event.preventDefault()
    if (input === password) {
      sessionStorage.setItem('onboarding_auth', 'true')
      onAuthenticated()
    } else {
      setError(true)
    }
  }
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="glass-effect w-full max-w-md rounded-2xl border border-light-blue/30 p-7">
        <p className="text-xs text-amber mb-2">Portal setup</p>
        <h1 className="text-2xl font-bold text-light-blue mb-3">初期設定を続ける</h1>
        <p className="text-sm text-gray-400 mb-6">管理画面と同じパスワードを入力してください。</p>
        <label className="block text-sm text-gray-300 mb-2" htmlFor="onboarding-password">パスワード</label>
        <input
          id="onboarding-password"
          type="password"
          value={input}
          onChange={event => { setInput(event.target.value); setError(false) }}
          className="w-full rounded-xl border border-light-blue/30 bg-black/20 px-4 py-3 text-white focus:outline-none focus:border-amber"
        />
        {error && <p role="alert" className="text-sm text-tuna-red mt-2">パスワードを確認してください。</p>}
        <button className="w-full mt-5 rounded-xl border border-light-blue/50 bg-light-blue/20 px-4 py-3 text-light-blue font-bold">続ける</button>
      </form>
    </main>
  )
}

function ValidationList({ connection }) {
  if (!connection?.checks) return <p className="text-sm text-gray-500">まだ接続確認を行っていません。</p>
  return (
    <ul className="space-y-2" aria-label="接続確認結果">
      {connection.checks.map(item => (
        <li key={item.id} className={`rounded-xl border p-3 ${item.status === 'success' ? 'border-green-500/25 bg-green-500/5' : 'border-amber/35 bg-amber/5'}`}>
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className={item.status === 'success' ? 'text-green-400' : 'text-amber'}>{item.status === 'success' ? '✓' : '!'}</span>
            <div>
              <p className="text-sm text-gray-200"><span className="font-bold">{item.label}</span> — {item.message}</p>
              {item.fix && <p className="text-xs text-gray-400 mt-1">修正方法: {item.fix}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function OnboardingApp() {
  const [config, setConfig] = useState(() => loadConfig())
  const [meta, setMeta] = useState(() => loadConfigMeta())
  const [localState, setLocalState] = useState(() => loadLocalState())
  const [connection, setConnection] = useState(null)
  const [validating, setValidating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [activeId, setActiveId] = useState('portal_created')
  const [sheetInput, setSheetInput] = useState(() => config.sheets?.spreadsheetId || '')
  const [authenticated, setAuthenticated] = useState(
    () => !config.admin?.password || sessionStorage.getItem('onboarding_auth') === 'true' || sessionStorage.getItem('admin_auth') === 'true',
  )
  const validationSignatureRef = useRef('')
  const detailRef = useRef(null)
  const publishService = useMemo(
    () => createPublishService(createLegacyClientPublishAdapter()),
    [],
  )
  const publishAvailable = publishService.canPublish(config)
  const model = deriveOnboardingSteps({
    config,
    pathname: window.location.pathname,
    connection,
    previewConfirmed: localState.previewConfirmed === true,
    publishAvailable,
    publishing,
    meta,
  })
  const activeStep = model.steps.find(step => step.id === activeId) || model.currentStep || model.steps[0]
  // 状態ごとの案内があるステップは、静的な文言より優先する。
  const guide = activeStep.guidance ?? GUIDANCE[activeStep.id]

  const updateConfig = (path, value, { resetPreview = true } = {}) => {
    setConfig(previous => {
      const next = setAtPath(previous, path, value)
      saveConfig(next)
      return next
    })
    const nextMeta = { ...meta, lastModified: Date.now() }
    saveConfigMeta(nextMeta)
    setMeta(nextMeta)
    if (resetPreview && localState.previewConfirmed) {
      const nextLocal = { ...localState, previewConfirmed: false }
      saveLocalState(nextLocal)
      setLocalState(nextLocal)
    }
  }

  const validateConnection = async (targetConfig = config) => {
    setValidating(true)
    const result = await validateSpreadsheetConnection(targetConfig.sheets)
    setConnection(result)
    setValidating(false)
    return result
  }

  useEffect(() => {
    if (!authenticated || !config.sheets?.spreadsheetId) return
    const signature = JSON.stringify({
      id: config.sheets.spreadsheetId,
      ranking: config.sheets.rankingSheetName,
      benefits: config.sheets.benefitsContentSheetName,
      rights: config.sheets.benefitsSheetName,
    })
    if (validationSignatureRef.current === signature) return
    validationSignatureRef.current = signature
    validateConnection(config)
  }, [authenticated, config.sheets?.spreadsheetId, config.sheets?.rankingSheetName, config.sheets?.benefitsContentSheetName, config.sheets?.benefitsSheetName])

  useEffect(() => {
    if (model.currentStep && !model.steps.find(step => step.id === activeId)?.canEnter) {
      setActiveId(model.currentStep.id)
    }
  }, [model.currentStep?.id])

  if (!authenticated) {
    return <AuthGate password={config.admin.password} onAuthenticated={() => setAuthenticated(true)} />
  }

  const handleSheetChange = value => {
    setSheetInput(value)
    const extracted = extractSpreadsheetId(value)
    if (extracted && extracted !== config.sheets.spreadsheetId) {
      updateConfig('sheets.spreadsheetId', extracted)
      setConnection(null)
    }
  }

  const selectStep = stepId => {
    setActiveId(stepId)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const handleValidate = async () => {
    const normalized = normalizeSpreadsheetInput(sheetInput)
    if (normalized !== config.sheets.spreadsheetId) {
      const next = setAtPath(config, 'sheets.spreadsheetId', normalized)
      updateConfig('sheets.spreadsheetId', normalized)
      await validateConnection(next)
    } else {
      await validateConnection(config)
    }
  }

  const confirmPreview = () => {
    const next = { ...localState, previewConfirmed: true, previewConfirmedAt: Date.now() }
    saveLocalState(next)
    setLocalState(next)
  }

  const handlePublish = async () => {
    setPublishing(true)
    setPublishResult(null)
    const result = await publishService.publish(config)
    setPublishResult(result)
    if (result.status === 'published') {
      const nextMeta = { ...meta, lastDeployed: result.publishedAt, lastPublishRequested: result.publishedAt }
      saveConfigMeta(nextMeta)
      setMeta(nextMeta)
    }
    setPublishing(false)
  }

  const verifyPublish = async () => {
    setPublishing(true)
    const result = await publishService.verify(config)
    setPublishResult(result)
    if (result.status === 'verified') {
      const nextMeta = { ...meta, lastPublishedVerified: result.verifiedAt }
      saveConfigMeta(nextMeta)
      setMeta(nextMeta)
    }
    setPublishing(false)
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 md:flex md:items-end md:justify-between md:gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber">Portal setup</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-light-blue">公開までのセットアップ</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">今の状態を自動確認し、次に必要な操作だけを案内します。既存の初期設定ガイドと管理画面はそのまま利用できます。</p>
          </div>
          <div className="mt-5 md:mt-0 min-w-56 rounded-2xl border border-light-blue/25 bg-black/15 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-400">セットアップ進捗</span>
              <span className="text-2xl font-bold text-light-blue">{model.progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30" aria-label={`セットアップ進捗 ${model.progress}%`}>
              <div className="h-full rounded-full bg-gradient-to-r from-ocean-teal via-light-blue to-amber transition-all" style={{ width: `${model.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">必須 {model.completeCount} / {model.requiredCount} 完了</p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <nav className="glass-effect rounded-2xl border border-light-blue/20 p-3 lg:self-start" aria-label="セットアップ手順">
            {model.steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => selectStep(step.id)}
                className={`mb-1 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${activeStep.id === step.id ? 'border-light-blue/45 bg-light-blue/10' : 'border-transparent hover:bg-white/5'}`}
              >
                <span className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs ${STATUS_STYLES[step.status]}`}>{step.status === 'complete' ? '✓' : index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-200">{step.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[step.status]}`}>{STATUS_LABELS[step.status]}</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">{step.required ? '必須' : '任意'}</span>
                </span>
              </button>
            ))}
          </nav>

          <section ref={detailRef} className="min-w-0 scroll-mt-4 rounded-2xl border border-light-blue/25 bg-black/15 p-5 md:p-7" aria-labelledby="active-step-title">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLES[activeStep.status]}`}>{STATUS_LABELS[activeStep.status]}</span>
              <span className="text-xs text-gray-500">{activeStep.required ? '必須ステップ' : '任意ステップ'}</span>
            </div>
            <h2 id="active-step-title" className="mt-4 text-2xl font-bold text-light-blue">{activeStep.title}</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-light-blue/15 bg-black/15 p-4 sm:col-span-2">
                <p className="text-xs font-bold text-amber">今やること</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">{guide.now}</p>
              </div>
              <div className="rounded-xl border border-light-blue/15 bg-black/10 p-4">
                <p className="text-xs font-bold text-light-blue">なぜ必要か</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{guide.why}</p>
              </div>
              <div className="rounded-xl border border-light-blue/15 bg-black/10 p-4">
                <p className="text-xs font-bold text-light-blue">完了条件</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{guide.completion}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-light-blue/15 bg-light-blue/5 p-4">
              <p className="text-xs font-bold text-light-blue">自動判定結果</p>
              <p className="mt-2 text-sm text-gray-300">{activeStep.validation?.message || 'このステップの状態を確認しています。'}</p>
              <p className="mt-2 text-xs text-gray-500">後で変更: {guide.later}</p>
            </div>

            {activeStep.id === 'basic_profile_complete' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-gray-300">表示名
                  <input value={config.brand?.name || ''} onChange={event => updateConfig('brand.name', event.target.value)} className="mt-2 w-full rounded-xl border border-light-blue/30 bg-black/20 px-4 py-3 text-white focus:outline-none focus:border-amber" placeholder="配信者名・ブランド名" />
                </label>
                <label className="text-sm text-gray-300">ページ名
                  <input value={config.brand?.pageTitle || ''} onChange={event => updateConfig('brand.pageTitle', event.target.value)} className="mt-2 w-full rounded-xl border border-light-blue/30 bg-black/20 px-4 py-3 text-white focus:outline-none focus:border-amber" placeholder="ブラウザに表示するページ名" />
                </label>
              </div>
            )}

            {activeStep.id === 'theme_complete' && (
              <a href="./admin.html" className="mt-6 inline-flex rounded-xl border border-light-blue/40 bg-light-blue/10 px-4 py-3 text-sm font-bold text-light-blue hover:bg-light-blue/20">テーマ設定を開く</a>
            )}

            {activeStep.id === 'data_source_connected' && (
              <div className="mt-6">
                <label className="block text-sm text-gray-300" htmlFor="spreadsheet-url">スプレッドシートURL
                  <input
                    id="spreadsheet-url"
                    value={sheetInput}
                    onChange={event => handleSheetChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-light-blue/30 bg-black/20 px-4 py-3 text-white focus:outline-none focus:border-amber"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">URL全体を貼り付けると、必要なIDを自動で読み取ります。</p>
                <button type="button" onClick={handleValidate} disabled={validating} className="my-4 rounded-xl border border-light-blue/50 bg-light-blue/15 px-4 py-2.5 text-sm font-bold text-light-blue disabled:opacity-50">{validating ? '確認中...' : '接続を確認する'}</button>
                <ValidationList connection={connection} />
              </div>
            )}

            {activeStep.id === 'benefit_structure_complete' && (
              <a href="./admin.html" className="mt-6 inline-flex rounded-xl border border-light-blue/40 bg-light-blue/10 px-4 py-3 text-sm font-bold text-light-blue hover:bg-light-blue/20">公開内容を編集する</a>
            )}

            {activeStep.id === 'preview_verified' && (
              <div className="mt-6">
                <div className="overflow-hidden rounded-xl border border-light-blue/25 bg-deep-blue">
                  <iframe title="Portalプレビュー" src="./index.html" className="h-[525px] w-[125%] origin-top-left scale-[0.8] bg-deep-blue md:h-[420px] md:w-full md:scale-100" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href="./index.html" target="_blank" rel="noreferrer" className="rounded-xl border border-light-blue/40 bg-light-blue/10 px-4 py-2.5 text-sm font-bold text-light-blue">別画面でプレビュー</a>
                  <button type="button" onClick={confirmPreview} className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm font-bold text-green-400">プレビューを確認しました</button>
                </div>
              </div>
            )}

            {activeStep.id === 'publish_ready' && !publishAvailable && (
              <div className="mt-6 rounded-xl border border-amber/35 bg-amber/5 p-4 text-sm text-gray-300">
                公開サービスの準備待ちです。入力した設定はこの端末に保存されています。既存顧客は従来の管理画面から公開できます。
              </div>
            )}

            {activeStep.id === 'published' && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handlePublish} disabled={!publishAvailable || !activeStep.canComplete || publishing} className="rounded-xl border border-amber/50 bg-amber/15 px-5 py-3 text-sm font-bold text-amber disabled:cursor-not-allowed disabled:opacity-40">{publishing ? '処理中...' : '公開する'}</button>
                  {meta.lastPublishRequested && (
                    <button type="button" onClick={verifyPublish} disabled={publishing} className="rounded-xl border border-light-blue/45 bg-light-blue/10 px-5 py-3 text-sm font-bold text-light-blue disabled:opacity-40">公開状態を確認</button>
                  )}
                  {model.tenant.publishedUrl && <a href={model.tenant.publishedUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-light-blue/30 px-5 py-3 text-sm text-light-blue">公開ページを開く</a>}
                </div>
                {publishResult && <p role="status" className={`mt-4 rounded-xl border p-4 text-sm ${publishResult.status === 'verified' || publishResult.status === 'published' ? 'border-green-500/35 text-green-400' : 'border-amber/35 text-amber'}`}>{publishResult.message}</p>}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-light-blue/15 pt-5">
              <p className="text-xs text-gray-500">次へ進む条件: {activeStep.canComplete ? 'このステップは完了可能です。' : guide.completion}</p>
              {model.currentStep && model.currentStep.id !== activeStep.id && (
                <button type="button" onClick={() => selectStep(model.currentStep.id)} className="text-sm font-bold text-light-blue">今やることへ →</button>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>従来の初期設定ガイドも引き続き利用できます。</span>
          <div className="flex gap-4"><a href="./setup.html" className="text-light-blue">従来の初期設定ガイド</a><a href="./manual.html" className="text-light-blue">管理マニュアル</a></div>
        </footer>
      </div>
    </main>
  )
}

export default OnboardingApp
