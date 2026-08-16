import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildEventData,
  buildIconData,
  mapHistoryRows,
  normalizePrimaryLpData,
  parseGvizResponse,
} from '../src/lib/lpCompatibility.js'

const fixtures = new URL('./fixtures/', import.meta.url)

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, fixtures), 'utf8'))
}

test('Sheets parser output matches the protected legacy LP snapshot', async () => {
  const source = await readJson('lp-source-arrays.json')
  const expected = await readJson('lp-legacy-view-model.json')
  const primary = normalizePrimaryLpData(source)
  const actual = {
    ...primary,
    history: mapHistoryRows(source.historyRows),
    events: buildEventData(source.upcomingRows, source.allPastRows),
    icons: buildIconData(source.iconRows, value => `thumb:${value}`),
  }

  assert.deepEqual(actual, expected)
})
test('gviz parser preserves formatted numeric strings for icon category keys', () => {
  const payload = {
    table: {
      cols: [{ type: 'number' }, { type: 'string' }],
      rows: [{ c: [{ v: 202608, f: '202608' }, { v: '星空リスナー' }] }],
    },
  }
  const text = `google.visualization.Query.setResponse(${JSON.stringify(payload)})`
  assert.deepEqual(parseGvizResponse(text, { useColTypes: true }), [['202608', '星空リスナー']])
})

test('missing Special header keeps the legacy last-column fallback', () => {
  const normalized = normalizePrimaryLpData({
    rankingData: [],
    goalsData: [],
    benefitsData: [],
    rawRightsData: [['名前', '5k', '備考'], ['利用者', '1', '']],
  })
  assert.equal(normalized.specialIndex, 2)
  assert.deepEqual(normalized.rights, [['利用者', '1', '']])
})

test('invalid gviz payloads remain fatal for primary datasets', () => {
  assert.throws(() => parseGvizResponse('{}'), /Invalid response format/)
})
