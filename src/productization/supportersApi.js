// リスナー（内部名は supporter）の管理APIクライアント。
//
// 実体はSLT側のCentral DBにあり、この画面はその管理APIを叩く。接続先が
// 設定されていなければ「準備中」を返し、偽の一覧や仮の登録を作らない。
//
// 利用者向けの言葉は「リスナー」。内部の supporter という語を画面へ出さない。

export const SUPPORTERS_STATUS = Object.freeze({
  NOT_CONFIGURED: 'not_configured',
  EMPTY: 'empty',
  READY: 'ready',
  ERROR: 'error',
})

function baseUrl(config) {
  const platform = config?.platform ?? {}
  const value = platform.adminApiBaseUrl || platform.publicApiBaseUrl || ''
  return String(value).trim().replace(/\/+$/, '')
}

function tenantSlug(config) {
  return String(config?.platform?.tenantSlug ?? '').trim()
}

export function isSupportersApiConfigured(config) {
  return Boolean(baseUrl(config) && tenantSlug(config))
}

function buildUrl(config, path, params = {}) {
  const url = new URL(`${baseUrl(config)}${path}`)
  url.searchParams.set('tenant', tenantSlug(config))
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

// 失敗の中身をそのまま画面へ出さない。利用者が次にできることだけ伝える。
function publicError(status) {
  if (status === 401 || status === 403) return 'リスナー情報を開く権限を確認できませんでした。ログインし直してください。'
  if (status === 404) return 'リスナー情報の保存先が見つかりませんでした。運営へ連絡してください。'
  return 'リスナー情報を読み込めませんでした。時間をおいてもう一度お試しください。'
}

async function request(config, path, { method = 'GET', params, body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildUrl(config, path, params), {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify({ ...body, tenant: tenantSlug(config) }) } : {}),
  })
  if (!response.ok) {
    const error = new Error(publicError(response.status))
    error.status = response.status
    throw error
  }
  return response.json()
}

/** 一覧。利用者向けの形へ整えてから返す。 */
export async function listSupporters(config, { includeArchived = false, query = '', fetchImpl } = {}) {
  const data = await request(config, '/api/admin/supporters', {
    params: { includeArchived: includeArchived ? 'true' : '', q: query },
    fetchImpl,
  })
  return (data?.supporters ?? []).map(row => ({
    id: row.id,
    displayName: row.display_name,
    note: row.note ?? '',
    latestTierKey: row.latest_tier_key ?? '',
    archived: Boolean(row.archived_at),
    hasAccount: Boolean(row.app_user_id),
  }))
}

export async function createSupporter(config, { displayName, note = '', fetchImpl } = {}) {
  const data = await request(config, '/api/admin/supporters', {
    method: 'POST',
    body: { displayName, note },
    fetchImpl,
  })
  return data?.supporter ?? null
}

export async function updateSupporter(config, supporterId, changes, { fetchImpl } = {}) {
  const data = await request(config, `/api/admin/supporters/${encodeURIComponent(supporterId)}`, {
    method: 'PATCH',
    body: changes,
    fetchImpl,
  })
  return data?.supporter ?? null
}

/**
 * 設定の手順が使う状態。
 *
 * 未接続を「0人」と取り違えない。0人は正しい状態（まだ登録していない）だが、
 * 未接続は画面がまだ無いという別のことである。
 */
export function resolveSupportersStatus({ configured, loaded, count, failed }) {
  if (!configured) return SUPPORTERS_STATUS.NOT_CONFIGURED
  if (failed) return SUPPORTERS_STATUS.ERROR
  if (!loaded) return SUPPORTERS_STATUS.NOT_CONFIGURED
  return count > 0 ? SUPPORTERS_STATUS.READY : SUPPORTERS_STATUS.EMPTY
}
