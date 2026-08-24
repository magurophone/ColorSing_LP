import { deepMerge } from './configIO.js'

// 公開ページの見た目と文言の正本はD1（tenant_settings）。配布物の customer/config.js は
// 初期描画を速くするための写しでしかない。runtime-config が設定を届けたら、そちらを採る。
//
// 受け取ってよい最上位キーは許可制にする。サーバー側 functions/_shared/tenantSettings.ts の
// ALLOWED_TOP_LEVEL_KEYS と同じ並び。sheets / deploy / admin / platform は各々の正本が別に
// あるため、応答に混ざっていても公開ページの設定へは入れない。
export const RUNTIME_SETTINGS_KEYS = Object.freeze([
  'brand',
  'colors',
  'colorOverrides',
  'fonts',
  'images',
  'views',
  'home',
  'menu',
  'ui',
  'effects',
  'benefitTierDisplay',
])

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** 届いた設定のうち、公開ページが受け取ってよい部分だけを抜き出す。 */
export function pickRuntimeSettings(pageSettings) {
  if (!isPlainObject(pageSettings)) return null
  const picked = {}
  for (const key of RUNTIME_SETTINGS_KEYS) {
    const value = pageSettings[key]
    if (value === undefined) continue
    // ビューが空の配列で届いたら「未設定」として扱い、写しの並びを残す。
    // 出すページが1つも無い公開ページは設定として意味を持たず、管理画面にも
    // そう保存する手段が無いため、消し込みとは見なさない。
    if (key === 'views' && (!Array.isArray(value) || value.length === 0)) continue
    picked[key] = value
  }
  return Object.keys(picked).length > 0 ? picked : null
}

/**
 * 写し（config.js + localStorage）の上へ、D1の設定を重ねる。
 * 触れられていない項目は写しのまま残る。空文字は「空にした」として反映する。
 */
export function applyPageSettings(config, pageSettings) {
  const picked = pickRuntimeSettings(pageSettings)
  if (!picked) return config
  return deepMerge(config, picked)
}
