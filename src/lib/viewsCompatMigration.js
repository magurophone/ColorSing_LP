// 公開済み config.js の views と、端末に残った古い views の食い違いを一度だけ直す。
//
// legacy tenant では localStorage が公開設定より優先される（configIO.js の
// loadConfigFromBase）。views は配列なので deepMerge が丸ごと上書きし、過去に
// 保存された views がそのまま勝ち続ける。結果、config.js で view を有効にしても
// 一度でもページを開いた端末には永久に届かない。これを直すための移行処理である。
//
// 「常時同期」ではない。version を記録して一度きり実行する。
//
// 管理者が admin.html で作ったローカル設定は、未デプロイの状態を本人が確認する
// ための正当なものなので、絶対に触らない。判定は isAdminBrowser を参照。

export function adminBrowserKey(repoSlug) {
  return `admin_browser_${repoSlug}`
}

export function storedConfigKey(repoSlug) {
  return `dashboard_config_${repoSlug}`
}

export function configMetaKey(repoSlug) {
  return `config_meta_${repoSlug}`
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    // 壊れたJSONで公開ページを止めない。消しもしない。
    return null
  }
}

// この端末を管理者が使ったことがあるか。
//
// 新しい端末は adminBrowserKey で判定する（認証成功時にだけ立てる）。
// この修正より前から admin.html を使っている端末にはそのフラグが無いので、
// 管理操作の履歴である config_meta.lastModified を保守的な代替として使う。
// 一般閲覧者を多少除外してでも、管理者の未公開設定を壊さない側に倒す。
//
// admin_theme のように、認証成功を証明しないものは根拠にしない。
export function isAdminBrowser({ storage, repoSlug }) {
  try {
    if (storage.getItem(adminBrowserKey(repoSlug)) === 'true') return true
  } catch {
    // storage が使えない端末は、そもそも保存された設定も無い
  }
  const meta = readJson(storage, configMetaKey(repoSlug))
  return meta?.lastModified != null
}

export function markAdminBrowser({ storage, repoSlug }) {
  try {
    storage.setItem(adminBrowserKey(repoSlug), 'true')
  } catch {
    // 無視
  }
}

// キー順の違いを差分と誤認しないための正規化
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function recordVersion(storage, repoSlug, version) {
  try {
    const meta = readJson(storage, configMetaKey(repoSlug)) ?? {}
    // lastModified は管理操作の印なので、ここでは絶対に足さない
    storage.setItem(configMetaKey(repoSlug), JSON.stringify({ ...meta, viewsCompatVersion: version }))
  } catch {
    // 無視
  }
}

// 保存済み設定の views だけを、公開済み config.js の views へ揃える。
// views 以外のキーには触れない。dashboard_config ごと消すこともしない。
export function migrateStoredViews({ storage, repoSlug, publishedViews, version }) {
  if (!storage || !repoSlug) return { applied: false, reason: 'no-storage' }
  if (!Number.isInteger(version) || version < 1) return { applied: false, reason: 'not-opted-in' }
  if (!Array.isArray(publishedViews) || publishedViews.length === 0) {
    return { applied: false, reason: 'no-published-views' }
  }

  const meta = readJson(storage, configMetaKey(repoSlug))
  if (Number(meta?.viewsCompatVersion) >= version) {
    return { applied: false, reason: 'already-migrated' }
  }

  if (isAdminBrowser({ storage, repoSlug })) {
    // version も記録しない。管理者端末はこの移行の対象外であり続ける。
    return { applied: false, reason: 'admin-browser' }
  }

  const storedKey = storedConfigKey(repoSlug)
  let raw = null
  try {
    raw = storage.getItem(storedKey)
  } catch {
    return { applied: false, reason: 'no-storage' }
  }
  if (!raw) {
    // 保存された設定が無い端末には古い views も無い。書き込まずに終わる。
    return { applied: false, reason: 'no-stored-config' }
  }

  const stored = readJson(storage, storedKey)
  if (!stored) {
    // 壊れている。消さず、直さず、公開ページはそのまま動かす。
    return { applied: false, reason: 'unreadable-stored-config' }
  }

  if (!Array.isArray(stored.views)) {
    recordVersion(storage, repoSlug, version)
    return { applied: false, reason: 'no-stored-views' }
  }

  if (canonical(stored.views) === canonical(publishedViews)) {
    recordVersion(storage, repoSlug, version)
    return { applied: false, reason: 'already-matching' }
  }

  try {
    storage.setItem(storedKey, JSON.stringify({ ...stored, views: JSON.parse(JSON.stringify(publishedViews)) }))
  } catch {
    return { applied: false, reason: 'write-failed' }
  }
  recordVersion(storage, repoSlug, version)
  return { applied: true, reason: 'migrated' }
}
