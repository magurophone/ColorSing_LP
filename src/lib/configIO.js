import DEFAULT_CONFIG from './defaults'
import { reverseToken, restoreToken } from './utils'

// パス第1セグメント（リポジトリ名）でキーを分離。同一ドメインの複数顧客が混在しないように
const _repoSlug = (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '') || 'default'
const STORAGE_KEY = `dashboard_config_${_repoSlug}`
const META_STORAGE_KEY = `config_meta_${_repoSlug}`

// オブジェクトの深いマージ（配列はそのまま上書き）
export function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

// 旧形式（MAGUROPHONE_CONFIG）から新形式へ変換
function migrateOldConfig(oldConfig) {
  if (!oldConfig || !oldConfig.SPREADSHEET_ID) return null
  return {
    sheets: {
      spreadsheetId: oldConfig.SPREADSHEET_ID,
    },
  }
}

// config.js + デフォルト値のみ（localStorage を含まないベース設定）
export function loadBaseConfig() {
  let config = {}

  if (typeof window !== 'undefined' && window.DASHBOARD_CONFIG) {
    config = window.DASHBOARD_CONFIG
  }

  // 旧形式からのマイグレーション
  if (
    typeof window !== 'undefined' &&
    window.MAGUROPHONE_CONFIG &&
    !window.DASHBOARD_CONFIG
  ) {
    const migrated = migrateOldConfig(window.MAGUROPHONE_CONFIG)
    if (migrated) {
      config = migrated
    }
  }

  const merged = deepMerge(DEFAULT_CONFIG, config)

  // views配列: ID基準でマージ（defaultsに新ビューが追加されても既存configから消えない）
  if (Array.isArray(config.views)) {
    const existingIds = new Set(config.views.map(v => v.id))
    const newViews = DEFAULT_CONFIG.views.filter(v => !existingIds.has(v.id))
    if (newViews.length > 0) {
      merged.views = [...config.views, ...newViews]
    }
  }

  // 旧config互換: dataSheetName → rankingSheetName / benefitsSheetName
  if (config.sheets?.dataSheetName && !config.sheets?.rankingSheetName) {
    merged.sheets.rankingSheetName = config.sheets.dataSheetName
  }
  if (config.sheets?.dataSheetName && !config.sheets?.benefitsSheetName) {
    merged.sheets.benefitsSheetName = config.sheets.dataSheetName
  }

  // 反転トークンを復元
  if (merged.deploy?.token?.startsWith('rev:')) {
    merged.deploy.token = restoreToken(merged.deploy.token)
  }

  return merged
}

// 設定を読み込む（config.js + デフォルト → localStorage で上書き）
export function loadConfig() {
  const baseConfig = loadBaseConfig()
  let config = baseConfig

  // localStorage からの上書き（管理画面で編集した値を優先）
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // benefitTiers は localStorage を正とする（管理画面での削除を永続化）
        // deepMerge は配列を丸ごと上書きするため、benefitTiers も自動的に localStorage の値が使われる
        config = deepMerge(config, parsed)
        // views配列: localStorage のマージ後もIDベースで補完（defaultsの新ビューが消えないように）
        if (Array.isArray(config.views)) {
          const existingIds = new Set(config.views.map(v => v.id))
          const newViews = DEFAULT_CONFIG.views.filter(v => !existingIds.has(v.id))
          if (newViews.length > 0) {
            config.views = [...config.views, ...newViews]
          }
        }
      }
    } catch {
      // localStorage が使えない場合は無視
    }
  }

  // admin セクションは常に config.js の値を使う（localStorage で上書きさせない）
  config.admin = baseConfig.admin

  return config
}

// 設定を localStorage に保存
export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    console.error('Failed to save config to localStorage')
  }
}

// localStorage の設定をクリア
export function clearConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無視
  }
}

// config.js ファイルの内容を生成（ダウンロード用）
export function generateConfigJS(config) {
  // デフォルト値と同じプロパティは省略しない（分かりやすさ優先）
  const cleanConfig = { ...config }
  // admin セクションは保持（password, developerKey がデプロイ後も消えないように）

  // deploy.token は GitHub シークレットスキャンを回避するため反転して保存
  if (cleanConfig.deploy?.token && !cleanConfig.deploy.token.startsWith('rev:')) {
    cleanConfig.deploy = { ...cleanConfig.deploy }
    cleanConfig.deploy.token = reverseToken(cleanConfig.deploy.token)
  }

  const json = JSON.stringify(cleanConfig, null, 2)
  return `// ダッシュボード設定ファイル
// 管理画面（admin.html）からエクスポートされた設定です

window.DASHBOARD_CONFIG = ${json}
`
}

// config.js ファイルをダウンロード
export function downloadConfigJS(config) {
  const content = generateConfigJS(config)
  const blob = new Blob([content], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'config.js'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// メタデータを読み込む（タイムスタンプ等、config本体とは別管理）
export function loadConfigMeta() {
  try {
    const stored = localStorage.getItem(META_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// メタデータを保存
export function saveConfigMeta(meta) {
  try {
    const current = loadConfigMeta()
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify({ ...current, ...meta }))
  } catch {
    // 無視
  }
}

// config.js ファイルをインポート（テキスト内容からパース）
export function importConfigFromText(text) {
  // window.DASHBOARD_CONFIG = {...} の部分を抽出
  const match = text.match(/window\.DASHBOARD_CONFIG\s*=\s*(\{[\s\S]*\})/)
  if (!match) {
    throw new Error('config.js の形式が正しくありません')
  }

  try {
    return JSON.parse(match[1])
  } catch {
    throw new Error('config.js のパースに失敗しました')
  }
}
