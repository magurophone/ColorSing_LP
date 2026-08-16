// Legacy LP compatibility transformations.
// Keep these functions free of React and network access so Sheets and DB
// adapters can be compared against the same contract fixtures.

export function parseGvizResponse(text, options = {}) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)
  if (!match || !match[1]) {
    throw new Error('Invalid response format from Google Sheets')
  }

  const json = JSON.parse(match[1])
  if (!json.table || !json.table.rows) {
    throw new Error('Invalid data structure from Google Sheets')
  }

  const colTypes = (json.table.cols ?? []).map(c => c.type)
  const extractCell = options.useColTypes
    ? (cell, colIdx) => {
        if (cell == null) return ''
        if (colTypes[colIdx] === 'number') {
          return cell.f ?? (cell.v != null ? String(Math.round(cell.v)) : '')
        }
        return String(cell.v ?? cell.f ?? '')
      }
    : options.useFormattedStrings
      ? (cell) => cell == null ? '' : (cell.v != null ? String(cell.v) : (cell.f ?? ''))
      : (cell) => cell?.v ?? ''

  return json.table.rows.map(row => (row.c ?? []).map((cell, i) => extractCell(cell, i)))
}
export function normalizePrimaryLpData({
  rankingData,
  goalsData,
  benefitsData,
  rawRightsData,
}) {
  let specialIndex = -1
  let headerRowIndex = 0

  for (let i = 0; i < rawRightsData.length; i++) {
    const idx = rawRightsData[i].findIndex(col => String(col).toLowerCase() === 'special')
    if (idx >= 0) {
      specialIndex = idx
      headerRowIndex = i
      break
    }
  }

  if (specialIndex < 0) {
    const maxLen = Math.max(0, ...rawRightsData.map(row => row.length))
    specialIndex = maxLen > 0 ? maxLen - 1 : 8
  }

  return {
    ranking: rankingData,
    goals: goalsData.slice(1),
    benefits: benefitsData,
    rights: rawRightsData.slice(headerRowIndex + 1),
    specialIndex,
  }
}

export function mapHistoryRows(rows) {
  return rows.map(row => ({
    month: String(row[0] || ''),
    userName: String(row[1] || ''),
    tierKey: String(row[2] || ''),
    content: String(row[3] || ''),
  }))
}

export function buildEventData(upcomingRows, allPastRows) {
  const toRow = (row) => ({
    date: String(row[0] || ''),
    title: String(row[1] || ''),
    setlist: String(row[2] || ''),
    imageUrl: String(row[3] || '').trim(),
    notes: String(row[4] || ''),
  })

  const isDate8 = (value) => /^\d{8}$/.test(String(value || '').replace(/\D/g, ''))

  const groupByEvent = (rows) => {
    const map = new Map()
    for (const row of rows) {
      if (!row.title || !isDate8(row.date)) continue
      const key = `${row.date}__${row.title}`
      if (!map.has(key)) {
        map.set(key, { ...row, imageUrls: [] })
      }
      const event = map.get(key)
      if (row.imageUrl && event.imageUrls.length < 10) event.imageUrls.push(row.imageUrl)
    }
    return [...map.values()].map(event => ({ ...event, imageUrl: event.imageUrls[0] || '' }))
  }

  const extraUpcomingUrls = []
  const pastRows = []
  for (const raw of allPastRows) {
    const row = toRow(raw)
    if (!row.date && !row.title && row.imageUrl) {
      if (extraUpcomingUrls.length < 9) extraUpcomingUrls.push(row.imageUrl)
    } else {
      pastRows.push(row)
    }
  }

  const upcomingRow = upcomingRows.length > 0 ? toRow(upcomingRows[0]) : null
  let upcoming = null
  if (upcomingRow?.title) {
    const imageUrls = upcomingRow.imageUrl ? [upcomingRow.imageUrl] : []
    imageUrls.push(...extraUpcomingUrls.slice(0, 10 - imageUrls.length))
    upcoming = { ...upcomingRow, imageUrls }
  }

  const past = groupByEvent(pastRows).sort((a, b) => b.date.localeCompare(a.date))
  return { upcoming, past }
}

export function buildIconData(allRows, convertUrl = value => value) {
  const iconData = {}
  const orderedKeys = []
  const data = allRows.slice(1)

  if (data.length < 1) return iconData

  let lastKey = ''
  data.forEach(row => {
    const rawKey = String(row[0] || '')
    if (rawKey) lastKey = rawKey
    const key = lastKey
    const userName = row[1]
    const imageUrl = row[2]

    if (key && userName && imageUrl) {
      if (!iconData[key]) {
        iconData[key] = []
        orderedKeys.push(key)
      }
      iconData[key].push({
        label: userName,
        thumbnailUrl: convertUrl(imageUrl),
        originalUrl: imageUrl,
      })
    }
  })

  iconData._orderedKeys = orderedKeys
  return iconData
}
