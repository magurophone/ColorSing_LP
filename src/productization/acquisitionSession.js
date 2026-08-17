// 購入前から歌推しページ作成までの進み具合を、画面をまたいで保持する。
//
// 決済事業者と認証事業者は未確定なので、ここでは結果だけを受け取って記録する。
// providerが未接続なら、勝手に「完了した」ことにしない。

const STORAGE_KEY = 'acquisition_session_v1'

function storageOf(storage) {
  return storage ?? (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
}

const EMPTY = { version: 1, planId: '', entitlement: null, account: null }

export function loadAcquisitionSession(storage = null) {
  const store = storageOf(storage)
  if (!store) return { ...EMPTY }
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) || 'null')
    return parsed?.version === 1 ? { ...EMPTY, ...parsed } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

export function saveAcquisitionSession(session, storage = null) {
  const store = storageOf(storage)
  if (store) store.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearAcquisitionSession(storage = null) {
  const store = storageOf(storage)
  if (store) store.removeItem(STORAGE_KEY)
}

export function selectPlan(planId, storage = null) {
  const session = loadAcquisitionSession(storage)
  return saveAcquisitionSession({ ...session, planId: String(planId ?? '') }, storage)
}

// 決済結果の記録。providerが未接続のときは pending にも granted にもしない。
export function recordEntitlement(entitlement, storage = null) {
  const session = loadAcquisitionSession(storage)
  const status = entitlement?.status
  const next = status === 'granted' || status === 'pending' ? { status } : null
  return saveAcquisitionSession({ ...session, entitlement: next }, storage)
}

export function recordAccount(account, storage = null) {
  const session = loadAcquisitionSession(storage)
  const next = account?.status === 'ready' ? { status: 'ready' } : null
  return saveAcquisitionSession({ ...session, account: next }, storage)
}

// acquisition状態の判定へ渡す形。歌推しページの進行はfanPageCreation側が持つ。
export function toAcquisitionInput(session, fanPage = null) {
  return {
    planSelected: Boolean(session?.planId),
    entitlement: session?.entitlement ?? null,
    account: session?.account ?? null,
    portal: fanPage,
  }
}
