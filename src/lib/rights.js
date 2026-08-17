// 特典・権利管理に関する共有定数・関数

// 特典内容シートの列インデックス
export const BENEFIT_FIELDS = {
  TITLE: 0,
  LABEL: 1,
  NAME: 2,
  DESCRIPTION: 3,
  TRACK_HISTORY: 4,
}

// 権利者シートの名前列インデックス
export const RIGHTS_NAME_INDEX = 0

// ティアが参照してよいのは B列以降だけ。A列はユーザー名なので、獲得者を表示しない
// ティアへ 0 を割り当てると、権利値のかわりにユーザー名を読んでしまう。
// 数字だけの表示名は hasRight() が真になるため、権利のない人へ誤ってアイコンが付く。
export function isRightsColumn(columnIndex) {
  return Number.isInteger(columnIndex) && columnIndex >= RIGHTS_NAME_INDEX + 1
}

// 権利を持っているかチェック（数値 > 0 または "TRUE" 文字列）
export function hasRight(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase()
    if (normalized === 'TRUE') return true
    const parsed = Number(normalized)
    return Number.isFinite(parsed) && parsed > 0
  }
  return value > 0
}

// TRACK_HISTORY フラグが有効かチェック（"TRUE" 文字列 または boolean true）
export function isTrackHistory(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().toUpperCase() === 'TRUE'
  return false
}
