// 日付文字列（YYYYMMDD形式）を日本語表示に変換
export function formatEventDate(dateStr) {
  const s = String(dateStr).replace(/\D/g, '')
  if (s.length === 8) {
    const y = s.slice(0, 4)
    const m = parseInt(s.slice(4, 6), 10)
    const d = parseInt(s.slice(6, 8), 10)
    return `${y}年${m}月${d}日`
  }
  return dateStr
}

// 日付文字列（YYYYMMDD形式）が今日より前かどうかを判定
export function isEventEnded(dateStr) {
  const s = String(dateStr).replace(/\D/g, '')
  if (s.length !== 8) return false
  const t = new Date()
  const today = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}`
  return s < today
}
