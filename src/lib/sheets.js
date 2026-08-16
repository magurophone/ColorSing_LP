import {
  buildEventData,
  buildIconData,
  mapHistoryRows,
  parseGvizResponse,
} from './lpCompatibility.js'

// Googleスプレッドシートから公開データを取得（範囲指定対応、再試行機能付き）
// options.allRows=true を指定すると headers=0 を付与してヘッダー行もデータとして返す
export const fetchSheetData = async (spreadsheetId, sheetName, range = null, retries = 3, options = {}) => {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is not configured')
  }

  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  if (range) {
    url += `&range=${encodeURIComponent(range)}`
  }
  // headers=0: 全行をデータとして返す（allRows）
  // headers=1: 1行目をヘッダーとして明示スキップ（skipHeader）
  if (options.allRows) {
    url += '&headers=0'
  } else if (options.skipHeader) {
    url += '&headers=1'
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      return parseGvizResponse(text, options)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`Error fetching ${sheetName}${range ? ` (${range})` : ''} (attempt ${attempt + 1}/${retries}):`, error)

      if (attempt === retries - 1) {
        throw error
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
    }
  }
}

// Google DriveのURLをサムネイル表示可能なURLに変換
export const convertDriveUrl = (url, size = 400) => {
  if (!url || typeof url !== 'string') return ''
  if (url.includes('/thumbnail?id=')) return url

  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`
  }

  return url
}

// キーが月別形式（YYYYMM）かカテゴリ名かを判定
export const isMonthlyFormat = (keys) => {
  if (keys.length === 0) return true
  return keys.every(key => /^\d{6}$/.test(key))
}

// 特典履歴データを読み込む（A列:年月, B列:ユーザー名, C列:特典ID, D列:内容）
export const fetchHistoryData = async (spreadsheetId, historySheetName, range = null) => {
  const data = await fetchSheetData(spreadsheetId, historySheetName, range)
  return mapHistoryRows(data)
}

// イベントデータを読み込む
// A列:日付(yyyymmdd), B列:タイトル, C列:セットリスト, D列:画像URL, E列:備考
// 同じ日付+タイトルの行を同一イベントとして集約し、画像を最大5枚のギャラリーにまとめる
// 3行目: 開催予定イベント
// 7行目以降: 開催済みイベント欄（A/B/C空白・D列のみURLの行は次回イベントの追加画像として扱う）
export const fetchEventData = async (spreadsheetId, sheetName) => {
  const [upcomingRows, allPastRows] = await Promise.all([
    fetchSheetData(spreadsheetId, sheetName, 'A3:E3', 3, { allRows: true }),
    fetchSheetData(spreadsheetId, sheetName, 'A7:E', 3, { allRows: true }),
  ])

  return buildEventData(upcomingRows, allPastRows)
}

// 枠内アイコンデータを読み込む（A列:yyyymmまたはカテゴリ名, B列:ユーザー名, C列:画像URL）
export const fetchIconData = async (spreadsheetId, iconSheetName) => {
  // useColTypes: A列がnumber型なら cell.f（フォーマット済み文字列）で取得
  // → "202601"はそのまま文字列で、"まつり"はf値で取得できる
  const allRows = await fetchSheetData(spreadsheetId, iconSheetName, null, 3, { useColTypes: true })
  return buildIconData(allRows, convertDriveUrl)
}
