// リスナー×特典段階の表。
//
// スプレッドシートの「特典管理」は1行1リスナーで、列が段階だった。その一括編集の
// しやすさは残す。ただし内部は列番号で持たない。1セルはリスナーと特典段階の組で、
// 位置ではなく対応で決まる。

import { isSupportersApiConfigured } from './supportersApi'

function baseUrl(config) {
  const platform = config?.platform ?? {}
  return String(platform.adminApiBaseUrl || platform.publicApiBaseUrl || '').trim().replace(/\/+$/, '')
}

function tenantSlug(config) {
  return String(config?.platform?.tenantSlug ?? '').trim()
}

function publicError(status) {
  if (status === 401 || status === 403) return 'リスナー情報を開く権限を確認できませんでした。ログインし直してください。'
  if (status === 404) return 'リスナー情報の保存先が見つかりませんでした。運営へ連絡してください。'
  return 'リスナー情報を読み込めませんでした。時間をおいてもう一度お試しください。'
}

async function request(config, path, { method = 'GET', params = {}, body, fetchImpl = fetch } = {}) {
  const url = new URL(`${baseUrl(config)}${path}`)
  url.searchParams.set('tenant', tenantSlug(config))
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetchImpl(url.toString(), {
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

export { isSupportersApiConfigured as isBenefitGridConfigured }

/**
 * 表を読む。行はリスナー、列は特典段階。
 * セルの値は数量で、0は「持っていない」。空欄と0を同じ意味にする。
 */
export async function loadBenefitGrid(config, { includeArchived = false, fetchImpl } = {}) {
  const data = await request(config, '/api/admin/benefit-grid', {
    params: { includeArchived: includeArchived ? 'true' : '' },
    fetchImpl,
  })
  const cells = new Map()
  for (const row of data?.entitlements ?? []) {
    cells.set(`${row.supporter_id}:${row.benefit_definition_id}`, Number(row.quantity) || 0)
  }
  return {
    // 列は並び順で決まる。列番号という概念は持ち込まない。
    definitions: (data?.definitions ?? []).map(row => ({
      id: row.id,
      key: row.key,
      title: row.title || row.key,
      // 数を持つ特典は数字、持つか持たないかだけの特典はチェックで入れる。
      // 判定は特典定義が持つ。表の側で決めない。
      boolean: row.input_type === 'boolean',
    })),
    rows: (data?.supporters ?? []).map(row => ({
      id: row.id,
      displayName: row.display_name,
      archived: Boolean(row.archived_at),
    })),
    valueOf: (supporterId, definitionId) => cells.get(`${supporterId}:${definitionId}`) ?? 0,
    cells,
  }
}

/** 1人ぶんの特典をまとめて置き換える。 */
export async function saveSupporterCells(config, supporterId, cells, { fetchImpl } = {}) {
  return request(config, `/api/admin/supporters/${encodeURIComponent(supporterId)}/entitlements`, {
    method: 'PUT',
    body: { cells },
    fetchImpl,
  })
}
