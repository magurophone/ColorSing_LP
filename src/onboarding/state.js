import { createTenantSnapshot } from '../productization/tenant.js'
import { deriveAcquisitionState, describeFanPageStep } from '../productization/acquisition.js'
import { TENANT_KIND, describeSupportersStep, resolveTenantKind } from '../productization/tenantKind.js'

export const ONBOARDING_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  WARNING: 'warning',
  BLOCKED: 'blocked',
  OPTIONAL: 'optional',
})

const S = ONBOARDING_STATUS

function result(status, canComplete, validation = null) {
  return { status, canComplete, validation }
}

function hasTheme(config) {
  const colors = config.colors || {}
  return ['deepBlue', 'oceanTeal', 'lightBlue', 'amber', 'accent']
    .every(key => /^#[0-9a-f]{6}$/i.test(String(colors[key] || '')))
}

// BLOCKEDは「エラー」ではなく「今は進めない」を表す。利用者が操作できる状態、
// 待つだけの状態、実際に失敗した状態を分けて返す。
const BLOCKING_STATUS = {
  action_required: S.IN_PROGRESS,
  waiting: S.PENDING,
  failed: S.BLOCKED,
}

function fanPageStep(tenant, acquisition) {
  if (!acquisition) {
    // 従来の呼び出し。運営が設定済みかどうかだけで判定する。
    return result(tenant.slug ? S.COMPLETE : S.BLOCKED, Boolean(tenant.slug), {
      message: tenant.slug ? '歌推しページの作成を確認しました。' : '歌推しページがまだ作成されていません。',
    })
  }
  const state = deriveAcquisitionState(acquisition)
  const guidance = describeFanPageStep(state, acquisition.portal ?? null)
  const ready = acquisition.portal?.status === 'ready' || Boolean(tenant.slug)
  const status = ready ? S.COMPLETE : BLOCKING_STATUS[guidance.blocking] ?? S.IN_PROGRESS
  return {
    ...result(status, ready, { message: guidance.headline }),
    acquisitionState: state,
    guidance,
  }
}

function supportersStep(supporters) {
  const guidance = describeSupportersStep(supporters)
  const ready = supporters?.status === 'ready'
  const status = ready ? S.COMPLETE : BLOCKING_STATUS[guidance.blocking] ?? S.IN_PROGRESS
  return { ...result(status, ready, { message: guidance.headline }), guidance }
}

export function deriveOnboardingSteps({
  config = {},
  pathname = '',
  connection = null,
  previewConfirmed = false,
  publishAvailable = false,
  publishing = false,
  meta = {},
  acquisition = null,
  supporters = null,
} = {}) {
  const tenant = createTenantSnapshot({ config, pathname, meta })
  const tenantKind = resolveTenantKind(config)
  const profileComplete = Boolean(tenant.displayName && config.brand?.pageTitle)
  const dataSourceSelected = config.platform?.readSource === 'db'
    ? Boolean(config.platform?.publicApiBaseUrl)
    : Boolean(config.sheets)
  const connectionComplete = connection?.status === 'success'
  const benefitsRequired = (config.views || []).some(view => ['menu', 'rights'].includes(view.id) && view.enabled)
  const benefitsComplete = Array.isArray(config.benefitTiers) && config.benefitTiers.length > 0

  const raw = [
    {
      id: 'account_created',
      title: '利用者確認',
      required: false,
      ...result(S.OPTIONAL, false, { message: 'SaaS認証方式は未決定です。既存の管理画面保護を継続します。' }),
    },
    {
      id: 'fanpage_created',
      title: '歌推しページの準備',
      required: true,
      // 獲得導線の状態が渡された場合だけ、状態ごとの利用者向け案内を出す。
      // 未着手・処理待ち・失敗を同じBLOCKEDへ丸めない。
      ...fanPageStep(tenant, acquisition),
    },
    {
      id: 'basic_profile_complete',
      title: '基本情報',
      required: true,
      ...result(profileComplete ? S.COMPLETE : S.IN_PROGRESS, profileComplete, {
        message: profileComplete ? '表示名とページ名を確認しました。' : '表示名とページ名を入力してください。',
      }),
    },
    {
      id: 'theme_complete',
      title: 'テーマ',
      required: true,
      ...result(hasTheme(config) ? S.COMPLETE : S.IN_PROGRESS, hasTheme(config), {
        message: hasTheme(config) ? '公開可能な配色を確認しました。' : '配色設定を確認してください。',
      }),
    },
    // 新規顧客の正規データソースはCentral DBで固定する。内部実装である
    // DataSourceを選ばせず、支援者情報という利用者の作業を出す。
    // 既存顧客はSheetsのままなので、従来の2手順を変えない。
    ...(tenantKind === TENANT_KIND.NEW ? [
      {
        id: 'supporters_ready',
        title: '支援者情報',
        required: true,
        ...supportersStep(supporters),
      },
    ] : [
      {
        id: 'data_source_selected',
        title: 'データ管理方法',
        required: true,
        ...result(dataSourceSelected ? S.COMPLETE : S.BLOCKED, dataSourceSelected, {
          message: dataSourceSelected ? '現在利用するデータ管理方法を確認しました。' : '利用するデータ管理方法が未設定です。',
        }),
      },
      {
        id: 'data_source_connected',
        title: 'データ接続',
        required: true,
        ...result(
          connectionComplete ? S.COMPLETE : (connection?.status === 'error' ? S.WARNING : S.IN_PROGRESS),
          connectionComplete,
          connection,
        ),
      },
    ]),
    {
      id: 'benefit_structure_complete',
      title: '公開内容',
      required: benefitsRequired,
      ...result(
        benefitsRequired ? (benefitsComplete ? S.COMPLETE : S.IN_PROGRESS) : S.OPTIONAL,
        !benefitsRequired || benefitsComplete,
        { message: benefitsRequired ? (benefitsComplete ? '特典設定を確認しました。' : '公開する特典を設定してください。') : '現在の表示構成では特典設定は任意です。' },
      ),
    },
    {
      id: 'preview_verified',
      title: 'プレビュー確認',
      required: true,
      ...result(previewConfirmed ? S.COMPLETE : S.IN_PROGRESS, previewConfirmed, {
        message: previewConfirmed ? 'この端末でプレビュー確認済みです。' : '表示内容は目視確認が必要です。',
      }),
    },
  ]

  const prerequisitesComplete = raw
    .filter(step => step.required)
    .every(step => step.status === S.COMPLETE)
  const publishReady = prerequisitesComplete && publishAvailable
  const published = Boolean(meta.lastPublishedVerified && (!meta.lastModified || meta.lastPublishedVerified >= meta.lastModified))

  raw.push({
    id: 'publish_ready',
    title: '公開準備',
    required: true,
    ...result(
      publishReady ? S.COMPLETE : (prerequisitesComplete ? S.BLOCKED : S.PENDING),
      publishReady,
      {
        message: publishReady
          ? '公開に必要な確認が完了しました。'
          : prerequisitesComplete
            ? '公開サービスの準備待ちです。設定内容は保存されています。'
            : '前の必須項目を完了してください。',
      },
    ),
  })
  raw.push({
    id: 'published',
    title: '公開',
    required: true,
    ...result(
      publishing ? S.IN_PROGRESS : (published ? S.COMPLETE : (publishReady ? S.IN_PROGRESS : S.PENDING)),
      publishReady,
      {
        message: publishing
          ? '公開処理中です。'
          : published
            ? '公開ページで最新設定を確認しました。'
            : meta.lastPublishRequested
              ? '公開を受け付けました。公開ページへの反映確認が必要です。'
              : '公開操作はまだ完了していません。',
      },
    ),
  })

  let priorRequiredComplete = true
  const steps = raw.map(step => {
    const canEnter = !step.required || priorRequiredComplete || step.status === S.COMPLETE
    if (step.required && step.status !== S.COMPLETE) priorRequiredComplete = false
    return { ...step, canEnter }
  })
  const required = steps.filter(step => step.required)
  const completeCount = required.filter(step => step.status === S.COMPLETE).length

  return {
    tenant,
    steps,
    completeCount,
    requiredCount: required.length,
    progress: required.length ? Math.round((completeCount / required.length) * 100) : 0,
    currentStep: steps.find(step => step.required && step.status !== S.COMPLETE) || null,
  }
}
