import DEFAULT_CONFIG from '../lib/defaults.js'
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

// localStorageは設定を丸ごと保存するため「保存済み＝本人が決めた」にならない。
// 顧客が触る前の状態（config.js＋既定）と比べて、変わっているかで判定する。
function differsFromBase(current, base) {
  return JSON.stringify(current ?? null) !== JSON.stringify(base ?? null)
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
  hasFanPageRecord = false,
  baseConfig = null,
} = {}) {
  const tenant = createTenantSnapshot({ config, pathname, meta })
  const tenantKind = resolveTenantKind(config, { hasFanPageRecord })
  // 既定のページ名（ColorSing LP - 特典管理）が入っているため、表示名だけで
  // 両方入力済みに見えていた。顧客が自分で決めたものだけを数える。
  const profileComplete = Boolean(
    tenant.displayName
    && config.brand?.pageTitle
    && differsFromBase(config.brand?.pageTitle, baseConfig?.brand?.pageTitle),
  )
  const dataSourceSelected = config.platform?.readSource === 'db'
    ? Boolean(config.platform?.publicApiBaseUrl)
    : Boolean(config.sheets)
  const connectionComplete = connection?.status === 'success'
  const benefitsRequired = (config.views || []).some(view => ['menu', 'rights'].includes(view.id) && view.enabled)
  // config.js は最初から特典を積んでいる。その中身は別の配信者のものなので、
  // 顧客が変えたときだけ完了とする。
  const benefitsComplete = Array.isArray(config.benefitTiers)
    && config.benefitTiers.length > 0
    && differsFromBase(config.benefitTiers, baseConfig?.benefitTiers)

  // 歌推しページの作成は手順ではなく前提。まだ無いときだけ、進むための項目
  // として出す。出来ていれば「完了」と書かれただけの項目を並べない。
  const fanPage = { id: 'fanpage_created', title: '歌推しページの準備', required: true, ...fanPageStep(tenant, acquisition) }

  const raw = [
    ...(fanPage.status === S.COMPLETE ? [] : [fanPage]),
    {
      id: 'basic_profile_complete',
      title: '基本情報',
      required: true,
      ...result(profileComplete ? S.COMPLETE : S.IN_PROGRESS, profileComplete, {
        message: profileComplete ? '表示名とページ名を確認しました。' : '表示名とページ名を入力してください。',
      }),
    },
    {
      // 既定の配色のままでも公開できる。やらなくてよいことを必須にしない。
      id: 'theme_complete',
      title: '色を変える',
      required: false,
      ...result(differsFromBase(config.colors, baseConfig?.colors) ? S.COMPLETE : S.OPTIONAL, differsFromBase(config.colors, baseConfig?.colors), {
        message: differsFromBase(config.colors, baseConfig?.colors) ? '色を変更しました。' : '既定の色のまま公開できます。',
      }),
    },
    // 新規顧客の正規データソースはCentral DBで固定する。内部実装である
    // DataSourceを選ばせず、リスナー情報という利用者の作業を出す。
    // 既存顧客はSheetsのままなので、従来の2手順を変えない。
    ...(tenantKind === TENANT_KIND.NEW ? [
      // リスナーが0人でも公開はできる。登録の画面が未接続の間まで必須にすると、
      // 公開へ永久に到達できなくなる。
      {
        id: 'supporters_ready',
        title: 'リスナー情報',
        required: supporters?.status === 'empty' || supporters?.status === 'ready',
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
