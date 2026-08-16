import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchSheetData } from '../src/lib/sheets.js'

function readArgument(name, fallback = '') {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

function parseDashboardConfig(source) {
  const match = source.match(/window\.DASHBOARD_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)
  if (!match?.[1]) throw new Error('window.DASHBOARD_CONFIG was not found in the config file.')
  return JSON.parse(match[1])
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const configPath = path.resolve(readArgument('--config', 'public/customer/config.js'))
const outputPath = path.resolve(readArgument('--output', '.local/lp-source-snapshot.json'))
const config = parseDashboardConfig(await readFile(configPath, 'utf8'))
const sheets = config.sheets || {}
if (!sheets.spreadsheetId || sheets.spreadsheetId === 'demo') {
  throw new Error('A non-demo spreadsheetId is required to capture a production source snapshot.')
}

const ranges = sheets.ranges || {}
const optionalRows = async (sheetName, range, options = {}) => sheetName
  ? fetchSheetData(sheets.spreadsheetId, sheetName, range, 3, options).catch(() => [])
  : []

const [
  rankingData,
  goalsData,
  benefitsData,
  rawRightsData,
  historyRows,
  upcomingRows,
  allPastRows,
  iconRows,
] = await Promise.all([
  fetchSheetData(sheets.spreadsheetId, sheets.rankingSheetName, ranges.ranking),
  fetchSheetData(sheets.spreadsheetId, sheets.rankingSheetName, ranges.goals),
  fetchSheetData(sheets.spreadsheetId, sheets.benefitsContentSheetName, ranges.benefits),
  fetchSheetData(sheets.spreadsheetId, sheets.benefitsSheetName, null, 3, { allRows: true }),
  optionalRows(sheets.historySheetName, 'A3:D'),
  optionalRows(sheets.eventSheetName, 'A3:E3', { allRows: true }),
  optionalRows(sheets.eventSheetName, 'A7:E', { allRows: true }),
  optionalRows(sheets.iconSheetName, null, { useColTypes: true }),
])

const source = {
  rankingData,
  goalsData,
  benefitsData,
  rawRightsData,
  historyRows,
  upcomingRows,
  allPastRows,
  iconRows,
}
const artifact = {
  version: 1,
  capturedAt: new Date().toISOString(),
  sourceHash: createHash('sha256').update(stableSerialize(source)).digest('hex'),
  source,
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
console.log(`LP_SOURCE_SNAPSHOT=OK rows=${Object.values(source).reduce((sum, rows) => sum + rows.length, 0)} output=${outputPath}`)
