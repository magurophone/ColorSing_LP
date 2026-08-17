// Portal作成の進行状態を、再読み込みをまたいで保持する。
//
// 顧客には内部の工程名を見せない。準備中か、完了か、失敗かだけを伝える。
// 「もう一度試す」は同じ operationId と保存済みの工程状態を使って再開するため、
// 完了済みの工程をやり直さない。二重にrepositoryを作らないための要。

import { createProvisioningState, resumeProvisioning } from './provisioning.js'
import { normalizePublicAddress } from './publicAddress.js'

const STORAGE_KEY = 'portal_creation_state_v1'

function storageOf(storage) {
  return storage ?? (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
}

export function loadPortalCreation(storage = null) {
  const store = storageOf(storage)
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.version === 1 ? parsed : null
  } catch {
    return null
  }
}

export function savePortalCreation(record, storage = null) {
  const store = storageOf(storage)
  if (!store) return record
  store.setItem(STORAGE_KEY, JSON.stringify(record))
  return record
}

export function clearPortalCreation(storage = null) {
  const store = storageOf(storage)
  if (store) store.removeItem(STORAGE_KEY)
}

// 作成要求。既存の進行中レコードがあれば新しく作らず、それを返す。
export function beginPortalCreation({ pageName, publicAddress, operationId, storage = null } = {}) {
  const existing = loadPortalCreation(storage)
  if (existing && existing.provisioning?.status !== 'complete') return existing

  const address = normalizePublicAddress(publicAddress)
  if (!pageName || !address) throw new Error('pageName and publicAddress are required')
  const id = operationId || `portal-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const record = {
    version: 1,
    pageName: String(pageName).trim(),
    publicAddress: address,
    startedAt: new Date().toISOString(),
    provisioning: createProvisioningState({ tenantId: address, operationId: id }),
  }
  return savePortalCreation(record, storage)
}

// 再開。保存済みの工程状態をそのまま渡すため、完了済みの工程は実行されない。
export async function runPortalCreation({ record, adapter, storage = null, onEvent = () => {} } = {}) {
  if (!record) throw new Error('A portal creation record is required')
  const tenant = { id: record.publicAddress, slug: record.publicAddress, displayName: record.pageName }
  const provisioning = await resumeProvisioning({
    tenant,
    state: record.provisioning,
    adapter,
    onEvent: (event) => {
      // 工程が進むたびに保存する。途中で再読み込みしても状態が消えない。
      savePortalCreation({ ...record, provisioning: { ...record.provisioning } }, storage)
      onEvent(event)
    },
  })
  return savePortalCreation({ ...record, provisioning }, storage)
}

// acquisition側が読む形へ変換する。
export function toPortalStatus(record) {
  if (!record) return null
  const status = record.provisioning?.status
  if (status === 'complete') return { status: 'ready', publicAddress: record.publicAddress }
  if (status === 'failed') return { status: 'failed', publicAddress: record.publicAddress }
  return { status: 'provisioning', publicAddress: record.publicAddress }
}

// 顧客向けの表示。内部工程名は出さない。
export function describePortalCreation(record) {
  const status = record?.provisioning?.status
  if (!record) {
    return { headline: 'まだPortalを作っていません', detail: '', tone: 'action_required', canRetry: false }
  }
  if (status === 'complete') {
    return {
      headline: '公開ページの準備ができました',
      detail: '続けて公開する内容を設定してください。',
      tone: 'ready',
      canRetry: false,
    }
  }
  if (status === 'failed') {
    return {
      headline: '公開ページの準備に失敗しました',
      detail: 'もう一度お試しください。繰り返し失敗する場合は運営へご連絡ください。',
      tone: 'failed',
      canRetry: true,
    }
  }
  return {
    headline: '公開ページを準備しています',
    detail: 'ページの準備がまだ完了していません。完了すると次の設定へ進めます。',
    tone: 'waiting',
    canRetry: false,
  }
}
