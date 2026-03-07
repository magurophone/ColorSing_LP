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
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)

      if (!match || !match[1]) {
        throw new Error('Invalid response format from Google Sheets')
      }

      const json = JSON.parse(match[1])

      if (!json.table || !json.table.rows) {
        throw new Error('Invalid data structure from Google Sheets')
      }

      return json.table.rows.map(row => (row.c ?? []).map(cell => cell?.v ?? ''))
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
  return data.map(row => ({
    month: String(row[0] || ''),
    userName: String(row[1] || ''),
    tierKey: String(row[2] || ''),
    content: String(row[3] || ''),
  }))
}

// イベントデータを読み込む
// A列:日付(yyyymmdd), B列:タイトル, C列:セットリスト, D列:画像URL, E列:備考
// 同じ日付+タイトルの行を同一イベントとして集約し、画像を最大5枚のギャラリーにまとめる
// 3行目: 開催予定イベント / 7行目以降: 開催済みイベント
export const fetchEventData = async (spreadsheetId, sheetName) => {
  const toRow = (row) => ({
    date: String(row[0] || ''),
    title: String(row[1] || ''),
    setlist: String(row[2] || ''),
    imageUrl: String(row[3] || '').trim(),
    notes: String(row[4] || ''),
  })

  const isDate8 = (v) => /^\d{8}$/.test(String(v || '').replace(/\D/g, ''))

  const groupByEvent = (rows) => {
    const map = new Map()
    for (const row of rows) {
      if (!row.title || !isDate8(row.date)) continue
      const key = `${row.date}__${row.title}`
      if (!map.has(key)) {
        map.set(key, { ...row, imageUrls: [] })
      }
      const ev = map.get(key)
      if (row.imageUrl && ev.imageUrls.length < 5) ev.imageUrls.push(row.imageUrl)
    }
    return [...map.values()].map(ev => ({ ...ev, imageUrl: ev.imageUrls[0] || '' }))
  }

  const [upcomingRows, pastRows] = await Promise.all([
    fetchSheetData(spreadsheetId, sheetName, 'A3:E3', 3, { allRows: true }),
    fetchSheetData(spreadsheetId, sheetName, 'A7:E', 3, { allRows: true }),
  ])

  const upcomingRow = upcomingRows.length > 0 ? toRow(upcomingRows[0]) : null
  const upcoming = upcomingRow?.title
    ? { ...upcomingRow, imageUrls: upcomingRow.imageUrl ? [upcomingRow.imageUrl] : [] }
    : null

  const past = groupByEvent(pastRows.map(toRow))
    .sort((a, b) => b.date.localeCompare(a.date))

  return { upcoming, past }
}

// 枠内アイコンデータを読み込む（A列:yyyymmまたはカテゴリ名, B列:ユーザー名, C列:画像URL）
export const fetchIconData = async (spreadsheetId, iconSheetName) => {
  const iconData = {}
  const orderedKeys = []
  const data = await fetchSheetData(spreadsheetId, iconSheetName, null, 3, { skipHeader: true })

  if (!data || data.length < 1) {
    return iconData
  }

  data.forEach(row => {
    const key = String(row[0] || '')
    const userName = row[1]
    const imageUrl = row[2]

    if (key && userName && imageUrl) {
      if (!iconData[key]) {
        iconData[key] = []
        orderedKeys.push(key)
      }

      iconData[key].push({
        label: userName,
        thumbnailUrl: convertDriveUrl(imageUrl),
        originalUrl: imageUrl,
      })
    }
  })

  iconData._orderedKeys = orderedKeys
  return iconData
}
