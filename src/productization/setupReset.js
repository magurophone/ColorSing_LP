// 開発・検証用の状態リセット。
//
// 「購入導線をもう一度まっさらな状態から確認する」ためのもので、
// 「顧客設定を初期化する」ものではない。この2つを混ぜない。
//
// 同じオリジンに複数の導線の状態が溜まるため、以前の試行で入れた値が
// 別の導線に確定済み情報として現れることがある。それを断つのが目的。

// 消してよい: 導線の進行状況だけ。
const CLEARABLE_EXACT = new Set([
  'fanpage_creation_state_v1',
  'acquisition_session_v1',
])
const CLEARABLE_PREFIXES = ['onboarding_state_']

// 消してはいけない: 顧客の設定そのもの。
const PROTECTED_PREFIXES = ['dashboard_config_', 'config_meta_']

// 画面の認証ゲートは顧客データではないため、やり直しのために解除してよい。
const CLEARABLE_SESSION = new Set(['onboarding_auth', 'admin_auth'])

export function isClearableKey(key) {
  const name = String(key ?? '')
  if (PROTECTED_PREFIXES.some(prefix => name.startsWith(prefix))) return false
  if (CLEARABLE_EXACT.has(name)) return true
  return CLEARABLE_PREFIXES.some(prefix => name.startsWith(prefix))
}

export function isProtectedKey(key) {
  return PROTECTED_PREFIXES.some(prefix => String(key ?? '').startsWith(prefix))
}

function keysOf(storage) {
  if (!storage) return []
  if (typeof storage.key === 'function' && typeof storage.length === 'number') {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean)
  }
  // テスト用の簡易storage。
  return typeof storage.keys === 'function' ? [...storage.keys()] : []
}

// 実行前に何が消えて何が残るかを見せるための一覧。黙って消さない。
export function inspectSetupState({ local = null, session = null } = {}) {
  const localKeys = keysOf(local)
  return {
    clearable: localKeys.filter(isClearableKey).sort(),
    protectedKeys: localKeys.filter(isProtectedKey).sort(),
    sessionClearable: keysOf(session).filter(key => CLEARABLE_SESSION.has(key)).sort(),
  }
}

export function resetSetupProgress({ local = null, session = null } = {}) {
  const found = inspectSetupState({ local, session })
  for (const key of found.clearable) local.removeItem(key)
  for (const key of found.sessionClearable) session.removeItem(key)
  return { cleared: found.clearable, clearedSession: found.sessionClearable, kept: found.protectedKeys }
}
