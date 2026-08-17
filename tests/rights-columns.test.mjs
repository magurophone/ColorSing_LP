import assert from 'node:assert/strict'
import test from 'node:test'
import { RIGHTS_NAME_INDEX, hasRight, isRightsColumn } from '../src/lib/rights.js'

test('ティアが参照してよいのは表示名の次の列から', () => {
  assert.equal(RIGHTS_NAME_INDEX, 0)
  assert.equal(isRightsColumn(0), false)
  assert.equal(isRightsColumn(1), true)
  assert.equal(isRightsColumn(9), true)
})

test('列指定が無い、負、整数でないティアは権利として読まない', () => {
  for (const columnIndex of [undefined, null, -1, 1.5, '1', NaN]) {
    assert.equal(isRightsColumn(columnIndex), false, `columnIndex=${String(columnIndex)}`)
  }
})

test('数字だけの表示名は権利値として真になるため、表示名の列を読んではいけない', () => {
  // この2つが同時に成り立つことが、獲得者非表示ティアへ columnIndex 0 を与えた
  // ときに権利のない人が一覧へ出た原因である。
  assert.equal(hasRight('777'), true)
  assert.equal(isRightsColumn(0), false)
})
