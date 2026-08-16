import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractSpreadsheetId,
  normalizeSpreadsheetInput,
  validateSpreadsheetConnection,
} from '../src/lib/spreadsheetConnection.js'

const SHEETS = {
  spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
  rankingSheetName: '目標管理・ランキング',
  benefitsContentSheetName: '特典内容',
  benefitsSheetName: '特典管理',
  ranges: { ranking: 'D2:G5', benefits: 'A3:E20' },
}

test('Spreadsheet URL paste is normalized to its ID', () => {
  const id = SHEETS.spreadsheetId
  assert.equal(extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=10`), id)
  assert.equal(normalizeSpreadsheetInput(id), id)
  assert.equal(extractSpreadsheetId('not a spreadsheet'), '')
})
test('connection validation checks each detected requirement', async () => {
  const calls = []
  const result = await validateSpreadsheetConnection(SHEETS, {
    fetcher: async (_id, sheetName, range, retries, options) => {
      calls.push({ sheetName, range, retries, options })
      if (sheetName === '特典管理') return [['ユーザー名', '5k', 'Special'], ['リスナー', 1, '']]
      return [['確認済み']]
    },
  })

  assert.equal(result.status, 'success')
  assert.deepEqual(result.checks.map(item => item.id), ['format', 'ranking', 'benefits', 'rights'])
  assert.equal(calls.length, 3)
  assert.equal(calls[2].options.allRows, true)
})

test('missing Special header reports only the observed structural error', async () => {
  const result = await validateSpreadsheetConnection(SHEETS, {
    fetcher: async (_id, sheetName) => sheetName === '特典管理'
      ? [['ユーザー名', '5k'], ['リスナー', 1]]
      : [['確認済み']],
  })

  assert.equal(result.status, 'error')
  const rights = result.checks.find(item => item.id === 'rights')
  assert.match(rights.message, /Special/)
  assert.doesNotMatch(rights.message, /確認できたシート/)
})

test('invalid URL is rejected without any network probe', async () => {
  let calls = 0
  const result = await validateSpreadsheetConnection({ ...SHEETS, spreadsheetId: 'invalid value' }, {
    fetcher: async () => { calls += 1 },
  })
  assert.equal(result.status, 'error')
  assert.equal(calls, 0)
})
